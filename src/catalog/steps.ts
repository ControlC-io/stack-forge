import type { I18nText } from '@/i18n';
import type { Selection, Step } from './types';
import { has, hasAny } from './types';

/**
 * The decision tree.
 *
 * Steps are asked in order; `visibleIf` prunes branches the shape of the project
 * has already ruled out (no database questions for a static site) and `requires`
 * greys out individual options whose prerequisites are missing.
 *
 * `label`/`description`/`title`/`question` are UI copy and are translated.
 * `spec`/`notes`/`tasks` end up in the generated files and are English only.
 */

/** Shorthand for a translated string. Product names stay plain strings. */
const L = (es: string, en: string, fr: string): I18nText => ({ es, en, fr });

const needsBackend = (sel: Selection) => !has(sel, 'shape-frontend-only');
const needsFrontend = (sel: Selection) => !has(sel, 'shape-api-only');

export const STEPS: Step[] = [
  {
    id: 'agent',
    title: L('Agente', 'Agent', 'Agent'),
    question: L(
      '¿Con qué agente vas a arrancar el proyecto?',
      'Which agent will bootstrap the project?',
      'Quel agent va démarrer le projet ?',
    ),
    help: L(
      'Determina qué ficheros de instrucciones se generan.',
      'Determines which instruction files get generated.',
      'Détermine les fichiers d’instructions générés.',
    ),
    mode: 'single',
    options: [
      {
        id: 'agent-claude-code',
        label: 'Claude Code',
        description: L(
          'Genera CLAUDE.md en la raíz del repo, más el prompt de arranque.',
          'Emits CLAUDE.md at the repo root, plus the bootstrap prompt.',
          'Génère CLAUDE.md à la racine du dépôt, plus le prompt de démarrage.',
        ),
        spec: 'Claude Code as the coding agent (instructions in CLAUDE.md)',
        recommended: true,
      },
      {
        id: 'agent-cursor',
        label: 'Cursor',
        description: L(
          'Genera .cursor/rules/project.mdc con alwaysApply, más el prompt de arranque.',
          'Emits .cursor/rules/project.mdc with alwaysApply, plus the bootstrap prompt.',
          'Génère .cursor/rules/project.mdc avec alwaysApply, plus le prompt de démarrage.',
        ),
        spec: 'Cursor as the coding agent (rules in .cursor/rules/project.mdc)',
      },
      {
        id: 'agent-both',
        label: L('Los dos', 'Both', 'Les deux'),
        description: L(
          'CLAUDE.md + reglas de Cursor + AGENTS.md compartido.',
          'CLAUDE.md + Cursor rules + a shared AGENTS.md.',
          'CLAUDE.md + règles Cursor + un AGENTS.md partagé.',
        ),
        spec: 'Claude Code and Cursor, sharing an AGENTS.md',
      },
    ],
  },

  {
    id: 'shape',
    title: L('Forma', 'Shape', 'Forme'),
    question: L(
      '¿Qué forma tiene el proyecto?',
      'What shape is the project?',
      'Quelle est la forme du projet ?',
    ),
    help: L(
      'Es la decisión que más ramas poda del árbol.',
      'This is the decision that prunes the most branches.',
      'C’est la décision qui élague le plus de branches.',
    ),
    mode: 'single',
    options: [
      {
        id: 'shape-fullstack',
        label: L('Full-stack DMZ', 'Full-stack DMZ', 'Full-stack DMZ'),
        description: L(
          'nginx como único entrypoint, frontend + API + base de datos en redes separadas.',
          'nginx as the only entrypoint, frontend + API + database on separate networks.',
          'nginx comme unique point d’entrée, frontend + API + base de données sur des réseaux séparés.',
        ),
        spec: 'Full-stack DMZ layout: nginx is the only entrypoint, frontend and API on separate networks',
        recommended: true,
        notes: [
          'Network topology: `dmz_net` (nginx, frontend) and `internal_net` (API, database, storage). Only nginx publishes host ports.',
        ],
      },
      {
        id: 'shape-frontend-only',
        label: L('Solo frontend', 'Frontend only', 'Frontend seul'),
        description: L(
          'SPA estática servida por nginx. Sin API propia, sin base de datos.',
          'Static SPA served by nginx. No API of its own, no database.',
          'SPA statique servie par nginx. Pas d’API propre, pas de base de données.',
        ),
        spec: 'Static single-page app, no server of its own',
        notes: ['No backend: all state lives in the browser (localStorage / IndexedDB).'],
      },
      {
        id: 'shape-api-only',
        label: L('Solo API', 'API only', 'API seule'),
        description: L(
          'Servicio HTTP sin interfaz. Útil para workers, webhooks o APIs internas.',
          'Headless HTTP service. For workers, webhooks or internal APIs.',
          'Service HTTP sans interface. Pour workers, webhooks ou API internes.',
        ),
        spec: 'Headless HTTP service, no user interface',
      },
    ],
  },

  {
    id: 'frontend',
    title: 'Frontend',
    question: L(
      '¿Qué framework de frontend?',
      'Which frontend framework?',
      'Quel framework frontend ?',
    ),
    mode: 'single',
    visibleIf: needsFrontend,
    options: [
      {
        id: 'fe-react-vite',
        label: 'React 19 + Vite 5',
        description: L(
          'SPA con react-router-dom v6. Build estático servido por nginx en producción.',
          'SPA with react-router-dom v6. Static build served by nginx in production.',
          'SPA avec react-router-dom v6. Build statique servi par nginx en production.',
        ),
        spec: 'React 19 + Vite 5 SPA with react-router-dom v6',
        recommended: true,
        deps: {
          frontend: ['react', 'react-dom', 'react-router-dom'],
          frontendDev: ['vite', '@vitejs/plugin-react', 'typescript', '@types/react', '@types/react-dom'],
        },
        gotchas: ['vite-allowed-hosts'],
        tasks: [
          'Scaffold the frontend: Vite + React + strict TypeScript, `@/*` alias to `src/*`.',
          'Set up the router with a persistent layout and guarded routes.',
        ],
      },
      {
        id: 'fe-nextjs',
        label: 'Next.js (App Router)',
        description: L(
          'SSR/RSC. Sustituye al par nginx+SPA: el propio Next sirve la app.',
          'SSR/RSC. Replaces the nginx+SPA pair: Next serves the app itself.',
          'SSR/RSC. Remplace le duo nginx+SPA : Next sert l’application lui-même.',
        ),
        spec: 'Next.js App Router (server-rendered, serves itself)',
        conflicts: ['shape-fullstack'],
        deps: { frontend: ['next', 'react', 'react-dom'] },
      },
    ],
  },

  {
    id: 'ui',
    title: 'UI',
    question: L(
      '¿Qué capa de UI y utilidades de cliente?',
      'Which UI layer and client-side utilities?',
      'Quelle couche UI et quels utilitaires côté client ?',
    ),
    mode: 'multi',
    visibleIf: needsFrontend,
    options: [
      {
        id: 'ui-tailwind4',
        label: 'Tailwind CSS 4',
        description: L(
          'Configurado con @theme en src/index.css. Sin tailwind.config.js.',
          'Configured with @theme in src/index.css. No tailwind.config.js.',
          'Configuré avec @theme dans src/index.css. Pas de tailwind.config.js.',
        ),
        spec: 'Tailwind CSS 4, configured via `@theme` in `src/index.css` (no tailwind.config.js)',
        recommended: true,
        deps: { frontendDev: ['tailwindcss', '@tailwindcss/vite'] },
        gotchas: ['tailwind4-theme'],
      },
      {
        id: 'ui-shadcn',
        label: 'shadcn/ui (New York)',
        description: L(
          'Componentes copiados a src/components/ui/, sobre Radix UI.',
          'Components vendored into src/components/ui/, built on Radix UI.',
          'Composants copiés dans src/components/ui/, basés sur Radix UI.',
        ),
        spec: 'shadcn/ui (New York style) components vendored into `src/components/ui/`',
        recommended: true,
        requires: ['ui-tailwind4'],
        deps: {
          frontend: ['class-variance-authority', 'clsx', 'tailwind-merge', '@radix-ui/react-slot'],
        },
      },
      {
        id: 'ui-lucide',
        label: 'lucide-react',
        description: L(
          'Set de iconos que asume shadcn/ui.',
          'The icon set shadcn/ui assumes.',
          'Le jeu d’icônes attendu par shadcn/ui.',
        ),
        spec: 'lucide-react icons',
        recommended: true,
        deps: { frontend: ['lucide-react'] },
      },
      {
        id: 'ui-forms',
        label: 'react-hook-form + zod',
        description: L(
          'Formularios con validación compartida entre cliente y API.',
          'Forms with validation shared between client and API.',
          'Formulaires avec validation partagée entre le client et l’API.',
        ),
        spec: 'react-hook-form + zod, with the schemas shared between client and API',
        recommended: true,
        deps: { frontend: ['react-hook-form', 'zod', '@hookform/resolvers'] },
      },
      {
        id: 'ui-query',
        label: 'TanStack Query',
        description: L(
          'Caché de servidor, reintentos y estados de carga sin useEffect a mano.',
          'Server cache, retries and loading states without hand-rolled useEffect.',
          'Cache serveur, réessais et états de chargement sans useEffect manuel.',
        ),
        spec: 'TanStack Query for server state, caching and retries',
        deps: { frontend: ['@tanstack/react-query'] },
      },
      {
        id: 'ui-sonner',
        label: 'sonner',
        description: L(
          'Notificaciones. Un único <Toaster /> en el layout raíz.',
          'Toasts. A single <Toaster /> in the root layout.',
          'Notifications. Un seul <Toaster /> dans le layout racine.',
        ),
        spec: 'sonner for toasts (a single <Toaster /> in the root layout)',
        deps: { frontend: ['sonner'] },
      },
      {
        id: 'ui-i18n',
        label: 'i18next',
        description: L(
          'Textos de interfaz traducibles. Los identificadores del código siguen en inglés.',
          'Translatable UI copy. Code identifiers stay in English.',
          'Textes d’interface traduisibles. Les identifiants du code restent en anglais.',
        ),
        spec: 'i18next for UI copy (identifiers and comments stay in English)',
        deps: { frontend: ['i18next', 'react-i18next'] },
      },
      {
        id: 'ui-charts',
        label: 'Recharts',
        description: L('Gráficas para dashboards.', 'Charts for dashboards.', 'Graphiques pour tableaux de bord.'),
        spec: 'Recharts for dashboard charts',
        deps: { frontend: ['recharts'] },
      },
      {
        id: 'ui-markdown',
        label: 'react-markdown + rehype-sanitize',
        description: L(
          'Render de markdown saneado (respuestas de LLM, documentación).',
          'Sanitized markdown rendering (LLM answers, documentation).',
          'Rendu markdown assaini (réponses de LLM, documentation).',
        ),
        spec: 'react-markdown with rehype-sanitize (untrusted markdown is always sanitized)',
        deps: { frontend: ['react-markdown', 'remark-gfm', 'rehype-raw', 'rehype-sanitize'] },
      },
    ],
  },

  {
    id: 'backend',
    title: 'Backend',
    question: L('¿Qué runtime de API?', 'Which API runtime?', 'Quel runtime d’API ?'),
    mode: 'single',
    visibleIf: needsBackend,
    options: [
      {
        id: 'backend-express',
        label: 'Express 4 + TypeScript',
        description: L(
          'ts-node-dev en desarrollo, compilado a dist/ en producción.',
          'ts-node-dev in development, compiled to dist/ in production.',
          'ts-node-dev en développement, compilé vers dist/ en production.',
        ),
        spec: 'Express 4 + TypeScript API (ts-node-dev in dev, compiled to dist/ in prod)',
        recommended: true,
        services: ['backend'],
        deps: {
          backend: ['express', 'cors', 'dotenv', 'zod'],
          backendDev: ['typescript', 'ts-node-dev', '@types/express', '@types/cors', '@types/node'],
        },
        env: [{ key: 'PORT', value: '3000' }],
        gotchas: ['ts-node-dev-windows'],
        tasks: [
          'Build the API: one router per domain under `src/routes/`, zod validation at the edge, one centralised error handler.',
          'Expose `/api/health/live` (no database access) and `/api/health/ready` (checks dependencies).',
          'Handle SIGTERM: stop accepting connections, drain in-flight work, then exit.',
        ],
      },
      {
        id: 'backend-fastify',
        label: 'Fastify',
        description: L(
          'Más rápido y con validación de schema integrada. Menos ejemplos en este stack.',
          'Faster, with schema validation built in. Fewer examples in this stack.',
          'Plus rapide, validation de schéma intégrée. Moins d’exemples dans ce stack.',
        ),
        spec: 'Fastify + TypeScript API with schema-based validation',
        services: ['backend'],
        deps: { backend: ['fastify', 'zod'] },
      },
    ],
  },

  {
    id: 'database',
    title: L('Datos', 'Data', 'Données'),
    question: L('¿Base de datos y ORM?', 'Database and ORM?', 'Base de données et ORM ?'),
    mode: 'single',
    visibleIf: needsBackend,
    options: [
      {
        id: 'db-postgres-prisma',
        label: 'PostgreSQL + Prisma',
        description: L(
          'Esquema en prisma/schema.prisma, cambios aplicados con db push.',
          'Schema in prisma/schema.prisma, changes applied with db push.',
          'Schéma dans prisma/schema.prisma, changements appliqués avec db push.',
        ),
        spec: 'PostgreSQL 16 with Prisma (schema changes applied with `prisma db push`)',
        recommended: true,
        services: ['postgres'],
        deps: { backend: ['@prisma/client'], backendDev: ['prisma'] },
        env: [
          { key: 'POSTGRES_USER', value: 'postgres' },
          { key: 'POSTGRES_PASSWORD', secret: true },
          { key: 'POSTGRES_DB', value: 'app_db' },
          { key: 'DATABASE_URL', value: 'postgresql://postgres:CHANGEME@postgres:5432/app_db' },
        ],
        gotchas: ['prisma-camelcase', 'prisma-text-ids', 'prisma-never-reset'],
        tasks: [
          'Write the initial Prisma schema and apply it with `npm run prisma:push` (never `migrate dev` — see the traps below).',
          'Add an idempotent seed script for roles and baseline configuration.',
        ],
      },
      {
        id: 'db-postgres-pgvector',
        label: 'PostgreSQL + pgvector + Prisma',
        description: L(
          'Para RAG: imagen pgvector/pgvector:pg16, columnas vector añadidas por SQL crudo.',
          'For RAG: pgvector/pgvector:pg16 image, vector columns added via raw SQL.',
          'Pour le RAG : image pgvector/pgvector:pg16, colonnes vector ajoutées en SQL brut.',
        ),
        spec: 'PostgreSQL 16 + pgvector with Prisma, for embedding search',
        services: ['postgres'],
        deps: { backend: ['@prisma/client'], backendDev: ['prisma'] },
        env: [
          { key: 'POSTGRES_USER', value: 'postgres' },
          { key: 'POSTGRES_PASSWORD', secret: true },
          { key: 'POSTGRES_DB', value: 'app_db' },
          { key: 'DATABASE_URL', value: 'postgresql://postgres:CHANGEME@postgres:5432/app_db' },
        ],
        gotchas: ['prisma-camelcase', 'prisma-text-ids', 'sql-array-literal', 'prisma-never-reset'],
        notes: [
          '`vector(N)` columns cannot be expressed in Prisma, so they are created from raw SQL in the seed, together with the search functions.',
        ],
      },
      {
        id: 'db-sqlite-prisma',
        label: 'SQLite + Prisma',
        description: L(
          'Un fichero en un volumen. Suficiente para herramientas internas.',
          'One file on a volume. Enough for internal tools.',
          'Un fichier sur un volume. Suffisant pour un outil interne.',
        ),
        spec: 'SQLite via Prisma, stored on a mounted volume',
        deps: { backend: ['@prisma/client'], backendDev: ['prisma'] },
        env: [{ key: 'DATABASE_URL', value: 'file:./data/app.db' }],
        gotchas: ['prisma-camelcase', 'prisma-never-reset'],
      },
      {
        id: 'db-none',
        label: L('Sin base de datos', 'No database', 'Sans base de données'),
        description: L(
          'La API es sin estado o delega la persistencia en otro servicio.',
          'The API is stateless, or delegates persistence to another service.',
          'L’API est sans état ou délègue la persistance à un autre service.',
        ),
        spec: 'No database — the API is stateless',
      },
    ],
  },

  {
    id: 'auth',
    title: 'Auth',
    question: L('¿Cómo se autentica?', 'How do users authenticate?', 'Comment s’authentifie-t-on ?'),
    mode: 'single',
    visibleIf: (sel) => needsBackend(sel) && !has(sel, 'db-none'),
    options: [
      {
        id: 'auth-better-auth-jwt',
        label: L('Better Auth + JWT propio', 'Better Auth + app JWT', 'Better Auth + JWT applicatif'),
        description: L(
          'Sesión por cookie para el login y un JWT emitido desde la sesión para las llamadas a la API.',
          'Cookie session for login, plus a JWT minted from that session for API calls.',
          'Session par cookie pour la connexion, plus un JWT émis depuis la session pour les appels API.',
        ),
        spec: 'Better Auth (email/password session cookie) plus an app-issued JWT for API calls',
        recommended: true,
        deps: { backend: ['better-auth', 'jsonwebtoken'], frontend: ['better-auth'] },
        env: [
          { key: 'BETTER_AUTH_SECRET', secret: true },
          { key: 'BETTER_AUTH_URL', value: 'http://127.0.0.1' },
          { key: 'TRUSTED_ORIGINS', value: 'http://localhost,http://127.0.0.1' },
          { key: 'JWT_SECRET', secret: true },
          { key: 'JWT_EXPIRES_IN', value: '8h' },
        ],
        gotchas: ['better-auth-scrypt'],
        tasks: [
          'Wire Better Auth email/password; after sign-in, `GET /api/auth/jwt-from-session` mints the JWT the frontend uses.',
          'Add the auth middleware that verifies the JWT on every API route.',
        ],
      },
      {
        id: 'auth-better-auth',
        label: L('Better Auth (solo sesión)', 'Better Auth (session only)', 'Better Auth (session seule)'),
        description: L(
          'Cookies de sesión sin JWT. Más simple si no hay clientes externos.',
          'Session cookies without a JWT. Simpler when there are no external clients.',
          'Cookies de session sans JWT. Plus simple sans clients externes.',
        ),
        spec: 'Better Auth with session cookies only',
        deps: { backend: ['better-auth'], frontend: ['better-auth'] },
        env: [
          { key: 'BETTER_AUTH_SECRET', secret: true },
          { key: 'BETTER_AUTH_URL', value: 'http://127.0.0.1' },
        ],
        gotchas: ['better-auth-scrypt'],
      },
      {
        id: 'auth-none',
        label: L('Sin autenticación', 'No authentication', 'Sans authentification'),
        description: L(
          'Herramienta interna detrás de una red privada o de un proxy que ya autentica.',
          'Internal tool behind a private network or an already-authenticating proxy.',
          'Outil interne derrière un réseau privé ou un proxy qui authentifie déjà.',
        ),
        spec: 'No authentication — access is restricted at the network layer',
      },
    ],
  },

  {
    id: 'roles',
    title: L('Roles', 'Roles', 'Rôles'),
    question: L(
      '¿Necesitas control de acceso por rol?',
      'Do you need role-based access control?',
      'Avez-vous besoin d’un contrôle d’accès par rôle ?',
    ),
    mode: 'single',
    visibleIf: (sel) => hasAny(sel, ['auth-better-auth-jwt', 'auth-better-auth']),
    options: [
      {
        id: 'rbac-simple',
        label: L('RBAC de tabla propia', 'Table-backed RBAC', 'RBAC en table dédiée'),
        description: L(
          'Tabla de perfiles (admin | contributor | reviewer), middleware guard en todas las rutas.',
          'Profile table (admin | contributor | reviewer) plus a guard middleware on every route.',
          'Table de profils (admin | contributor | reviewer) et un middleware de garde sur chaque route.',
        ),
        spec: 'Role-based access control: a profile table (admin | contributor | reviewer) and a guard middleware',
        recommended: true,
        tasks: [
          "Add the role guard and apply it to EVERY business route; auto-provision the lowest role on a user's first request.",
        ],
      },
      {
        id: 'rbac-none',
        label: L('Solo usuario autenticado', 'Authenticated users only', 'Utilisateurs authentifiés seulement'),
        description: L(
          'Todos los usuarios ven lo mismo.',
          'Every user sees the same thing.',
          'Tous les utilisateurs voient la même chose.',
        ),
        spec: 'Authenticated users all have the same permissions',
      },
    ],
  },

  {
    id: 'storage',
    title: 'Storage',
    question: L('¿Almacenamiento de ficheros?', 'File storage?', 'Stockage de fichiers ?'),
    mode: 'single',
    visibleIf: needsBackend,
    options: [
      {
        id: 'storage-minio',
        label: L('MinIO (S3 self-hosted)', 'MinIO (self-hosted S3)', 'MinIO (S3 auto-hébergé)'),
        description: L(
          'Compatible con S3, en el mismo VPS. Subidas proxeadas por la API.',
          'S3-compatible, on the same VPS. Uploads proxied through the API.',
          'Compatible S3, sur le même VPS. Téléversements relayés par l’API.',
        ),
        spec: 'MinIO for object storage (S3-compatible, self-hosted alongside the app)',
        recommended: true,
        services: ['minio'],
        deps: {
          backend: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'multer'],
          backendDev: ['@types/multer'],
        },
        env: [
          { key: 'MINIO_ROOT_USER', value: 'minioadmin' },
          { key: 'MINIO_ROOT_PASSWORD', secret: true },
          { key: 'MINIO_ENDPOINT', value: 'http://minio:9000', comment: 'internal network — server-side operations' },
          { key: 'MINIO_PUBLIC_URL', value: 'http://127.0.0.1:9000', comment: 'browser-facing host — used to sign URLs' },
          { key: 'MINIO_BUCKET', value: 'app-files' },
        ],
        gotchas: ['minio-two-clients', 'upload-proxy'],
      },
      {
        id: 'storage-s3',
        label: L('S3 / R2 gestionado', 'Managed S3 / R2', 'S3 / R2 managé'),
        description: L(
          'Bucket externo. Sin contenedor extra, con coste por uso.',
          'External bucket. No extra container, pay per use.',
          'Bucket externe. Pas de conteneur en plus, facturé à l’usage.',
        ),
        spec: 'Managed S3-compatible bucket (AWS S3 or Cloudflare R2)',
        deps: { backend: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'] },
        env: [
          { key: 'S3_ENDPOINT' },
          { key: 'S3_ACCESS_KEY_ID', secret: true },
          { key: 'S3_SECRET_ACCESS_KEY', secret: true },
          { key: 'S3_BUCKET' },
        ],
        gotchas: ['upload-proxy'],
      },
      {
        id: 'storage-none',
        label: L('Sin ficheros', 'No file storage', 'Sans stockage de fichiers'),
        description: L(
          'La app no sube ni sirve binarios.',
          'The app neither uploads nor serves binaries.',
          'L’application ne téléverse ni ne sert de binaires.',
        ),
        spec: 'No file storage',
      },
    ],
  },

  {
    id: 'features',
    title: L('Módulos', 'Modules', 'Modules'),
    question: L(
      '¿Qué módulos transversales incluye?',
      'Which cross-cutting modules does it need?',
      'Quels modules transversaux inclure ?',
    ),
    mode: 'multi',
    visibleIf: needsBackend,
    options: [
      {
        id: 'feat-uploads',
        label: L('Subida de ficheros', 'File uploads', 'Téléversement de fichiers'),
        description: L(
          'multer en memoria, límite idéntico en nginx y en la API.',
          'multer in memory, with identical limits in nginx and the API.',
          'multer en mémoire, avec des limites identiques dans nginx et l’API.',
        ),
        spec: 'File uploads proxied through the API (multer memoryStorage)',
        requires: ['storage-minio'],
        gotchas: ['upload-proxy'],
      },
      {
        id: 'feat-email',
        label: L('Servicio de email aparte', 'Separate email service', 'Service e-mail séparé'),
        description: L(
          'Microservicio propio (SendGrid) con secreto compartido; la API nunca habla con el proveedor.',
          'Its own microservice (SendGrid) behind a shared secret; the API never talks to the provider.',
          'Microservice dédié (SendGrid) avec un secret partagé ; l’API ne parle jamais au fournisseur.',
        ),
        spec: 'Transactional email in its own service (SendGrid), reached with a shared secret',
        services: ['email_service'],
        env: [
          { key: 'SENDGRID_API_KEY', secret: true },
          { key: 'SENDGRID_FROM_EMAIL' },
          { key: 'EMAIL_SERVICE_SECRET', secret: true },
          { key: 'EMAIL_SERVICE_URL', value: 'http://email_service:3001' },
        ],
      },
      {
        id: 'feat-ai',
        label: L('Proveedores de IA', 'AI providers', 'Fournisseurs d’IA'),
        description: L(
          'Capa de abstracción: la config resuelve override en BD → variable de entorno → default del driver.',
          'Abstraction layer: config resolves DB override → env var → driver default.',
          'Couche d’abstraction : la config résout override en BDD → variable d’environnement → défaut du driver.',
        ),
        spec: 'Pluggable AI provider layer (config resolves DB override → env var → driver default)',
        env: [
          { key: 'OPENROUTER_API_KEY', secret: true },
          { key: 'LLM_MODEL', value: 'openai/gpt-4o-mini' },
          { key: 'EMBEDDING_MODEL', value: 'openai/text-embedding-3-small' },
        ],
        notes: [
          'API keys live only in backend environment variables — never in the database, never in the frontend bundle.',
        ],
      },
      {
        id: 'feat-swagger',
        label: 'Swagger / OpenAPI',
        description: L(
          'Docs generadas desde comentarios JSDoc en /api/docs.',
          'Docs generated from JSDoc comments, served at /api/docs.',
          'Docs générées depuis les commentaires JSDoc, servies sur /api/docs.',
        ),
        spec: 'OpenAPI docs generated from JSDoc comments, served at /api/docs',
        deps: { backend: ['swagger-jsdoc', 'swagger-ui-express'] },
        gotchas: ['swagger-enomem'],
      },
      {
        id: 'feat-public-api',
        label: L('API pública con Bearer', 'Public API with bearer token', 'API publique avec jeton Bearer'),
        description: L(
          'Superficie separada para integraciones máquina-a-máquina, con su propio token.',
          'A separate surface for machine-to-machine integrations, with its own token.',
          'Une surface distincte pour les intégrations machine-à-machine, avec son propre jeton.',
        ),
        spec: 'A separate public REST surface authenticated with a static bearer token',
        env: [{ key: 'API_BEARER_TOKEN', secret: true }],
      },
      {
        id: 'feat-jobs',
        label: L('Trabajos en segundo plano', 'Background jobs', 'Tâches de fond'),
        description: L(
          'Cola en proceso con límite de concurrencia explícito (proteger la memoria del contenedor).',
          'In-process queue with an explicit concurrency cap (protects container memory).',
          'File d’attente en processus avec une limite de concurrence explicite (protège la mémoire du conteneur).',
        ),
        spec: 'In-process background jobs with an explicit concurrency cap',
        env: [{ key: 'MAX_CONCURRENT_JOBS', value: '2' }],
        notes: [
          'The concurrency cap exists to protect container memory: raising it is the fastest route back to OOM kills.',
        ],
      },
    ],
  },

  {
    id: 'infra',
    title: 'Infra',
    question: L(
      '¿Qué infraestructura genero?',
      'Which infrastructure should I generate?',
      'Quelle infrastructure dois-je générer ?',
    ),
    mode: 'multi',
    options: [
      {
        id: 'infra-compose-dev',
        label: L('docker-compose de desarrollo', 'Development docker-compose', 'docker-compose de développement'),
        description: L(
          'Servicios con bind mounts y hot reload, puertos publicados en el host.',
          'Services with bind mounts and hot reload, ports published on the host.',
          'Services avec bind mounts et rechargement à chaud, ports publiés sur l’hôte.',
        ),
        spec: 'Local docker compose stack with bind mounts and hot reload',
        recommended: true,
        gotchas: ['compose-project-name', 'windows-127001'],
      },
      {
        id: 'infra-nginx',
        label: L('nginx como gateway', 'nginx as the gateway', 'nginx comme passerelle'),
        description: L(
          'Único entrypoint: sirve el frontend y proxea /api/* al backend.',
          'The only entrypoint: serves the frontend and proxies /api/* to the backend.',
          'Unique point d’entrée : sert le frontend et relaie /api/* vers le backend.',
        ),
        spec: 'nginx as the single entrypoint (serves the frontend, proxies /api/*)',
        recommended: true,
        services: ['nginx'],
        gotchas: ['nginx-single-entry'],
      },
      {
        id: 'infra-coolify',
        label: L('Producción en Coolify', 'Production on Coolify', 'Production sur Coolify'),
        description: L(
          'docker-compose.coolify.yml + Dockerfile.prod multi-stage, con las lecciones de las caídas ya aplicadas.',
          'docker-compose.coolify.yml + multi-stage Dockerfile.prod, with the outage lessons already applied.',
          'docker-compose.coolify.yml + Dockerfile.prod multi-étapes, avec les leçons des pannes déjà appliquées.',
        ),
        spec: 'Production deployment on Coolify (multi-stage images, compose file with no custom networks)',
        recommended: true,
        gotchas: [
          'coolify-no-networks',
          'coolify-memory',
          'coolify-healthcheck',
          'coolify-logging',
          'coolify-build-args',
        ],
        tasks: [
          'Deploy on Coolify: point the resource at `docker-compose.coolify.yml`, set the domain on the nginx service, and paste the env vars into the UI.',
        ],
      },
      {
        id: 'infra-ci',
        label: 'GitHub Actions',
        description: L(
          'Typecheck y build en cada push.',
          'Typecheck and build on every push.',
          'Typecheck et build à chaque push.',
        ),
        spec: 'GitHub Actions running typecheck and build on every push',
      },
    ],
  },

  {
    id: 'quality',
    title: L('Calidad', 'Quality', 'Qualité'),
    question: L(
      '¿Qué disciplina de código impongo en las instrucciones?',
      'Which coding discipline should the instructions enforce?',
      'Quelle discipline de code les instructions doivent-elles imposer ?',
    ),
    mode: 'multi',
    options: [
      {
        id: 'q-strict-ts',
        label: L('TypeScript strict', 'Strict TypeScript', 'TypeScript strict'),
        description: L(
          'Sin any implícito, sin @ts-ignore sin justificación.',
          'No implicit any, no unexplained @ts-ignore.',
          'Pas de any implicite, pas de @ts-ignore non justifié.',
        ),
        spec: 'Strict TypeScript everywhere',
        recommended: true,
      },
      {
        id: 'q-vitest',
        label: 'Vitest',
        description: L(
          'Tests unitarios y de integración (supertest en la API, Testing Library en el frontend).',
          'Unit and integration tests (supertest for the API, Testing Library for the UI).',
          'Tests unitaires et d’intégration (supertest pour l’API, Testing Library pour l’UI).',
        ),
        spec: 'Vitest for unit and integration tests (supertest for the API, Testing Library for the UI)',
        recommended: true,
        deps: { frontendDev: ['vitest'], backendDev: ['vitest', 'supertest'] },
      },
      {
        id: 'q-eslint',
        label: 'ESLint',
        description: L(
          'eslint + @typescript-eslint, cero warnings en CI.',
          'eslint + @typescript-eslint, zero warnings in CI.',
          'eslint + @typescript-eslint, zéro avertissement en CI.',
        ),
        spec: 'ESLint with @typescript-eslint, zero warnings allowed',
        deps: { frontendDev: ['eslint', '@typescript-eslint/eslint-plugin', '@typescript-eslint/parser'] },
      },
      {
        id: 'q-english-code',
        label: L('Código en inglés', 'Code in English', 'Code en anglais'),
        description: L(
          'Identificadores, comentarios y commits en inglés; la interfaz puede estar en otro idioma.',
          'Identifiers, comments and commits in English; the UI may be localised.',
          'Identifiants, commentaires et commits en anglais ; l’interface peut être localisée.',
        ),
        spec: 'Code, comments and commits in English; UI strings may be localised',
        recommended: true,
      },
      {
        id: 'q-conventional',
        label: 'Conventional commits',
        description: L('feat:, fix:, chore: … con alcance.', 'feat:, fix:, chore: … with a scope.', 'feat:, fix:, chore: … avec une portée.'),
        spec: 'Conventional commits',
      },
    ],
  },
];

export const STEP_IDS = STEPS.map((s) => s.id);

export function visibleSteps(sel: Selection): Step[] {
  return STEPS.filter((s) => !s.visibleIf || s.visibleIf(sel));
}
