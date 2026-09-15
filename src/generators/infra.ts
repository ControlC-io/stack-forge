import { mb } from '@/lib/memory';
import type { Ctx } from './context';

/* ------------------------------------------------------------------ env --- */

export function generateEnvExample(ctx: Ctx): string {
  const lines: string[] = [
    `# ${ctx.name} — copy to .env and fill in every value marked "required".`,
    `# Never commit the real .env.`,
    '',
  ];

  // Both only mean something to the local Docker stack.
  if (ctx.hasComposeDev) {
    lines.push(
      `COMPOSE_PROJECT_NAME=${ctx.slug}`,
      `# ⚠️ Changing COMPOSE_PROJECT_NAME orphans the existing volumes (data is not`,
      `# deleted, it just stops being mounted). Pick it once.`,
      '',
      `# Local only — Traefik owns 80/443 in production.`,
      `HTTP_PORT=80`,
    );
  }

  // People paste a URL as often as a bare host: keep only the host, or the
  // output reads https://https://example.com/.
  const host = ctx.meta.domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  if (host) lines.push(`PUBLIC_URL=https://${host}`);
  lines.push('');

  for (const v of ctx.env) {
    if (v.comment) lines.push(`# ${v.comment}`);
    if (v.secret) {
      lines.push(`# required — generate with: openssl rand -base64 32`);
      lines.push(`${v.key}=`);
    } else {
      lines.push(`${v.key}=${v.value ?? ''}`);
    }
  }

  return lines.join('\n') + '\n';
}

/* ------------------------------------------------------ compose (dev) --- */

export function generateComposeDev(ctx: Ctx): string {
  const services: string[] = [];

  if (ctx.hasPostgres) {
    const image = ctx.hasPgvector ? 'pgvector/pgvector:pg16' : 'postgres:16-alpine';
    services.push(`  postgres:
    image: ${image}
    container_name: \${COMPOSE_PROJECT_NAME}_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: \${POSTGRES_DB}
    ports:
      - "\${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER} -d \${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10`);
  }

  if (ctx.services.has('minio')) {
    services.push(`  minio:
    image: minio/minio:latest
    container_name: \${COMPOSE_PROJECT_NAME}_minio
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: \${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: \${MINIO_ROOT_PASSWORD}
    command: server /data --console-address ":9001"
    ports:
      # Published because the browser fetches presigned URLs directly from here.
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5`);
  }

  if (ctx.hasBackend) {
    const deps: string[] = [];
    if (ctx.hasPostgres) deps.push('      postgres:\n        condition: service_healthy');
    if (ctx.services.has('minio')) deps.push('      minio:\n        condition: service_healthy');
    services.push(`  backend:
    build: ./backend
    container_name: \${COMPOSE_PROJECT_NAME}_backend
    restart: unless-stopped
    env_file: .env
    ports:
      # Host binding for debugging only — real traffic goes through nginx.
      - "\${BACKEND_PORT:-3000}:3000"
    volumes:
      - ./backend:/app
      # Anonymous volume keeps the image's node_modules; remove it with
      # \`docker compose rm -f -v backend\` after adding a dependency.
      - /app/node_modules${deps.length ? '\n    depends_on:\n' + deps.join('\n') : ''}`);
  }

  if (ctx.services.has('email_service')) {
    services.push(`  email_service:
    build: ./email_service
    container_name: \${COMPOSE_PROJECT_NAME}_email
    restart: unless-stopped
    env_file: .env
    volumes:
      - ./email_service:/app
      - /app/node_modules`);
  }

  if (ctx.hasFrontend) {
    services.push(`  frontend:
    build: ./frontend
    container_name: \${COMPOSE_PROJECT_NAME}_frontend
    restart: unless-stopped
    volumes:
      - ./frontend:/app
      - /app/node_modules`);
  }

  if (ctx.hasNginx) {
    services.push(`  nginx:
    image: nginx:alpine
    container_name: \${COMPOSE_PROJECT_NAME}_nginx
    restart: unless-stopped
    ports:
      - "\${HTTP_PORT:-80}:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:${ctx.hasFrontend ? '\n      - frontend' : ''}${ctx.hasBackend ? '\n      - backend' : ''}`);
  }

  const volumes: string[] = [];
  if (ctx.hasPostgres) volumes.push('  postgres_data:');
  if (ctx.services.has('minio')) volumes.push('  minio_data:');

  return `# Local development. Bind mounts + dev servers.
# Production lives in docker-compose.coolify.yml — do not mix them.
#
# On Windows use http://127.0.0.1, not http://localhost (WSL2 resolves localhost
# to ::1 while Docker binds 0.0.0.0).
#
# No custom networks, same as production: every service shares the default
# network and reaches the others by name.

services:
${services.join('\n\n')}
${volumes.length ? '\nvolumes:\n' + volumes.join('\n') + '\n' : ''}`;
}

