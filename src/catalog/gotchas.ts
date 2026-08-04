/**
 * Hard-won production gotchas, harvested from real deployments of this stack.
 *
 * Each entry is pulled into the generated CLAUDE.md / prompt only when one of
 * its `when` option ids is selected, so a static-frontend project never gets a
 * page of Prisma warnings.
 */
export interface Gotcha {
  id: string;
  title: string;
  /** Markdown body. Kept terse — it lands verbatim in the new repo's CLAUDE.md. */
  body: string;
  /** Any-of: include this gotcha when at least one of these ids is selected. */
  when: string[];
}

export const GOTCHAS: Gotcha[] = [
  {
    id: 'compose-project-name',
    title: 'COMPOSE_PROJECT_NAME prefixes volume names',
    when: ['infra-compose-dev'],
    body: `\`COMPOSE_PROJECT_NAME\` in \`.env\` prefixes container names, networks **and volume names** (e.g. \`myapp_postgres_data\`). Changing it on an existing project makes Compose create **new empty volumes** — the data is not deleted, it is orphaned under the old volume name.

To run several clones on one machine: unique \`COMPOSE_PROJECT_NAME\` **and** unique host ports per clone.`,
  },
  {
    id: 'ts-node-dev-windows',
    title: 'ts-node-dev does NOT auto-reload on Windows Docker',
    when: ['backend-express'],
    body: `ts-node-dev watches with inotify, and inotify events do not propagate through Docker bind mounts on Windows/WSL2. Code changes under \`backend/src/\` are silently ignored at runtime.

\`\`\`bash
docker compose restart backend                 # after a code change
\`\`\`

After adding an npm package to \`backend/package.json\`:
\`\`\`bash
docker compose stop backend
docker compose rm -f -v backend   # -v removes the anonymous node_modules volume
docker compose up -d --build backend
\`\`\`
The \`-v\` is critical: \`/app/node_modules\` is an anonymous volume; without removing it the old one (missing the new package) is remounted.`,
  },
  {
    id: 'prisma-camelcase',
    title: 'Prisma generates camelCase column names — quote them in raw SQL',
    when: ['db-postgres-prisma', 'db-postgres-pgvector', 'db-sqlite-prisma'],
    body: `Prisma maps model fields directly to column names with no snake_case conversion: \`documentId\` → \`"documentId"\`.

In **all** raw SQL (\`$queryRaw\`, \`$executeRaw\`, SQL functions) quote camelCase identifiers:
\`\`\`sql
WHERE "documentId" = ANY('{id1,id2}'::text[])
\`\`\``,
  },
  {
    id: 'prisma-text-ids',
    title: 'All IDs are `text`, not `uuid`',
    when: ['db-postgres-prisma', 'db-postgres-pgvector'],
    body: `\`String @id @default(uuid())\` maps to PostgreSQL \`text\`, not \`uuid\`. Raw queries and SQL functions must use \`text\`/\`text[]\`, never \`::uuid\` — casting produces \`operator does not exist: text = uuid\`.`,
  },
  {
    id: 'sql-array-literal',
    title: 'SQL array literals take no inner quotes',
    when: ['db-postgres-pgvector'],
    body: `\`\`\`ts
// ✓ ids have no special chars, so no inner quoting
Prisma.raw(\`'{\${ids.join(',')}}'\`)   // '{5fa...,6fb...}'::text[]

// ✗ inner single quotes = syntax error
Prisma.raw(\`'{\${ids.map(i => \`'\${i}'\`).join(',')}}'\`)
\`\`\`
Void-returning SQL functions need \`$executeRaw\`; \`$queryRaw\` fails with "Failed to deserialize column of type 'void'".`,
  },
  {
    id: 'prisma-never-reset',
    title: 'NEVER run `prisma migrate reset` / `migrate dev` on a shared dev DB',
    when: ['db-postgres-prisma', 'db-postgres-pgvector', 'db-sqlite-prisma'],
    body: `When migration history drifts from real DB state, \`prisma migrate dev\` offers to **reset the database** — accepting drops and recreates the entire public schema, destroying all data. No dry-run, no undo. This has already wiped one dev database on this stack.

**Always use \`prisma db push\` for schema changes.** It reconciles the schema without touching migration history and is non-destructive for additive changes (new nullable columns, new tables).

If drift genuinely needs reconciling, use \`prisma migrate resolve\`, never a reset. Take a snapshot before any migration-state work:
\`\`\`bash
docker exec database pg_dump -U postgres -d APP_DB > backup-$(date +%Y%m%d-%H%M).sql
\`\`\``,
  },
  {
    id: 'better-auth-scrypt',
    title: 'Better Auth uses scrypt — a bcrypt check will always fail',
    when: ['auth-better-auth', 'auth-better-auth-jwt'],
    body: `Better Auth stores passwords with \`oslo/password\` (scrypt), format \`salt:hash\` hex. Any endpoint verifying with \`bcrypt.compare()\` returns 401 forever.

Issue the app JWT from the **existing session** instead of re-verifying the password: after \`POST /api/auth/sign-in/email\` succeeds, call \`GET /api/auth/jwt-from-session\` with the session cookie and store the token in localStorage.

If users look logged in but every API call 401s, the JWT is missing → \`localStorage.clear()\` and re-login.`,
  },
  {
    id: 'minio-two-clients',
    title: 'Storage needs two separate S3 clients',
    when: ['storage-minio'],
    body: `Presigned URLs are signed with the host in the endpoint. Sign with \`minio:9000\` and let the browser connect to \`127.0.0.1:9000\` and the \`Host\` mismatch invalidates the signature (connection reset).

| Client | Endpoint | Used for |
|---|---|---|
| \`getClient()\` | \`MINIO_ENDPOINT\` (\`http://minio:9000\`) | bucket ops, server-side up/downloads |
| \`getSigningClient()\` | \`MINIO_PUBLIC_URL\` (\`http://127.0.0.1:9000\`) | presigned GET URLs for the browser |`,
  },
  {
    id: 'upload-proxy',
    title: 'Proxy uploads through the API, not browser → MinIO',
    when: ['storage-minio', 'feat-uploads'],
    body: `Direct browser → MinIO \`PUT\` fails on Docker Desktop Windows (\`ERR_CONNECTION_RESET\` on large files). Upload through the API instead:

\`\`\`
Browser → POST /api/upload/file (multipart, nginx → Express) → MinIO PutObjectCommand
\`\`\`
Use \`multer\` with \`memoryStorage()\`, and keep the max file size identical in **both** nginx (\`client_max_body_size\`) and the multer limits — a mismatch produces an opaque 413.`,
  },
  {
    id: 'windows-127001',
    title: 'On Windows use `http://127.0.0.1`, not `http://localhost`',
    when: ['infra-compose-dev'],
    body: `With Docker Desktop (WSL2) \`localhost\` resolves to \`::1\` (IPv6) via \`wslrelay\`, while Docker binds ports on \`0.0.0.0\` (IPv4) and the IPv6 relay does not forward reliably.

Develop against \`http://127.0.0.1\` and list both spellings in \`TRUSTED_ORIGINS\`.`,
  },
  {
    id: 'vite-allowed-hosts',
    title: 'Vite needs `allowedHosts: true` behind a proxy',
    when: ['fe-react-vite'],
    body: `Vite 5.3+ blocks requests whose \`Host\` header it does not recognise. nginx proxies with \`Host: main_frontend\`, which Vite rejects with 403. Set \`server.allowedHosts = true\` in \`vite.config.ts\`.`,
  },
  {
    id: 'coolify-no-networks',
    title: '⚠️ NEVER declare a `networks:` block in the Coolify compose file',
    when: ['infra-coolify'],
    body: `This single line caused months of intermittent "Gateway Timeout" outages.

Traefik (\`coolify-proxy\`) lives on the \`coolify\` network and Coolify attaches your containers to it. Declaring an extra network puts nginx on **two** networks at once; Traefik then picks one non-deterministically. Pick the custom one and it has no route → every request 504s until something restarts the proxy. The coin flip happens on **every container recreation**, which is why the outages look random and "fix themselves".

Coolify's docs are explicit: no custom network definitions. Services still reach each other by service name (\`backend:3000\`, \`postgres:5432\`).`,
  },
  {
    id: 'coolify-memory',
    title: 'Size `mem_limit` against the cgroup, not the host',
    when: ['infra-coolify'],
    body: `A service that exceeds its own \`mem_limit\` is OOM-killed with **exit 137** even when the host has many GB free. Diagnose with \`dmesg | grep -i oom\` and by distinguishing exit 137 (kernel OOM) from exit 1 (app crash).

For Node services cap the V8 heap **below** the container limit — \`NODE_OPTIONS=--max-old-space-size=1280\` under \`mem_limit: 2g\` — leaving room for off-heap buffers (multipart uploads, base64 re-encoding). Without the cap V8 grows past the cgroup limit and the kernel kills the container instead of letting the GC reclaim.

Two things that must exist on the server and cannot live in a commit: a **swap file** and **scheduled database backups**.`,
  },
  {
    id: 'coolify-healthcheck',
    title: 'Liveness probes must not touch the database',
    when: ['infra-coolify'],
    body: `\`/api/health/live\` returns 200 from process state alone. A liveness probe that queries the DB turns a slow database into a restart loop, which makes the outage permanent.

Give the backend a generous \`start_period\` (the entrypoint runs \`prisma db push\` + seed before listening), and make nginx \`depends_on\` the backend with \`condition: service_healthy\` — Traefik routes to nginx the moment it is up, so starting it first serves 502s on every redeploy.`,
  },
  {
    id: 'coolify-logging',
    title: 'Rotate container logs or the disk fills',
    when: ['infra-coolify'],
    body: `Docker's default \`json-file\` driver grows without bound. Unrotated nginx access logs plus API stdout fill the disk in weeks, and a full disk takes postgres — and therefore everything — down. Apply a \`max-size: 10m\` / \`max-file: 3\` anchor to every service.

In the Coolify UI: enable the Docker cleanup cron, and keep **"Delete Unused Volumes" OFF**.`,
  },
  {
    id: 'coolify-build-args',
    title: 'Coolify injects env vars as build ARGs',
    when: ['infra-coolify'],
    body: `A buildtime \`NODE_ENV=production\` makes \`npm install\` skip devDependencies, so \`tsc\`/\`prisma\` are missing and the build fails. Force \`ENV NODE_ENV=development\` in the builder stage and \`ENV NODE_ENV=production\` in the runtime stage.

Coolify builds **on the production server**, next to the running containers: cap the build heap (\`NODE_OPTIONS=--max-old-space-size=1024\`) or the host OOM-killer takes down postgres mid-build. Serialise multiple frontend build stages for the same reason.

\`VITE_*\` values are inlined at build time — they are public. Never put a secret in one.`,
  },
  {
    id: 'swagger-enomem',
    title: 'swagger-jsdoc ENOMEM on Docker/Windows',
    when: ['feat-swagger'],
    body: `\`swaggerJSDoc()\` with glob patterns throws \`ENOMEM: not enough memory, scandir\` when scanning a Windows bind mount. Wrap the call in try/catch — the failure is non-fatal, only \`/api/docs\` is lost.`,
  },
  {
    id: 'nginx-single-entry',
    title: 'nginx is the only entrypoint',
    when: ['infra-nginx'],
    body: `Browsers talk to nginx only. Backend and database sit on an internal network with no host port bindings in production; the backend port is exposed locally for debugging only.

Keep \`client_max_body_size\` in sync with the API's upload limit, and set \`proxy_read_timeout\` above the slowest endpoint (long LLM or pipeline calls otherwise die at 60s with a 504 that looks like a backend crash).`,
  },
  {
    id: 'tailwind4-theme',
    title: 'Tailwind 4 is configured in CSS, not JS',
    when: ['ui-tailwind4'],
    body: `There is no \`tailwind.config.js\`. Use the \`@tailwindcss/vite\` plugin, \`@import "tailwindcss";\` and an \`@theme { --color-*: ...; }\` block in \`src/index.css\`. Config copied from a Tailwind 3 project is silently ignored.`,
  },
];

export function gotchasFor(selectedIds: Set<string>): Gotcha[] {
  return GOTCHAS.filter((g) => g.when.some((id) => selectedIds.has(id)));
}
