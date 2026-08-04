import type { I18nText } from '@/i18n';
import type { Selection, Step } from './types';
import { has } from './types';

/**
 * The decision tree.
 *
 * Two ideas keep this usable:
 *
 *  - `locked` options are the stack baseline. They are shown so you understand
 *    what you are getting, not so you can choose — deciding these once is the
 *    entire point of a template. Only genuine decisions are toggleable.
 *  - The first step (`stack`) is the high-level branch. Everything below it is
 *    pruned by `visibleIf`: pick Supabase and the API / database / auth /
 *    storage steps disappear, because Supabase already answers them.
 *
 * `label`/`description`/`title`/`question` are UI copy and are translated.
 * `spec`/`notes`/`tasks` end up in the generated files and are English only.
 */

/** Shorthand for a translated string. Product names stay plain strings. */
const L = (es: string, en: string, fr: string): I18nText => ({ es, en, fr });

const isSupabase = (sel: Selection) => has(sel, 'stack-supabase');
const hasOwnApi = (sel: Selection) => has(sel, 'stack-fullstack') || has(sel, 'stack-api-only');
const hasUi = (sel: Selection) => !has(sel, 'stack-api-only');

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
    id: 'stack',
    title: L('Backend', 'Backend', 'Backend'),
    question: L(
      '¿Dónde viven los datos y la lógica?',
      'Where do the data and the logic live?',
      'Où vivent les données et la logique ?',
    ),
    help: L(
      'Es la decisión más importante: define qué pasos verás después.',
      'The most important decision: it defines which steps you see next.',
      'La décision la plus importante : elle définit les étapes suivantes.',
    ),
    mode: 'single',
    options: [
      {
        id: 'stack-fullstack',
        label: L(
          'API propia (VPS con Coolify)',
          'Your own API (VPS running Coolify)',
          'Votre propre API (VPS sous Coolify)',
        ),
        description: L(
          'Express + PostgreSQL + MinIO en Docker detrás de nginx, desplegado en tu VPS con Coolify. Control total, sin coste por uso.',
          'Express + PostgreSQL + MinIO in Docker behind nginx, deployed to your VPS with Coolify. Full control, no usage billing.',
          'Express + PostgreSQL + MinIO dans Docker derrière nginx, déployé sur votre VPS avec Coolify. Contrôle total, sans facturation à l’usage.',
        ),
        spec: 'Self-hosted API: Express + PostgreSQL + MinIO in Docker behind nginx, deployed on Coolify',
        recommended: true,
        // No `notes`: the architecture section already draws this topology, and
        // repeating it in the stack list is noise in a document meant to be read.
      },
      {
        id: 'stack-supabase',
        label: 'Supabase',
        description: L(
          'Postgres, Auth y Storage gestionados. El frontend (estático, en tu VPS con Coolify) habla directo con Supabase: no se genera API propia.',
          'Managed Postgres, Auth and Storage. The frontend (static, on your Coolify VPS) talks to Supabase directly: no API of your own is generated.',
          'Postgres, Auth et Storage managés. Le frontend (statique, sur votre VPS Coolify) parle directement à Supabase : aucune API propre n’est générée.',
        ),
        spec: 'Supabase as the backend (managed Postgres, Auth and Storage); the frontend talks to it directly',
        notes: [
          'There is no server of your own: the browser is the only client, so every security rule must be a Row Level Security policy in the database.',
        ],
      },
      {
        id: 'stack-static',
        label: L('Sin backend', 'No backend', 'Sans backend'),
        description: L(
          'SPA estática servida por nginx en tu VPS con Coolify. Todo el estado en el navegador: nada compartido entre dispositivos.',
          'Static SPA served by nginx on your Coolify VPS. All state in the browser: nothing shared across devices.',
          'SPA statique servie par nginx sur votre VPS Coolify. Tout l’état dans le navigateur : rien de partagé entre appareils.',
        ),
        spec: 'Static single-page app, no server and no database',
        notes: ['No backend: all state lives in the browser, so every feature must survive a hard refresh and a cleared storage.'],
      },
      {
        id: 'stack-api-only',
        label: L('Solo API, sin interfaz', 'API only, no interface', 'API seule, sans interface'),
        description: L(
          'Servicio HTTP en tu VPS con Coolify, para workers, webhooks o integraciones internas.',
          'HTTP service on your Coolify VPS, for workers, webhooks or internal integrations.',
          'Service HTTP sur votre VPS Coolify, pour workers, webhooks ou intégrations internes.',
        ),
        spec: 'Headless HTTP service, no user interface',
      },
    ],
  },

  {
    id: 'frontend',
    title: 'Frontend',
    question: L('¿Qué lleva el frontend?', 'What goes into the frontend?', 'Que contient le frontend ?'),
    help: L(
      'La base es fija. Marca sólo los extras que vayas a usar de verdad.',
      'The baseline is fixed. Only tick the extras you will actually use.',
      'Le socle est fixe. Ne cochez que les extras que vous utiliserez vraiment.',
    ),
    mode: 'multi',
    visibleIf: hasUi,
    options: [
      {
        id: 'fe-react-vite',
        label: 'React 19 + Vite 5',
        description: L(
          'SPA con react-router-dom v6, TypeScript strict y alias @/* → src/*.',
          'SPA with react-router-dom v6, strict TypeScript and the @/* → src/* alias.',
          'SPA avec react-router-dom v6, TypeScript strict et l’alias @/* → src/*.',
        ),
        spec: 'React 19 + Vite 5 SPA with react-router-dom v6',
        locked: true,
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
        id: 'ui-tailwind4',
        label: L('Tailwind 4 + shadcn/ui', 'Tailwind 4 + shadcn/ui', 'Tailwind 4 + shadcn/ui'),
        description: L(
          'Tailwind configurado con @theme en src/index.css, componentes shadcn (New York) e iconos lucide.',
          'Tailwind configured with @theme in src/index.css, shadcn (New York) components and lucide icons.',
          'Tailwind configuré avec @theme dans src/index.css, composants shadcn (New York) et icônes lucide.',
        ),
        spec: 'Tailwind CSS 4 (configured via `@theme` in `src/index.css`) with shadcn/ui New York components and lucide-react icons',
        locked: true,
        deps: {
          frontend: ['class-variance-authority', 'clsx', 'tailwind-merge', '@radix-ui/react-slot', 'lucide-react'],
          frontendDev: ['tailwindcss', '@tailwindcss/vite'],
        },
        gotchas: ['tailwind4-theme'],
      },
      {
        id: 'ui-forms',
        label: L('Formularios (react-hook-form + zod)', 'Forms (react-hook-form + zod)', 'Formulaires (react-hook-form + zod)'),
        description: L(
          'Para cualquier formulario más allá de un campo suelto. El schema zod se comparte con la API.',
          'For any form beyond a single field. The zod schema is shared with the API.',
          'Pour tout formulaire au-delà d’un champ isolé. Le schéma zod est partagé avec l’API.',
        ),
        spec: 'react-hook-form + zod, with the schemas shared between client and API',
        recommended: true,
        deps: { frontend: ['react-hook-form', 'zod', '@hookform/resolvers'] },
      },
      {
        id: 'ui-query',
        label: L('Caché de datos (TanStack Query)', 'Data cache (TanStack Query)', 'Cache de données (TanStack Query)'),
        description: L(
          'Si la app lee datos del servidor en varias pantallas: caché, reintentos y estados de carga.',
          'If the app reads server data on several screens: caching, retries and loading states.',
          'Si l’app lit des données serveur sur plusieurs écrans : cache, réessais et états de chargement.',
        ),
        spec: 'TanStack Query for server state, caching and retries',
        recommended: true,
        deps: { frontend: ['@tanstack/react-query'] },
      },
      {
        id: 'ui-sonner',
        label: L('Notificaciones (sonner)', 'Toasts (sonner)', 'Notifications (sonner)'),
        description: L(
          'Avisos de éxito y error. Un único <Toaster /> en el layout raíz.',
          'Success and error feedback. A single <Toaster /> in the root layout.',
          'Retours de succès et d’erreur. Un seul <Toaster /> dans le layout racine.',
        ),
        spec: 'sonner for toasts (a single <Toaster /> in the root layout)',
        recommended: true,
        deps: { frontend: ['sonner'] },
      },
      {
        id: 'ui-i18n',
        label: L('Multiidioma (i18next)', 'Multi-language (i18next)', 'Multilingue (i18next)'),
        description: L(
          'Sólo si la interfaz va en más de un idioma. Los identificadores del código siguen en inglés.',
          'Only if the interface ships in more than one language. Code identifiers stay in English.',
          'Uniquement si l’interface existe en plusieurs langues. Les identifiants du code restent en anglais.',
        ),
        spec: 'i18next for UI copy (identifiers and comments stay in English)',
        deps: { frontend: ['i18next', 'react-i18next'] },
      },
      {
        id: 'ui-charts',
        label: L('Gráficas (Recharts)', 'Charts (Recharts)', 'Graphiques (Recharts)'),
        description: L(
          'Sólo si hay dashboard o métricas.',
          'Only if there is a dashboard or metrics.',
          'Uniquement s’il y a un tableau de bord ou des métriques.',
        ),
        spec: 'Recharts for dashboard charts',
        deps: { frontend: ['recharts'] },
      },
      {
        id: 'ui-markdown',
        label: L('Render de markdown', 'Markdown rendering', 'Rendu markdown'),
        description: L(
          'Para respuestas de LLM o contenido editorial. Siempre saneado con rehype-sanitize.',
          'For LLM answers or editorial content. Always sanitized with rehype-sanitize.',
          'Pour les réponses de LLM ou du contenu éditorial. Toujours assaini via rehype-sanitize.',
        ),
        spec: 'react-markdown with rehype-sanitize (untrusted markdown is always sanitized)',
        deps: { frontend: ['react-markdown', 'remark-gfm', 'rehype-raw', 'rehype-sanitize'] },
      },
    ],
  },

  {
    id: 'supabase',
    title: 'Supabase',
    question: L('¿Qué usas de Supabase?', 'Which Supabase features do you use?', 'Quelles fonctionnalités Supabase utilisez-vous ?'),
    help: L(
      'El cliente y Postgres vienen siempre. Lo demás se activa por proyecto.',
      'The client and Postgres always come along. The rest is enabled per project.',
      'Le client et Postgres sont toujours inclus. Le reste s’active par projet.',
    ),
    mode: 'multi',
    visibleIf: isSupabase,
    options: [
      {
        id: 'sb-core',
        label: L('Postgres + cliente JS', 'Postgres + JS client', 'Postgres + client JS'),
        description: L(
          'supabase-js en el frontend, migraciones SQL versionadas en supabase/migrations/.',
          'supabase-js in the frontend, SQL migrations versioned in supabase/migrations/.',
          'supabase-js dans le frontend, migrations SQL versionnées dans supabase/migrations/.',
        ),
        spec: 'Supabase Postgres accessed from the browser with supabase-js',
        locked: true,
        deps: { frontend: ['@supabase/supabase-js'] },
        env: [
          { key: 'VITE_SUPABASE_URL', comment: 'public — inlined into the bundle at build time' },
          { key: 'VITE_SUPABASE_ANON_KEY', comment: 'public by design; RLS is what actually protects the data' },
        ],
        gotchas: ['supabase-anon-key'],
        tasks: [
          'Create the Supabase project and put the schema in `supabase/migrations/` — never edit tables only through the dashboard, or the repo stops describing production.',
        ],
      },
      {
        id: 'sb-rls',
        label: L('Row Level Security', 'Row Level Security', 'Row Level Security'),
        description: L(
          'Políticas por fila. Sin esto cualquiera con la anon key lee toda la tabla.',
          'Per-row policies. Without them, anyone holding the anon key reads the whole table.',
          'Politiques par ligne. Sans elles, quiconque possède la clé anon lit toute la table.',
        ),
        spec: 'Row Level Security policies on every table (the only real access control in this architecture)',
        recommended: true,
        gotchas: ['supabase-rls'],
        tasks: [
          'Enable RLS on every table and write an explicit policy per operation. A table without a policy is either fully public or fully unreadable — both are bugs.',
        ],
      },
      {
        id: 'sb-auth',
        label: L('Supabase Auth', 'Supabase Auth', 'Supabase Auth'),
        description: L(
          'Email/contraseña y OAuth. La sesión la gestiona supabase-js en el navegador.',
          'Email/password and OAuth. supabase-js manages the session in the browser.',
          'E-mail/mot de passe et OAuth. supabase-js gère la session dans le navigateur.',
        ),
        spec: 'Supabase Auth for email/password and OAuth sign-in',
        recommended: true,
        tasks: ['Wire Supabase Auth and derive every RLS policy from `auth.uid()`.'],
      },
      {
        id: 'sb-storage',
        label: L('Supabase Storage', 'Supabase Storage', 'Supabase Storage'),
        description: L(
          'Buckets para ficheros, con sus propias políticas de acceso.',
          'Buckets for files, with their own access policies.',
          'Buckets pour les fichiers, avec leurs propres politiques d’accès.',
        ),
        spec: 'Supabase Storage buckets for file uploads, with bucket policies',
      },
      {
        id: 'sb-vector',
        label: L('Búsqueda vectorial (RAG)', 'Vector search (RAG)', 'Recherche vectorielle (RAG)'),
        description: L(
          'Extensión pgvector activada en el proyecto, para búsqueda por embeddings.',
          'The pgvector extension enabled on the project, for embedding search.',
          'L’extension pgvector activée sur le projet, pour la recherche par embeddings.',
        ),
        spec: 'pgvector enabled on the Supabase project for embedding search',
      },
      {
        id: 'sb-realtime',
        label: L('Realtime', 'Realtime', 'Temps réel'),
        description: L(
          'Suscripciones a cambios de tabla. Sólo si varias personas ven la misma pantalla a la vez.',
          'Subscriptions to table changes. Only if several people watch the same screen at once.',
          'Abonnements aux changements de table. Uniquement si plusieurs personnes voient le même écran.',
        ),
        spec: 'Supabase Realtime subscriptions for live table updates',
      },
    ],
  },

  {
    id: 'backend',
    title: 'API',
    question: L('¿Qué lleva la API?', 'What goes into the API?', 'Que contient l’API ?'),
    help: L(
      'Express + TypeScript es fijo. Marca los módulos que necesites.',
      'Express + TypeScript is fixed. Tick the modules you need.',
      'Express + TypeScript est fixe. Cochez les modules nécessaires.',
    ),
    mode: 'multi',
    visibleIf: hasOwnApi,
    options: [
      {
        id: 'backend-express',
        label: 'Express 4 + TypeScript',
        description: L(
          'Un router por dominio, validación zod en el borde, error handler central. ts-node-dev en dev, dist/ en prod.',
          'One router per domain, zod validation at the edge, one central error handler. ts-node-dev in dev, dist/ in prod.',
          'Un routeur par domaine, validation zod en bordure, gestionnaire d’erreurs central. ts-node-dev en dev, dist/ en prod.',
        ),
        spec: 'Express 4 + TypeScript API (ts-node-dev in dev, compiled to dist/ in prod)',
        locked: true,
        services: ['backend'],
        deps: {
          backend: ['express', 'cors', 'dotenv', 'zod'],
          backendDev: ['typescript', 'ts-node-dev', '@types/express', '@types/cors', '@types/node'],
        },
        env: [{ key: 'PORT', value: '3000' }],
        gotchas: ['ts-node-dev-windows', 'coolify-healthcheck'],
        tasks: [
          'Build the API: one router per domain under `src/routes/`, zod validation at the edge, one centralised error handler.',
          'Expose `/api/health/live` (no database access) and `/api/health/ready` (checks dependencies).',
          'Handle SIGTERM: stop accepting connections, drain in-flight work, then exit.',
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
        id: 'feat-email',
        label: L('Emails transaccionales', 'Transactional email', 'E-mails transactionnels'),
        description: L(
          'Microservicio aparte (SendGrid) con secreto compartido; la API nunca habla con el proveedor.',
          'A separate microservice (SendGrid) behind a shared secret; the API never talks to the provider.',
          'Un microservice séparé (SendGrid) avec un secret partagé ; l’API ne parle jamais au fournisseur.',
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
        id: 'feat-jobs',
        label: L('Trabajos en segundo plano', 'Background jobs', 'Tâches de fond'),
        description: L(
          'Cola en proceso con límite de concurrencia explícito, para trabajo largo (parseo, embeddings).',
          'In-process queue with an explicit concurrency cap, for long work (parsing, embeddings).',
          'File en processus avec limite de concurrence explicite, pour les traitements longs (parsing, embeddings).',
        ),
        spec: 'In-process background jobs with an explicit concurrency cap',
        env: [{ key: 'MAX_CONCURRENT_JOBS', value: '2' }],
        notes: [
          'The concurrency cap exists to protect container memory: raising it is the fastest route back to OOM kills.',
        ],
      },
      {
        id: 'feat-swagger',
        label: L('Documentación OpenAPI', 'OpenAPI docs', 'Documentation OpenAPI'),
        description: L(
          'Generada desde comentarios JSDoc, servida en /api/docs.',
          'Generated from JSDoc comments, served at /api/docs.',
          'Générée depuis les commentaires JSDoc, servie sur /api/docs.',
        ),
        spec: 'OpenAPI docs generated from JSDoc comments, served at /api/docs',
        deps: { backend: ['swagger-jsdoc', 'swagger-ui-express'] },
        gotchas: ['swagger-enomem'],
      },
      {
        id: 'feat-public-api',
        label: L('API pública con token', 'Public API with a token', 'API publique avec jeton'),
        description: L(
          'Superficie separada para integraciones máquina-a-máquina, con su propio Bearer estático.',
          'A separate surface for machine-to-machine integrations, with its own static bearer token.',
          'Une surface distincte pour les intégrations machine-à-machine, avec son propre jeton statique.',
        ),
        spec: 'A separate public REST surface authenticated with a static bearer token',
        env: [{ key: 'API_BEARER_TOKEN', secret: true }],
      },
    ],
  },

  {
    id: 'ai-provider',
    title: 'IA',
    question: L('¿Cómo llamas a los modelos?', 'How do you call the models?', 'Comment appelez-vous les modèles ?'),
    help: L(
      'Sea cual sea la opción, la clave vive sólo en el backend y el modelo es configurable, no está en el código.',
      'Whichever you pick, the key lives only in the backend and the model is configuration, not code.',
      'Quel que soit le choix, la clé ne vit que côté backend et le modèle est une configuration, pas du code.',
    ),
    mode: 'single',
    visibleIf: (sel) => has(sel, 'feat-ai'),
    options: [
      {
        id: 'ai-openrouter',
        label: L('OpenRouter (una sola clave)', 'OpenRouter (one key)', 'OpenRouter (une seule clé)'),
        description: L(
          'Una clave y una API para todos los modelos: cambias de proveedor tocando un string. Ideal para empezar y para comparar precios.',
          'One key and one API for every model: switching provider is a string change. Best for starting out and comparing prices.',
          'Une clé et une API pour tous les modèles : changer de fournisseur revient à changer une chaîne. Idéal pour démarrer.',
        ),
        spec: 'OpenRouter as a single gateway to every model (one API key, model selected by id)',
        recommended: true,
        deps: { backend: ['openai'] },
        env: [
          { key: 'OPENROUTER_API_KEY', secret: true },
          { key: 'LLM_MODEL', value: 'openai/gpt-4o-mini' },
        ],
        notes: [
          'OpenRouter speaks the OpenAI protocol, so the official `openai` SDK works by pointing `baseURL` at it. Model ids are `vendor/model`.',
        ],
        tasks: [
          'Route every model call through one provider module so the model id, the timeout and the retry policy live in a single place.',
        ],
      },
      {
        id: 'ai-direct',
        label: L('SDKs directos del proveedor', 'Direct provider SDKs', 'SDK directs du fournisseur'),
        description: L(
          'Anthropic y/u OpenAI con su SDK oficial: acceso a features propias (caché de prompt, tool use avanzado) y una clave por proveedor.',
          'Anthropic and/or OpenAI with their official SDK: access to provider-specific features (prompt caching, advanced tool use) and one key per provider.',
          'Anthropic et/ou OpenAI avec leur SDK officiel : accès aux fonctionnalités propres (cache de prompt, tool use avancé) et une clé par fournisseur.',
        ),
        spec: 'Direct provider SDKs (@anthropic-ai/sdk, openai) behind one internal provider interface',
        deps: { backend: ['@anthropic-ai/sdk', 'openai'] },
        env: [
          { key: 'ANTHROPIC_API_KEY', secret: true },
          { key: 'OPENAI_API_KEY', secret: true },
          { key: 'LLM_MODEL', value: 'claude-sonnet-5' },
        ],
        notes: [
          'Keep the provider behind one internal interface even with a single vendor: the abstraction resolves DB override → env var → driver default, which is what makes swapping models a config change.',
        ],
      },
      {
        id: 'ai-local',
        label: L('Modelo local (Ollama)', 'Local model (Ollama)', 'Modèle local (Ollama)'),
        description: L(
          'Sin coste por token y sin datos fuera, pero necesita mucha RAM/GPU en el VPS. Compruébalo antes de elegirlo.',
          'No per-token cost and no data leaving the box, but it needs serious RAM/GPU on the VPS. Check that first.',
          'Aucun coût par token et aucune donnée qui sort, mais il faut beaucoup de RAM/GPU sur le VPS. À vérifier d’abord.',
        ),
        spec: 'Self-hosted models through Ollama on the same host',
        env: [
          { key: 'OLLAMA_URL', value: 'http://ollama:11434' },
          { key: 'LLM_MODEL', value: 'llama3.1' },
        ],
        notes: [
          'Ollama needs its own memory budget on the host; size it against the same cgroup limits as every other service or it will OOM its neighbours.',
        ],
      },
    ],
  },

  {
    id: 'ai-capabilities',
    title: L('Capacidades IA', 'AI capabilities', 'Capacités IA'),
    question: L('¿Para qué la usas?', 'What do you use it for?', 'Pour quoi l’utilisez-vous ?'),
    mode: 'multi',
    visibleIf: (sel) => has(sel, 'feat-ai'),
    options: [
      {
        id: 'ai-chat',
        label: L('Chat / generación de texto', 'Chat / text generation', 'Chat / génération de texte'),
        description: L(
          'Respuestas en streaming. Ojo con el timeout de nginx: 60s por defecto mata la petición.',
          'Streamed answers. Mind the nginx timeout: the 60s default kills the request.',
          'Réponses en streaming. Attention au timeout nginx : les 60s par défaut tuent la requête.',
        ),
        spec: 'Streaming chat / text generation endpoints',
        recommended: true,
        gotchas: ['ai-timeouts'],
      },
      {
        id: 'ai-embeddings',
        label: L('Embeddings (búsqueda semántica)', 'Embeddings (semantic search)', 'Embeddings (recherche sémantique)'),
        description: L(
          'Requiere una base vectorial: marca la búsqueda vectorial en el paso de datos.',
          'Needs a vector store: tick vector search in the data step.',
          'Nécessite un stockage vectoriel : cochez la recherche vectorielle à l’étape données.',
        ),
        spec: 'Embedding generation for semantic search',
        env: [{ key: 'EMBEDDING_MODEL', value: 'openai/text-embedding-3-small' }],
        notes: [
          'Store the embedding model id next to every vector: re-indexing with a different model silently degrades search until everything is regenerated.',
        ],
      },
      {
        id: 'ai-parsing',
        label: L('Parseo / OCR de documentos', 'Document parsing / OCR', 'Parsing / OCR de documents'),
        description: L(
          'PDFs y escaneados a texto. Es lo que más memoria consume del contenedor.',
          'PDFs and scans into text. This is the biggest consumer of container memory.',
          'PDF et scans convertis en texte. C’est ce qui consomme le plus de mémoire du conteneur.',
        ),
        spec: 'Document parsing / OCR pipeline',
        env: [{ key: 'DATALAB_API_KEY', secret: true }],
        notes: [
          'Parsing holds the whole document in memory and base64 re-encoding adds ~33% on top. Cap how many documents may be parsed at once and keep the V8 heap below the container limit.',
        ],
      },
    ],
  },

  {
    id: 'database',
    title: L('Datos', 'Data', 'Données'),
    question: L('¿Cómo guarda los datos?', 'How does it store data?', 'Comment stocke-t-il les données ?'),
    help: L(
      'PostgreSQL + Prisma es la base del stack. Añade la extensión vectorial sólo si vas a hacer RAG.',
      'PostgreSQL + Prisma is the stack baseline. Add the vector extension only if you are doing RAG.',
      'PostgreSQL + Prisma est le socle du stack. N’ajoutez l’extension vectorielle que pour du RAG.',
    ),
    mode: 'multi',
    visibleIf: hasOwnApi,
    options: [
      {
        id: 'db-postgres-prisma',
        label: 'PostgreSQL 16 + Prisma',
        description: L(
          'Esquema en prisma/schema.prisma, cambios aplicados con db push. Nunca migrate reset.',
          'Schema in prisma/schema.prisma, changes applied with db push. Never migrate reset.',
          'Schéma dans prisma/schema.prisma, changements appliqués avec db push. Jamais migrate reset.',
        ),
        spec: 'PostgreSQL 16 with Prisma (schema changes applied with `prisma db push`)',
        locked: true,
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
        id: 'db-pgvector',
        label: L('Búsqueda vectorial (RAG)', 'Vector search (RAG)', 'Recherche vectorielle (RAG)'),
        description: L(
          'Cambia la imagen a pgvector/pgvector:pg16 y añade columnas vector + funciones de búsqueda por SQL crudo.',
          'Switches the image to pgvector/pgvector:pg16 and adds vector columns + search functions via raw SQL.',
          'Bascule l’image sur pgvector/pgvector:pg16 et ajoute colonnes vector + fonctions de recherche en SQL brut.',
        ),
        spec: 'pgvector on top of PostgreSQL for embedding search',
        gotchas: ['sql-array-literal'],
        notes: [
          '`vector(N)` columns cannot be expressed in Prisma, so they are created from raw SQL in the seed, together with the search functions.',
        ],
        tasks: [
          'Create the vector columns and the similarity-search SQL functions from the seed script, not from a Prisma migration.',
        ],
      },
    ],
  },

  {
    id: 'auth',
    title: L('Acceso', 'Access', 'Accès'),
    question: L('¿Quién puede entrar?', 'Who can get in?', 'Qui peut entrer ?'),
    help: L(
      'Déjalo todo sin marcar si es una herramienta interna sin login.',
      'Leave everything unticked for an internal tool with no login.',
      'Ne cochez rien pour un outil interne sans connexion.',
    ),
    mode: 'multi',
    visibleIf: hasOwnApi,
    options: [
      {
        id: 'auth-better-auth-jwt',
        label: L('Login con email y contraseña', 'Email and password login', 'Connexion par e-mail et mot de passe'),
        description: L(
          'Better Auth crea la sesión por cookie; la app emite desde ella un JWT para las llamadas a la API.',
          'Better Auth creates the cookie session; the app mints a JWT from it for API calls.',
          'Better Auth crée la session par cookie ; l’app en dérive un JWT pour les appels API.',
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
        id: 'rbac-simple',
        label: L('Roles y permisos', 'Roles and permissions', 'Rôles et permissions'),
        description: L(
          'Tabla de perfiles (admin | contributor | reviewer) y un guard en todas las rutas. Sin esto, todos ven lo mismo.',
          'A profile table (admin | contributor | reviewer) and a guard on every route. Without it, everyone sees the same.',
          'Une table de profils (admin | contributor | reviewer) et un garde sur chaque route. Sans cela, tous voient la même chose.',
        ),
        spec: 'Role-based access control: a profile table (admin | contributor | reviewer) and a guard middleware',
        recommended: true,
        requires: ['auth-better-auth-jwt'],
        tasks: [
          "Add the role guard and apply it to EVERY business route; auto-provision the lowest role on a user's first request.",
        ],
      },
    ],
  },

  {
    id: 'storage',
    title: L('Ficheros', 'Files', 'Fichiers'),
    question: L('¿La app maneja ficheros?', 'Does the app handle files?', 'L’app gère-t-elle des fichiers ?'),
    help: L(
      'Déjalo sin marcar si sólo maneja datos.',
      'Leave it unticked if it only handles data.',
      'Ne cochez rien si elle ne gère que des données.',
    ),
    mode: 'multi',
    visibleIf: hasOwnApi,
    options: [
      {
        id: 'storage-minio',
        label: L('Almacenamiento de objetos (MinIO)', 'Object storage (MinIO)', 'Stockage d’objets (MinIO)'),
        description: L(
          'S3 autohospedado en el mismo VPS. Un contenedor más, sin coste por uso.',
          'Self-hosted S3 on the same VPS. One more container, no usage billing.',
          'S3 auto-hébergé sur le même VPS. Un conteneur de plus, sans facturation à l’usage.',
        ),
        spec: 'MinIO for object storage (S3-compatible, self-hosted alongside the app)',
        recommended: true,
        services: ['minio'],
        deps: {
          backend: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
        },
        env: [
          { key: 'MINIO_ROOT_USER', value: 'minioadmin' },
          { key: 'MINIO_ROOT_PASSWORD', secret: true },
          { key: 'MINIO_ENDPOINT', value: 'http://minio:9000', comment: 'internal network — server-side operations' },
          { key: 'MINIO_PUBLIC_URL', value: 'http://127.0.0.1:9000', comment: 'browser-facing host — used to sign URLs' },
          { key: 'MINIO_BUCKET', value: 'app-files' },
        ],
        gotchas: ['minio-two-clients'],
      },
      {
        id: 'feat-uploads',
        label: L('Subida desde el navegador', 'Browser uploads', 'Téléversement depuis le navigateur'),
        description: L(
          'Endpoint multipart proxeado por la API (multer en memoria), con el mismo límite en nginx.',
          'A multipart endpoint proxied through the API (multer in memory), with a matching nginx limit.',
          'Un endpoint multipart relayé par l’API (multer en mémoire), avec la même limite dans nginx.',
        ),
        spec: 'File uploads proxied through the API (multer memoryStorage)',
        recommended: true,
        requires: ['storage-minio'],
        deps: { backend: ['multer'], backendDev: ['@types/multer'] },
        gotchas: ['upload-proxy'],
      },
    ],
  },

  {
    id: 'infra',
    title: L('Despliegue', 'Deployment', 'Déploiement'),
    question: L('¿Cómo se ejecuta y se despliega?', 'How does it run and deploy?', 'Comment s’exécute et se déploie-t-il ?'),
    help: L(
      'Docker en local y Coolify en producción son fijos: es el entorno donde ya sabemos que funciona.',
      'Docker locally and Coolify in production are fixed: it is the environment we already know works.',
      'Docker en local et Coolify en production sont fixes : c’est l’environnement que nous maîtrisons.',
    ),
    mode: 'multi',
    options: [
      {
        id: 'infra-compose-dev',
        label: L('Docker Compose en local', 'Docker Compose locally', 'Docker Compose en local'),
        description: L(
          'Todo el stack con bind mounts y recarga en caliente, arrancable con un solo comando.',
          'The whole stack with bind mounts and hot reload, started with one command.',
          'Tout le stack avec bind mounts et rechargement à chaud, démarré en une commande.',
        ),
        spec: 'Local docker compose stack with bind mounts and hot reload',
        locked: true,
        gotchas: ['compose-project-name', 'windows-127001'],
      },
      {
        id: 'infra-nginx',
        label: L('nginx como única puerta', 'nginx as the single door', 'nginx comme porte unique'),
        description: L(
          'Sirve el frontend y proxea /api/*. Es el único servicio con puertos publicados.',
          'Serves the frontend and proxies /api/*. The only service with published ports.',
          'Sert le frontend et relaie /api/*. Le seul service avec des ports publiés.',
        ),
        spec: 'nginx as the single published entrypoint (serves the static bundle, and proxies /api/* when there is an API)',
        locked: true,
        services: ['nginx'],
        gotchas: ['nginx-single-entry'],
      },
      {
        id: 'infra-coolify',
        label: L('Producción en Coolify', 'Production on Coolify', 'Production sur Coolify'),
        description: L(
          'Compose e imágenes de producción con los límites de memoria, healthchecks y rotación de logs ya puestos.',
          'Production compose and images with memory limits, healthchecks and log rotation already in place.',
          'Compose et images de production avec limites mémoire, healthchecks et rotation des logs déjà en place.',
        ),
        spec: 'Production deployment on Coolify (multi-stage images, compose file with no custom networks)',
        locked: true,
        // coolify-healthcheck rides on the API option instead: a stack whose
        // only container is nginx has no startup sequence to get wrong.
        gotchas: ['coolify-no-networks', 'coolify-memory', 'coolify-logging', 'coolify-build-args'],
        tasks: [
          'Deploy on Coolify: point the resource at `docker-compose.coolify.yml`, set the domain on the nginx service, and paste the env vars into the UI.',
        ],
      },
      {
        id: 'infra-ci',
        label: 'GitHub Actions',
        description: L(
          'Typecheck y build en cada push. Recomendable en cuanto haya más de una persona.',
          'Typecheck and build on every push. Worth it as soon as more than one person commits.',
          'Typecheck et build à chaque push. Utile dès que plusieurs personnes commitent.',
        ),
        spec: 'GitHub Actions running typecheck and build on every push',
        recommended: true,
      },
    ],
  },

  {
    id: 'quality',
    title: L('Calidad', 'Quality', 'Qualité'),
    question: L(
      '¿Qué disciplina impongo en las instrucciones?',
      'Which discipline should the instructions enforce?',
      'Quelle discipline les instructions doivent-elles imposer ?',
    ),
    help: L(
      'Va todo al CLAUDE.md del proyecto nuevo, así que el agente lo respeta desde el primer commit.',
      'This all lands in the new project\'s CLAUDE.md, so the agent honours it from the first commit.',
      'Tout cela atterrit dans le CLAUDE.md du nouveau projet, respecté dès le premier commit.',
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
        locked: true,
      },
      {
        id: 'q-english-code',
        label: L('Código en inglés', 'Code in English', 'Code en anglais'),
        description: L(
          'Identificadores, comentarios y commits en inglés; la interfaz puede ir en otro idioma.',
          'Identifiers, comments and commits in English; the UI may be localised.',
          'Identifiants, commentaires et commits en anglais ; l’interface peut être localisée.',
        ),
        spec: 'Code, comments and commits in English; UI strings may be localised',
        locked: true,
      },
      {
        id: 'q-vitest',
        label: 'Vitest',
        description: L(
          'Tests unitarios y de integración. Cada bug se arregla con el test que lo reproduce.',
          'Unit and integration tests. Every bug is fixed together with the test that reproduces it.',
          'Tests unitaires et d’intégration. Chaque bug est corrigé avec le test qui le reproduit.',
        ),
        spec: 'Vitest for unit and integration tests (supertest for the API, Testing Library for the UI)',
        recommended: true,
        deps: { frontendDev: ['vitest'], backendDev: ['vitest', 'supertest'] },
      },
      {
        id: 'q-eslint',
        label: 'ESLint',
        description: L(
          'eslint + @typescript-eslint, cero warnings antes de commitear.',
          'eslint + @typescript-eslint, zero warnings before committing.',
          'eslint + @typescript-eslint, zéro avertissement avant de commiter.',
        ),
        spec: 'ESLint with @typescript-eslint, zero warnings allowed',
        deps: { frontendDev: ['eslint', '@typescript-eslint/eslint-plugin', '@typescript-eslint/parser'] },
      },
      {
        id: 'q-conventional',
        label: 'Conventional commits',
        description: L(
          'feat:, fix:, chore: … con alcance.',
          'feat:, fix:, chore: … with a scope.',
          'feat:, fix:, chore: … avec une portée.',
        ),
        spec: 'Conventional commits',
      },
    ],
  },
];

export const STEP_IDS = STEPS.map((s) => s.id);

export function visibleSteps(sel: Selection): Step[] {
  return STEPS.filter((s) => !s.visibleIf || s.visibleIf(sel));
}