/* -------------------------------------------------- compose (coolify) --- */

export function generateComposeCoolify(ctx: Ctx): string {
  const services: string[] = [];
  const { limits, nodeHeap, hostLabel, totalGb, shared, availableGb, warnings } = ctx.memory;
  const limitOf = (id: keyof typeof limits, fallback: number) => mb(limits[id] ?? fallback);

  if (ctx.hasPostgres) {
    const image = ctx.hasPgvector ? 'pgvector/pgvector:pg16' : 'postgres:16-alpine';
    services.push(`  postgres:
    image: ${image}
    container_name: ${ctx.slug}_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: \${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in env}
      POSTGRES_DB: \${POSTGRES_DB:-${ctx.slug}}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    logging: *default-logging
    mem_limit: ${limitOf('postgres', 1024)}
    # Docker defaults /dev/shm to 64 MB; large sorts and index builds overflow it
    # with "could not resize shared memory segment".
    shm_size: 256m
    stop_grace_period: 30s
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER:-postgres} -d \${POSTGRES_DB:-${ctx.slug}}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s`);
  }

  if (ctx.services.has('minio')) {
    services.push(`  minio:
    image: minio/minio:latest
    container_name: ${ctx.slug}_minio
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: \${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: \${MINIO_ROOT_PASSWORD:?set MINIO_ROOT_PASSWORD in env}
    command: server /data
    volumes:
      - minio_data:/data
    logging: *default-logging
    mem_limit: ${limitOf('minio', 512)}
    stop_grace_period: 20s
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5`);
  }

  if (ctx.hasBackend) {
    const deps: string[] = [];
    if (ctx.hasPostgres) deps.push('      postgres:\n        condition: service_healthy');
    if (ctx.services.has('minio')) deps.push('      minio:\n        condition: service_healthy');
    services.push(`  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: ${ctx.slug}_backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      # Cap the V8 heap BELOW mem_limit so the GC reclaims instead of the kernel
      # OOM-killing the container (exit 137). Off-heap buffers need the slack.
      NODE_OPTIONS: --max-old-space-size=${nodeHeap}
    env_file: .env
    logging: *default-logging
    mem_limit: ${limitOf('backend', 1024)}
    stop_grace_period: 30s
    # Liveness only — a probe that queries the database turns a slow DB into a
    # restart loop. start_period is generous: the entrypoint runs schema push
    # and seed before the API listens.
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O- http://127.0.0.1:3000/api/health/live || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 120s${deps.length ? '\n    depends_on:\n' + deps.join('\n') : ''}`);
  }

  if (ctx.services.has('email_service')) {
    services.push(`  email_service:
    build:
      context: ./email_service
      dockerfile: Dockerfile.prod
    container_name: ${ctx.slug}_email
    restart: unless-stopped
    env_file: .env
    logging: *default-logging
    mem_limit: ${limitOf('email_service', 256)}
    stop_grace_period: 10s
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O- http://127.0.0.1:3001/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s`);
  }

  services.push(`  nginx:
    build:
      context: .
      dockerfile: nginx/Dockerfile.prod
    container_name: ${ctx.slug}_nginx
    restart: unless-stopped
    # No \`ports:\` — Traefik owns 80/443. Set the domain on THIS service in Coolify.
    expose:
      - "80"
    logging: *default-logging
    mem_limit: ${limitOf('nginx', 128)}
    stop_grace_period: 15s
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O- http://127.0.0.1/nginx-health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s${
        ctx.hasBackend
          ? `
    # service_healthy, not service_started: Traefik routes to nginx the moment
    # it is up, so starting it before the API is ready serves 502s on redeploy.
    depends_on:
      backend:
        condition: service_healthy`
          : ''
      }`);

  const volumes: string[] = [];
  if (ctx.hasPostgres) volumes.push('  postgres_data:');
  if (ctx.services.has('minio')) volumes.push('  minio_data:');

  return `# Production deployment for Coolify.
#
# ⚠️ NEVER declare a \`networks:\` block in this file.
# Traefik (coolify-proxy) lives on the \`coolify\` network and Coolify attaches
# these containers to it. An extra network puts nginx on two networks at once;
# Traefik then picks one non-deterministically and half of the container
# recreations end in permanent 504s. Containers still reach each other by their
# service name, exactly as they would on a network you declared yourself.
#${
    ctx.hasComposeDev
      ? `
# Differences from docker-compose.yml (local dev):
#   - compiled artefacts, no dev servers, no source bind mounts
#   - config baked into images (Coolify cannot see repo files at runtime)
#   - the frontend is a static bundle served by nginx, not its own container
#   - no host port bindings; nginx uses \`expose\`
#`
      : ''
  }
# MEMORY BUDGET — host: ${hostLabel}, ${totalGb} GB total${shared ? ', shared with other projects' : ''}.
# This stack's share: ~${availableGb.toFixed(1)} GB.
# The limits below are ceilings, not reservations: a service that exceeds ITS OWN
# mem_limit is OOM-killed (exit 137) even with GB free on the box. Diagnose with
# \`dmesg | grep -i oom\` and by telling exit 137 (kernel) from exit 1 (app).
${warnings.map((w) => `# ⚠️ ${w.replace(/\n/g, ' ')}`).join('\n') || '#'}

# Docker's default json-file driver grows without bound, and a full disk takes
# every container on the host down with it.
x-logging: &default-logging
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"

services:
${services.join('\n\n')}
${volumes.length ? '\nvolumes:\n' + volumes.join('\n') + '\n' : ''}`;
}

/* ------------------------------------------------------- dockerfiles --- */

export function generateBackendDockerfileDev(): string {
  return `FROM node:24-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
`;
}

export function generateBackendDockerfileProd(ctx: Ctx): string {
  const prismaGen = ctx.hasDb ? 'npm run prisma:generate && ' : '';
  const prismaCopy = ctx.hasDb ? '\nCOPY --from=builder /app/prisma ./prisma' : '';
  return `# syntax=docker/dockerfile:1.7
# Multi-stage: compile with devDependencies, ship a slim runtime.

# ---- builder ----
FROM node:24-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
# Coolify injects env vars as build ARGs. A buildtime NODE_ENV=production would
# make npm skip devDependencies, so tsc would not exist — force it here.
ENV NODE_ENV=development
# Coolify builds ON the production server, beside the running containers. Cap
# the build heap or the host OOM-killer takes down the database mid-build.
ENV NODE_OPTIONS=--max-old-space-size=${ctx.memory.buildHeap}
COPY package*.json ./
RUN --mount=type=cache,id=npm-backend,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN ${prismaGen}npm run build

# ---- runtime ----
FROM node:24-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist${prismaCopy}
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
`;
}

/**
 * The email service is a second Node app, so it needs its own images — the
 * Coolify compose builds it by path and Docker will not invent them.
 */
export function generateEmailDockerfile(mode: 'dev' | 'prod'): string {
  if (mode === 'dev') {
    return `FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]
`;
  }
  return `# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS builder
WORKDIR /app
# Coolify may inject NODE_ENV=production as a build ARG, which would skip the
# devDependencies this stage needs.
ENV NODE_ENV=development
COPY package*.json ./
RUN --mount=type=cache,id=npm-email,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
`;
}

export function generateEntrypoint(ctx: Ctx): string {
  const push = ctx.hasDb
    ? `
# db push, never migrate deploy/dev: this project keeps no migration history and
# a drifted migrate run offers to RESET the database.
npx prisma db push --skip-generate
npm run seed || echo "seed failed (non-fatal), continuing"
`
    : '';
  return `#!/bin/sh
set -e
${push}
exec node dist/index.js
`;
}

export function generateNginxDockerfileProd(ctx: Ctx): string {
  const feStage = ctx.hasFrontend
    ? `# ---- frontend build ----
FROM node:24-alpine AS frontend
WORKDIR /app
# Same reason as the backend image: Coolify may inject NODE_ENV=production.
ENV NODE_ENV=development
ENV NODE_OPTIONS=--max-old-space-size=${ctx.memory.buildHeap}
COPY frontend/package*.json ./
RUN --mount=type=cache,id=npm-frontend,target=/root/.npm npm ci --no-audit --no-fund
COPY frontend/ ./
# VITE_* values are inlined into the bundle and are therefore PUBLIC.
RUN npm run build

`
    : '';
  const copy = ctx.hasFrontend ? 'COPY --from=frontend /app/dist /usr/share/nginx/html\n' : '';
  return `# syntax=docker/dockerfile:1.7
${feStage}# ---- runtime ----
FROM nginx:alpine
${copy}COPY nginx/nginx.coolify.conf /etc/nginx/nginx.conf
EXPOSE 80
`;
}

export function generateNginxConf(ctx: Ctx, mode: 'dev' | 'prod'): string {
  // With no UI there is nothing to serve at `/` — say so instead of proxying to
  // a container that does not exist.
  const root = !ctx.hasFrontend
    ? `    location / {
      return 404;   # this project has no user interface
    }`
    : mode === 'prod'
      ? `    root /usr/share/nginx/html;
    index index.html;

    location / {
      try_files $uri $uri/ /index.html;   # SPA fallback
    }`
      : `    location / {
      proxy_pass http://frontend:5173;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;   # Vite HMR websocket
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
    }`;

  const api = ctx.hasBackend
    ? `
    location /api/ {
      proxy_pass http://backend:3000;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      # Above the slowest endpoint. The 60s default turns a long request into a
      # 504 that looks exactly like a backend crash.
      proxy_read_timeout 300s;
      proxy_send_timeout 300s;
    }
`
    : '';

  // MinIO has no domain of its own, so presigned download URLs are signed for
  // this origin (MINIO_PUBLIC_URL) and nginx forwards the bucket path. Host must
  // stay intact or the signature no longer matches.
  const storage = ctx.services.has('minio')
    ? `
    # Keep in sync with MINIO_BUCKET.
    location /app-files/ {
      proxy_pass http://minio:9000;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
      proxy_set_header Host $host;
      proxy_buffering off;
    }
`
    : '';

  return `worker_processes auto;

events {
  worker_connections 1024;
}

http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;
  sendfile      on;
  keepalive_timeout 65;

  # Keep this in sync with the API's upload limit — a mismatch produces an
  # opaque 413 with no log on the application side.
  client_max_body_size 60m;

  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

  server {
    listen 80;
    server_name _;

    location = /nginx-health {
      access_log off;
      return 200 "ok\\n";
    }
${api}${storage}
${root}
  }
}
`;
}

/* ------------------------------------------------------------ extras --- */

export function generateCi(ctx: Ctx): string {
  const jobs: string[] = [];
  if (ctx.hasFrontend) {
    jobs.push(`  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run build`);
  }
  if (ctx.hasBackend) {
    jobs.push(`  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npm run build${ctx.has('q-vitest') ? '\n      - run: npm test' : ''}`);
  }
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
${jobs.join('\n\n')}
`;
}
