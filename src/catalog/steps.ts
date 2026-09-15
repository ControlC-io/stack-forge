import type { I18nText } from '@/i18n';
import type { Selection, Step } from './types';
import { has } from './types';

/**
 * The decision tree.
 *
 * Three ideas keep this short:
 *
 *  - Everything ControlC has already decided lives in `baseline` steps. Their
 *    options are locked and the wizard never shows them as a screen: nobody
 *    should have to confirm React, Tailwind or Coolify for every new project.
 *  - The first question (`stack`) is the high-level branch. Everything below it
 *    is pruned by `visibleIf`: pick Supabase and the API questions disappear,
 *    because Supabase already answers them.
 *  - Follow-up questions only appear when they matter (the AI provider only
 *    exists once the app needs AI).
 *
 * `label`/`description`/`title`/`question` are UI copy and are translated.
 * `spec`/`notes`/`tasks` end up in the generated files and are English only.
 */

/** Shorthand for a translated string. Product names stay plain strings. */
const L = (es: string, en: string, fr: string): I18nText => ({ es, en, fr });

const isSupabase = (sel: Selection) => has(sel, 'stack-supabase');
const hasOwnApi = (sel: Selection) => has(sel, 'stack-fullstack');
const hasAi = (sel: Selection) => has(sel, 'feat-ai');

export const STEPS: Step[] = [
  {
    id: 'stack',
    why: L(
      'Decide qué servicios, ficheros de Docker y reglas se generan. Cambiarlo después obliga a rehacer la base del proyecto.',
      'It decides which services, Docker files and rules get generated. Changing it later means rebuilding the foundation of the project.',
      'Il détermine les services, fichiers Docker et règles générés. En changer plus tard oblige à refaire la base du projet.',
    ),
    title: L('Tipo de app', 'App type', 'Type d’app'),
    question: L('¿Qué tipo de app vas a construir?', 'What kind of app are you building?', 'Quel type d’app construisez-vous ?'),
    help: L(
      'Todas llevan la base de ControlC: React 19 + Vite, Tailwind 4 + shadcn, TypeScript strict, Vitest, ESLint y despliegue en Coolify.',
      'Every option ships the ControlC baseline: React 19 + Vite, Tailwind 4 + shadcn, strict TypeScript, Vitest, ESLint and a Coolify deployment.',
      'Toutes incluent le socle ControlC : React 19 + Vite, Tailwind 4 + shadcn, TypeScript strict, Vitest, ESLint et un déploiement Coolify.',
    ),
    mode: 'single',
    options: [
      {
        id: 'stack-fullstack',
        label: L('App completa (API propia)', 'Full app (own API)', 'App complète (API propre)'),
        description: L(
          'Express + Prisma + PostgreSQL en Docker detrás de nginx. El stack de la mayoría de proyectos de ControlC.',
          'Express + Prisma + PostgreSQL in Docker behind nginx. The stack most ControlC projects run on.',
          'Express + Prisma + PostgreSQL dans Docker derrière nginx. Le stack de la plupart des projets ControlC.',
        ),
        // No component list here: each one is its own line further down, and
        // naming them twice risks describing a service the user turned off.
        why: L(
          'Elígela si la app guarda datos propios, tiene lógica de negocio o habla con otros sistemas. Genera API, base de datos y compose con límites de memoria.',
          'Pick it if the app stores its own data, has business logic or talks to other systems. It generates the API, the database and a compose file with memory limits.',
          'À choisir si l’app stocke ses propres données, a de la logique métier ou parle à d’autres systèmes. Génère API, base de données et compose avec limites mémoire.',
        ),
        spec: 'A self-hosted stack: your own API and database in Docker behind nginx, deployed on Coolify',
        recommended: true,
      },
      {
        id: 'stack-supabase',
        label: 'Supabase',
        description: L(
          'Postgres, Auth y Storage gestionados; el frontend habla directo con Supabase. Como tslux o el ERP.',
          'Managed Postgres, Auth and Storage; the frontend talks to Supabase directly. Like tslux or the ERP.',
          'Postgres, Auth et Storage managés ; le frontend parle directement à Supabase. Comme tslux ou l’ERP.',
        ),
        why: L(
          'Útil cuando el cliente ya usa Supabase o la app es CRUD sin lógica pesada. La seguridad pasa a depender de RLS.',
          'Useful when the client already uses Supabase or the app is CRUD with no heavy logic. Security then depends on RLS.',
          'Utile si le client utilise déjà Supabase ou si l’app est un CRUD sans logique lourde. La sécurité repose alors sur RLS.',
        ),
        spec: 'Supabase as the backend (managed Postgres, Auth and Storage); the frontend talks to it directly',
      },
      {
        id: 'stack-static',
        label: L('Solo frontend', 'Frontend only', 'Frontend seul'),
        description: L(
          'SPA estática servida por nginx. Sin base de datos: el estado vive en el navegador.',
          'Static SPA served by nginx. No database: state lives in the browser.',
          'SPA statique servie par nginx. Sans base de données : l’état vit dans le navigateur.',
        ),
        why: L(
          'Para landings, demos o herramientas que no comparten datos. Solo se genera nginx: nada de base de datos ni API.',
          'For landing pages, demos or tools that share no data. Only nginx is generated: no database, no API.',
          'Pour landings, démos ou outils sans données partagées. Seul nginx est généré : ni base de données ni API.',
        ),
        spec: 'Static single-page app, no server and no database',
        notes: ['No backend: all state lives in the browser, so every feature must survive a hard refresh and a cleared storage.'],
      },
    ],
  },

  {
    id: 'features',
    why: L(
      'Cada función añade su servicio, sus variables de entorno y sus trampas conocidas. Lo que no marques no aparece en el prompt, así el agente no construye cosas que no necesitas.',
      'Each feature adds its service, env vars and known traps. Anything unticked stays out of the prompt, so the agent does not build what you do not need.',
      'Chaque fonction ajoute son service, ses variables d’environnement et ses pièges connus. Ce qui n’est pas coché reste hors du prompt : l’agent ne construit pas l’inutile.',
    ),
    title: L('Funciones', 'Features', 'Fonctions'),
    question: L('¿Qué necesita la app?', 'What does the app need?', 'De quoi l’app a-t-elle besoin ?'),
    help: L(
      'Marca sólo lo que vaya a usar de verdad. Cada casilla añade servicios, variables de entorno y trampas conocidas al resultado.',
      'Only tick what it will actually use. Each box adds services, env vars and known traps to the output.',
      'Ne cochez que ce qui sera vraiment utilisé. Chaque case ajoute services, variables d’environnement et pièges connus.',
    ),
    mode: 'multi',
    visibleIf: hasOwnApi,
    options: [
      {
        id: 'auth-better-auth-jwt',
        label: L('Login de usuarios', 'User login', 'Connexion des utilisateurs'),
        description: L(
          'Email y contraseña con Better Auth; la app emite un JWT para las llamadas a la API.',
          'Email and password with Better Auth; the app mints a JWT for API calls.',
          'E-mail et mot de passe avec Better Auth ; l’app émet un JWT pour les appels API.',
        ),
        why: L(
          'Sin login cualquiera con la URL ve los datos. Better Auth es lo que usan los demás proyectos, y el prompt incluye la trampa de scrypt frente a bcrypt.',
          'Without login anyone with the URL sees the data. Better Auth is what the other projects use, and the prompt includes the scrypt vs bcrypt trap.',
          'Sans connexion, quiconque a l’URL voit les données. Better Auth est ce qu’utilisent les autres projets, et le prompt inclut le piège scrypt vs bcrypt.',
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
          'Wire Better Auth email/password; after sign-in, `GET /api/auth/jwt-from-session` mints the JWT that clients send on every call.',
          'Add the auth middleware that verifies the JWT on every API route.',
        ],
      },
      {
        id: 'rbac-simple',
        label: L('Roles y permisos', 'Roles and permissions', 'Rôles et permissions'),
        description: L(
          'Perfiles admin | contributor | reviewer y un guard en todas las rutas.',
          'admin | contributor | reviewer profiles and a guard on every route.',
          'Profils admin | contributor | reviewer et un garde sur chaque route.',
        ),
        why: L(
          'Si no todos los usuarios deben ver o hacer lo mismo. Añadirlo después obliga a revisar cada ruta.',
          'When not every user should see or do the same things. Adding it later means revisiting every route.',
          'Quand tous les utilisateurs ne doivent pas voir ni faire la même chose. L’ajouter plus tard oblige à revoir chaque route.',
        ),
        spec: 'Role-based access control: a profile table (admin | contributor | reviewer) and a guard middleware',
        recommended: true,
        requires: ['auth-better-auth-jwt'],
        tasks: [
          "Add the role guard and apply it to EVERY business route; auto-provision the lowest role on a user's first request.",
        ],
      },
      {
        id: 'storage-minio',
        label: L('Ficheros (subida y descarga)', 'Files (upload and download)', 'Fichiers (envoi et téléchargement)'),
        description: L(
          'MinIO en el mismo servidor, subida a través de la API y enlaces firmados para descargar.',
          'MinIO on the same host, uploads through the API and signed links for downloads.',
          'MinIO sur le même serveur, envoi via l’API et liens signés pour le téléchargement.',
        ),
        why: L(
          'Si se suben PDFs, imágenes o adjuntos. Guardarlos en la base de datos la hincha; MinIO los guarda aparte y el prompt trae las trampas de las URLs firmadas.',
          'If PDFs, images or attachments get uploaded. Storing them in the database bloats it; MinIO keeps them apart and the prompt carries the signed-URL traps.',
          'Si des PDF, images ou pièces jointes sont envoyés. Les stocker en base la gonfle ; MinIO les garde à part et le prompt inclut les pièges des URL signées.',
        ),
        spec: 'MinIO object storage (S3-compatible, self-hosted), with uploads proxied through the API (multer memoryStorage)',
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
          { key: 'MINIO_PUBLIC_URL', value: 'http://127.0.0.1:9000', comment: 'origin the browser uses, signed into download URLs — in production https://<your domain> (nginx proxies the bucket path to MinIO)' },
          { key: 'MINIO_BUCKET', value: 'app-files' },
        ],
        gotchas: ['minio-two-clients', 'upload-proxy'],
      },
      {
        id: 'feat-email',
        label: L('Envío de emails', 'Sending email', 'Envoi d’e-mails'),
        description: L(
          'Microservicio aparte (SendGrid) con secreto compartido; la API nunca habla con el proveedor.',
          'A separate microservice (SendGrid) behind a shared secret; the API never talks to the provider.',
          'Un microservice séparé (SendGrid) avec un secret partagé ; l’API ne parle jamais au fournisseur.',
        ),
        why: L(
          'Para avisos, invitaciones o recuperar la contraseña. Va en un servicio aparte para que la clave de SendGrid nunca esté en la API.',
          'For notifications, invitations or password resets. It runs as a separate service so the SendGrid key never sits in the API.',
          'Pour notifications, invitations ou réinitialisation de mot de passe. Service séparé pour que la clé SendGrid ne soit jamais dans l’API.',
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
        label: L('Inteligencia artificial', 'Artificial intelligence', 'Intelligence artificielle'),
        description: L(
          'Chat, embeddings o lectura de documentos con LLMs, vía OpenRouter: Anthropic, OpenAI, Google y el resto con una sola clave.',
          'Chat, embeddings or document reading with LLMs, through OpenRouter: Anthropic, OpenAI, Google and the rest with one key.',
          'Chat, embeddings ou lecture de documents avec des LLM, via OpenRouter : Anthropic, OpenAI, Google et les autres avec une seule clé.',
        ),
        why: L(
          'Una sola clave para cualquier modelo: pasar de Claude a GPT o Gemini es cambiar un texto en el .env, sin tocar código. Abre una pregunta más sobre para qué la usas.',
          'One key for any model: moving from Claude to GPT or Gemini is a string in .env, no code change. It opens one more question about what you use it for.',
          'Une seule clé pour tous les modèles : passer de Claude à GPT ou Gemini, c’est changer une chaîne dans le .env, sans toucher au code. Ouvre une question de plus sur l’usage.',
        ),
        spec: 'LLM access through OpenRouter (one API key for Anthropic, OpenAI, Google and other vendors; model selected by id)',
        deps: { backend: ['openai'] },
        env: [
          { key: 'OPENROUTER_API_KEY', secret: true },
          { key: 'LLM_MODEL', value: 'anthropic/claude-sonnet-5' },
        ],
        notes: [
          'API keys live only in backend environment variables — never in the database, never in the frontend bundle.',
          'OpenRouter speaks the OpenAI protocol, so the official `openai` SDK works by pointing `baseURL` at it. Model ids are `vendor/model` (`anthropic/...`, `openai/...`, `google/...`); switching vendor is a change to `LLM_MODEL`, never to code.',
        ],
        tasks: [
          'Route every model call through one provider module so the model id, the timeout and the retry policy live in a single place.',
        ],
      },
      {
        id: 'db-pgvector',
        label: L('Búsqueda semántica (RAG)', 'Semantic search (RAG)', 'Recherche sémantique (RAG)'),
        description: L(
          'pgvector sobre el mismo PostgreSQL, para buscar por significado en documentos.',
          'pgvector on the same PostgreSQL, to search documents by meaning.',
          'pgvector sur le même PostgreSQL, pour chercher dans les documents par le sens.',
        ),
        why: L(
          'Necesaria para RAG o para buscar documentos por significado. Cambia la imagen de Postgres, y las columnas vector no se pueden declarar en Prisma.',
          'Needed for RAG or searching documents by meaning. It changes the Postgres image, and vector columns cannot be declared in Prisma.',
          'Nécessaire pour le RAG ou chercher des documents par le sens. Change l’image Postgres, et les colonnes vector ne se déclarent pas dans Prisma.',
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
      {
        id: 'feat-jobs',
        label: L('Tareas en segundo plano', 'Background jobs', 'Tâches de fond'),
        description: L(
          'Procesos largos (parseo, scraping, embeddings) con un límite de concurrencia explícito.',
          'Long work (parsing, scraping, embeddings) with an explicit concurrency cap.',
          'Traitements longs (parsing, scraping, embeddings) avec une limite de concurrence explicite.',
        ),
        why: L(
          'Si hay trabajo que tarda más que una petición HTTP. Sin límite de concurrencia, varios trabajos a la vez tumban el contenedor por memoria.',
          'When some work takes longer than an HTTP request. Without a concurrency cap, several jobs at once OOM-kill the container.',
          'Quand un traitement dure plus qu’une requête HTTP. Sans limite de concurrence, plusieurs tâches simultanées tuent le conteneur par manque de mémoire.',
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
    id: 'ai-capabilities',
    why: L(
      'Cada uso tiene su trampa: el chat choca con el timeout de nginx, los embeddings necesitan vectores y el OCR dispara la memoria.',
      'Each use has its own trap: chat hits the nginx timeout, embeddings need vectors and OCR blows up memory.',
      'Chaque usage a son piège : le chat bute sur le timeout nginx, les embeddings exigent des vecteurs et l’OCR fait exploser la mémoire.',
    ),
    title: L('IA', 'AI', 'IA'),
    question: L('¿Para qué la usas?', 'What do you use it for?', 'Pour quoi l’utilisez-vous ?'),
    mode: 'multi',
    visibleIf: hasAi,
    options: [
      {
        id: 'ai-chat',
        label: L('Chat / generación de texto', 'Chat / text generation', 'Chat / génération de texte'),
        description: L(
          'Respuestas en streaming.',
          'Streamed answers.',
          'Réponses en streaming.',
        ),
        why: L(
          'Añade la trampa del timeout: nginx corta a los 60 s y parece que el backend se ha caído.',
          'It adds the timeout trap: nginx cuts at 60s and it looks like the backend crashed.',
          'Ajoute le piège du timeout : nginx coupe à 60 s et on croit que le backend a planté.',
        ),
        spec: 'Streaming chat / text generation endpoints',
        recommended: true,
        gotchas: ['ai-timeouts'],
      },
      {
        id: 'ai-embeddings',
        label: L('Embeddings (búsqueda semántica)', 'Embeddings (semantic search)', 'Embeddings (recherche sémantique)'),
        description: L(
          'Vectores para buscar por significado. Necesita la búsqueda semántica marcada en la pantalla anterior.',
          'Vectors to search by meaning. Needs semantic search ticked on the previous screen.',
          'Vecteurs pour chercher par le sens. Nécessite la recherche sémantique cochée à l’écran précédent.',
        ),
        why: L(
          'Si no se guarda qué modelo generó cada vector, cambiar de modelo estropea la búsqueda sin avisar.',
          'Without storing which model produced each vector, switching model silently breaks search.',
          'Sans stocker le modèle qui a produit chaque vecteur, changer de modèle casse la recherche en silence.',
        ),
        spec: 'Embedding generation for semantic search',
        requires: ['db-pgvector'],
        env: [{ key: 'EMBEDDING_MODEL', value: 'openai/text-embedding-3-small' }],
        notes: [
          'Store the embedding model id next to every vector: re-indexing with a different model silently degrades search until everything is regenerated.',
        ],
      },
      {
        id: 'ai-parsing',
        label: L('Lectura de documentos / OCR', 'Document reading / OCR', 'Lecture de documents / OCR'),
        description: L(
          'PDFs y escaneados a texto. Es lo que más memoria consume: elige tamaño grande en el servidor.',
          'PDFs and scans into text. The biggest memory consumer: pick the large size on the server screen.',
          'PDF et scans convertis en texte. Le plus gourmand en mémoire : choisissez la grande taille à l’écran serveur.',
        ),
        why: L(
          'El OCR carga el documento entero en memoria. Marcarlo hace que el prompt limite cuántos se procesan a la vez.',
          'OCR loads the whole document into memory. Ticking it makes the prompt cap how many are processed at once.',
          'L’OCR charge tout le document en mémoire. Le cocher fait limiter par le prompt le nombre traité en même temps.',
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
    id: 'supabase',
    why: L(
      'Lo que marques entra en el plan y en las reglas del agente. RLS en particular es lo único que protege los datos.',
      'What you tick goes into the plan and the agent rules. RLS in particular is the only thing protecting the data.',
      'Ce que vous cochez entre dans le plan et les règles de l’agent. RLS est notamment la seule protection des données.',
    ),
    title: 'Supabase',
    question: L('¿Qué usas de Supabase?', 'Which Supabase features do you use?', 'Quelles fonctionnalités Supabase utilisez-vous ?'),
    help: L(
      'El cliente y las migraciones versionadas vienen siempre.',
      'The client and versioned migrations always come along.',
      'Le client et les migrations versionnées sont toujours inclus.',
    ),
    mode: 'multi',
    visibleIf: isSupabase,
    options: [
      {
        id: 'sb-rls',
        label: L('Row Level Security', 'Row Level Security', 'Row Level Security'),
        description: L(
          'Políticas por fila. Sin esto cualquiera con la anon key lee toda la tabla.',
          'Per-row policies. Without them, anyone holding the anon key reads the whole table.',
          'Politiques par ligne. Sans elles, quiconque possède la clé anon lit toute la table.',
        ),
        why: L(
          'Con Supabase la anon key es pública: sin RLS cualquiera lee todas las tablas desde el navegador.',
          'With Supabase the anon key is public: without RLS anyone reads every table from the browser.',
          'Avec Supabase la clé anon est publique : sans RLS, n’importe qui lit toutes les tables depuis le navigateur.',
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
        label: L('Login de usuarios', 'User login', 'Connexion des utilisateurs'),
        description: L(
          'Supabase Auth con email/contraseña y OAuth.',
          'Supabase Auth with email/password and OAuth.',
          'Supabase Auth avec e-mail/mot de passe et OAuth.',
        ),
        why: L(
          'Las políticas RLS se escriben sobre auth.uid(): sin login no hay usuario al que dar permisos.',
          'RLS policies are written against auth.uid(): without login there is no user to grant access to.',
          'Les politiques RLS s’écrivent sur auth.uid() : sans connexion, aucun utilisateur à qui donner accès.',
        ),
        spec: 'Supabase Auth for email/password and OAuth sign-in',
        recommended: true,
        tasks: ['Wire Supabase Auth and derive every RLS policy from `auth.uid()`.'],
      },
      {
        id: 'sb-storage',
        label: L('Ficheros', 'Files', 'Fichiers'),
        description: L(
          'Buckets de Supabase Storage con sus propias políticas.',
          'Supabase Storage buckets with their own policies.',
          'Buckets Supabase Storage avec leurs propres politiques.',
        ),
        why: L(
          'Si se suben ficheros. Los buckets necesitan sus propias políticas, aparte de las de las tablas.',
          'If files get uploaded. Buckets need their own policies, separate from the table ones.',
          'Si des fichiers sont envoyés. Les buckets ont besoin de leurs propres politiques, distinctes de celles des tables.',
        ),
        spec: 'Supabase Storage buckets for file uploads, with bucket policies',
      },
      {
        id: 'sb-vector',
        label: L('Búsqueda semántica (RAG)', 'Semantic search (RAG)', 'Recherche sémantique (RAG)'),
        description: L(
          'pgvector activado en el proyecto de Supabase.',
          'pgvector enabled on the Supabase project.',
          'pgvector activé sur le projet Supabase.',
        ),
        why: L(
          'Para RAG o búsqueda por significado sobre Supabase.',
          'For RAG or search by meaning on Supabase.',
          'Pour le RAG ou la recherche par le sens sur Supabase.',
        ),
        spec: 'pgvector enabled on the Supabase project for embedding search',
      },
      {
        id: 'sb-realtime',
        label: L('Tiempo real', 'Realtime', 'Temps réel'),
        description: L(
          'Sólo si varias personas ven la misma pantalla a la vez.',
          'Only if several people watch the same screen at once.',
          'Uniquement si plusieurs personnes voient le même écran en même temps.',
        ),
        why: L(
          'Añade suscripciones que mantienen conexiones abiertas; sin una necesidad real solo añade complejidad.',
          'It adds subscriptions that keep connections open; without a real need it only adds complexity.',
          'Ajoute des abonnements qui gardent des connexions ouvertes ; sans vrai besoin, c’est de la complexité en plus.',
        ),
        spec: 'Supabase Realtime subscriptions for live table updates',
      },
    ],
  },

  {
    id: 'ui',
    why: L(
      'Pone la librería en el prompt para que el agente use la misma que el resto de proyectos en vez de elegir una por su cuenta.',
      'It puts the library in the prompt so the agent uses the same one as every other project instead of picking its own.',
      'Ajoute la bibliothèque au prompt pour que l’agent utilise la même que les autres projets au lieu d’en choisir une.',
    ),
    title: L('Interfaz', 'Interface', 'Interface'),
    question: L('¿Algo especial en la interfaz?', 'Anything special in the interface?', 'Quelque chose de particulier dans l’interface ?'),
    help: L(
      'Formularios, caché de datos y notificaciones ya vienen de serie. Déjalo vacío si no necesitas nada más.',
      'Forms, data caching and toasts are already included. Leave it empty if you need nothing else.',
      'Formulaires, cache de données et notifications sont déjà inclus. Laissez vide si rien d’autre n’est nécessaire.',
    ),
    mode: 'multi',
    options: [
      {
        id: 'ui-i18n',
        label: L('Varios idiomas', 'Several languages', 'Plusieurs langues'),
        description: L(
          'i18next. Los identificadores del código siguen en inglés.',
          'i18next. Code identifiers stay in English.',
          'i18next. Les identifiants du code restent en anglais.',
        ),
        why: L(
          'Montarlo desde el principio es barato; sacar los textos de una app ya hecha es muy caro.',
          'Setting it up from day one is cheap; extracting strings from a finished app is expensive.',
          'Le mettre en place dès le départ coûte peu ; extraire les textes d’une app terminée coûte cher.',
        ),
        spec: 'i18next for UI copy (identifiers and comments stay in English)',
        deps: { frontend: ['i18next', 'react-i18next'] },
      },
      {
        id: 'ui-charts',
        label: L('Gráficas', 'Charts', 'Graphiques'),
        description: L(
          'Recharts, para dashboards y métricas.',
          'Recharts, for dashboards and metrics.',
          'Recharts, pour tableaux de bord et métriques.',
        ),
        why: L(
          'Así el agente usa Recharts, como el resto de proyectos, en vez de otra librería.',
          'So the agent uses Recharts, like the other projects, instead of another library.',
          'Pour que l’agent utilise Recharts, comme les autres projets, plutôt qu’une autre bibliothèque.',
        ),
        spec: 'Recharts for dashboard charts',
        deps: { frontend: ['recharts'] },
      },
      {
        id: 'ui-markdown',
        label: L('Mostrar markdown', 'Render markdown', 'Afficher du markdown'),
        description: L(
          'Para respuestas de IA o contenido editorial. Siempre saneado.',
          'For AI answers or editorial content. Always sanitized.',
          'Pour les réponses d’IA ou le contenu éditorial. Toujours assaini.',
        ),
        why: L(
          'Mostrar markdown sin sanear permite inyectar HTML; esta opción obliga a usar rehype-sanitize.',
          'Rendering unsanitized markdown allows HTML injection; this option enforces rehype-sanitize.',
          'Afficher du markdown non assaini permet l’injection de HTML ; cette option impose rehype-sanitize.',
        ),
        spec: 'react-markdown with rehype-sanitize (untrusted markdown is always sanitized)',
        deps: { frontend: ['react-markdown', 'remark-gfm', 'rehype-raw', 'rehype-sanitize'] },
      },
    ],
  },

  {
    id: 'design',
    why: L(
      'Sin un diseño de referencia el agente inventa pantallas con los estilos por defecto de shadcn. Con él, construye lo que ya se aprobó y traduce sus colores y tipografías a tokens en vez de copiar estilos sueltos.',
      'Without a reference design the agent invents screens on shadcn defaults. With one, it builds what was already approved and turns its colours and type into tokens instead of pasting loose styles.',
      'Sans maquette de référence, l’agent invente des écrans avec les styles shadcn par défaut. Avec elle, il construit ce qui a été validé et transforme couleurs et typographies en tokens au lieu de copier des styles isolés.',
    ),
    title: L('Diseño', 'Design', 'Design'),
    question: L('¿Partes de un diseño ya hecho?', 'Are you starting from an existing design?', 'Partez-vous d’un design existant ?'),
    help: L(
      'Déjalo vacío si el diseño se hace sobre la marcha. Si lo tienes, cópialo en la carpeta design/ del repo antes de lanzar el prompt.',
      'Leave it empty if the design happens along the way. If you have one, copy it into the repo’s design/ folder before running the prompt.',
      'Laissez vide si le design se fait en chemin. Si vous en avez un, copiez-le dans le dossier design/ du dépôt avant de lancer le prompt.',
    ),
    mode: 'multi',
    options: [
      {
        id: 'design-claude',
        label: 'Claude Design',
        description: L(
          'Exportas el proyecto de Claude Design (HTML o paquete para Claude Code) y el agente lo usa como referencia.',
          'You export the Claude Design project (HTML or the Claude Code handoff bundle) and the agent uses it as the reference.',
          'Vous exportez le projet Claude Design (HTML ou le paquet pour Claude Code) et l’agent s’en sert de référence.',
        ),
        why: L(
          'Si el diseño se hizo en Claude Design, el agente lo lee directamente y reproduce las pantallas aprobadas en vez de inventarlas.',
          'If the design was made in Claude Design, the agent reads it directly and rebuilds the approved screens instead of inventing them.',
          'Si le design a été fait dans Claude Design, l’agent le lit directement et reconstruit les écrans validés au lieu de les inventer.',
        ),
        spec: 'A Claude Design export in `design/` as the visual reference for every screen',
        notes: [
          'The Claude Design export is a reference, not source code: rebuild each screen with the project components and Tailwind tokens instead of copying its markup or inline styles.',
        ],
        tasks: [
          'Read the Claude Design export in `design/` and list its screens, colours, type scale, radii and spacing before writing any UI.',
          'Translate those values into `@theme` tokens in `src/index.css` (both light and dark if the design has them), then build each screen from shadcn/ui primitives against those tokens.',
        ],
      },
      {
        id: 'design-existing',
        label: L('Otro diseño (Figma, mockups)', 'Other design (Figma, mockups)', 'Autre design (Figma, maquettes)'),
        description: L(
          'Figma, capturas, un PDF o la web actual del cliente. Se deja en design/ o se enlaza.',
          'Figma, screenshots, a PDF or the client’s current site. Dropped into design/ or linked.',
          'Figma, captures, un PDF ou le site actuel du client. Déposé dans design/ ou lié.',
        ),
        why: L(
          'Si el cliente ya tiene maquetas o una web, el agente las respeta y te pregunta lo que falte (estados, móvil, modo oscuro) en lugar de adivinar.',
          'If the client already has mockups or a website, the agent follows them and asks about what is missing (states, mobile, dark mode) instead of guessing.',
          'Si le client a déjà des maquettes ou un site, l’agent les respecte et demande ce qui manque (états, mobile, mode sombre) au lieu de deviner.',
        ),
        spec: 'An existing design (Figma, mockups or screenshots) referenced from `design/` as the visual source of truth',
        notes: [
          'If the design lives outside the repo (a Figma link), record the link and the frame names in `design/README.md` so the reference survives the conversation.',
        ],
        tasks: [
          'Inventory the existing design in `design/`: screens, colours, type scale and components. Ask me about anything missing (states, mobile, dark mode) instead of guessing.',
          'Turn the design values into `@theme` tokens in `src/index.css` and map its components to shadcn/ui primitives before building pages.',
        ],
      },
    ],
  },

  {
    id: 'team',
    why: L(
      'Decide si se genera un workflow de CI. Con una sola persona haciendo push a main es un archivo que nadie mira.',
      'It decides whether a CI workflow is generated. With one person pushing to main it is a file nobody looks at.',
      'Détermine si un workflow de CI est généré. Avec une seule personne qui pousse sur main, c’est un fichier que personne ne regarde.',
    ),
    title: L('Equipo', 'Team', 'Équipe'),
    question: L('¿Cómo se trabaja en este repo?', 'How is this repo worked on?', 'Comment travaille-t-on sur ce dépôt ?'),
    help: L(
      'Déjalo vacío si una sola persona hace push directo a main.',
      'Leave it empty if one person pushes straight to main.',
      'Laissez vide si une seule personne pousse directement sur main.',
    ),
    mode: 'multi',
    options: [
      {
        id: 'infra-ci',
        label: L('Pull requests o varias personas', 'Pull requests or several people', 'Pull requests ou plusieurs personnes'),
        description: L(
          'GitHub Actions compila y pasa los tests en cada push y pull request.',
          'GitHub Actions builds and runs the tests on every push and pull request.',
          'GitHub Actions compile et lance les tests à chaque push et pull request.',
        ),
        why: L(
          'Coolify solo compila al desplegar: nunca ejecuta los tests. El CI es el único sitio donde corren, y solo sirve si alguien mira el resultado antes de fusionar.',
          'Coolify only builds when it deploys; it never runs the tests. CI is the only place they run, and it only helps if someone checks the result before merging.',
          'Coolify compile seulement au déploiement ; il ne lance jamais les tests. La CI est le seul endroit où ils tournent, utile seulement si quelqu’un vérifie le résultat avant de fusionner.',
        ),
        spec: 'GitHub Actions running build and tests on every push and pull request',
      },
    ],
  },

  /* ---------------------------------------------------------- baseline --- */

  {
    id: 'base-frontend',
    title: 'Frontend',
    question: L('Base del frontend', 'Frontend baseline', 'Socle frontend'),
    mode: 'multi',
    baseline: true,
    options: [
      {
        id: 'fe-react-vite',
        label: 'React 19 + Vite 5',
        description: L('SPA con react-router-dom.', 'SPA with react-router-dom.', 'SPA avec react-router-dom.'),
        spec: 'React 19 + Vite 5 SPA with react-router-dom v6',
        locked: true,
        deps: {
          frontend: ['react', 'react-dom', 'react-router-dom'],
          frontendDev: ['vite', '@vitejs/plugin-react', 'typescript', '@types/react', '@types/react-dom'],
        },
        tasks: [
          'Scaffold the frontend: Vite + React + strict TypeScript, `@/*` alias to `src/*`.',
          'Set up the router with a persistent layout and guarded routes.',
        ],
      },
      {
        id: 'ui-tailwind4',
        label: 'Tailwind 4 + shadcn/ui',
        description: L('Estilos y componentes.', 'Styling and components.', 'Styles et composants.'),
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
        label: 'react-hook-form + zod',
        description: L('Formularios.', 'Forms.', 'Formulaires.'),
        spec: 'react-hook-form + zod, with the schemas shared between client and API',
        locked: true,
        deps: { frontend: ['react-hook-form', 'zod', '@hookform/resolvers'] },
      },
      {
        id: 'ui-query',
        label: 'TanStack Query',
        description: L('Caché de datos del servidor.', 'Server data cache.', 'Cache des données serveur.'),
        spec: 'TanStack Query for server state, caching and retries',
        locked: true,
        deps: { frontend: ['@tanstack/react-query'] },
      },
      {
        id: 'ui-sonner',
        label: 'sonner',
        description: L('Notificaciones.', 'Toasts.', 'Notifications.'),
        spec: 'sonner for toasts (a single <Toaster /> in the root layout)',
        locked: true,
        deps: { frontend: ['sonner'] },
      },
    ],
  },

  {
    id: 'base-api',
    title: 'API',
    question: L('Base de la API', 'API baseline', 'Socle de l’API'),
    mode: 'multi',
    baseline: true,
    visibleIf: hasOwnApi,
    options: [
      {
        id: 'backend-express',
        label: 'Express 4 + TypeScript',
        description: L('API propia.', 'Own API.', 'API propre.'),
        spec: 'Express 4 + TypeScript API (ts-node-dev in dev, compiled to dist/ in prod)',
        locked: true,
        services: ['backend'],
        deps: {
          backend: ['express', 'cors', 'dotenv', 'zod'],
          backendDev: ['typescript', 'ts-node-dev', '@types/express', '@types/cors', '@types/node'],
        },
        env: [{ key: 'PORT', value: '3000' }],
        // coolify-memory rides here, not on Coolify: V8 heaps, upload buffers and
        // database backups mean nothing to a stack whose only container is nginx.
        gotchas: ['ts-node-dev-windows', 'coolify-healthcheck', 'nginx-single-entry', 'coolify-memory'],
        tasks: [
          'Build the API: one router per domain under `src/routes/`, zod validation at the edge, one centralised error handler.',
          'Expose `/api/health/live` (no database access) and `/api/health/ready` (checks dependencies).',
          'Handle SIGTERM: stop accepting connections, drain in-flight work, then exit.',
        ],
      },
      {
        id: 'db-postgres-prisma',
        label: 'PostgreSQL 16 + Prisma',
        description: L('Base de datos.', 'Database.', 'Base de données.'),
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
        // Local Docker only exists for a stack with services of its own: a
        // static or Supabase frontend runs with a plain `npm run dev`.
        id: 'infra-compose-dev',
        label: 'Docker Compose',
        description: L('Stack local.', 'Local stack.', 'Stack local.'),
        spec: 'Local docker compose stack with bind mounts and hot reload',
        locked: true,
        gotchas: ['compose-project-name', 'windows-127001', 'vite-allowed-hosts'],
      },
    ],
  },

  {
    id: 'base-supabase',
    title: 'Supabase',
    question: L('Base de Supabase', 'Supabase baseline', 'Socle Supabase'),
    mode: 'multi',
    baseline: true,
    visibleIf: isSupabase,
    options: [
      {
        id: 'sb-core',
        label: L('Postgres + cliente JS', 'Postgres + JS client', 'Postgres + client JS'),
        description: L('supabase-js y migraciones SQL.', 'supabase-js and SQL migrations.', 'supabase-js et migrations SQL.'),
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
    ],
  },

  {
    id: 'base-infra',
    title: L('Despliegue', 'Deployment', 'Déploiement'),
    question: L('Base del despliegue', 'Deployment baseline', 'Socle du déploiement'),
    mode: 'multi',
    baseline: true,
    options: [
      {
        id: 'infra-nginx',
        label: 'nginx',
        description: L('Única puerta de entrada.', 'Single entrypoint.', 'Point d’entrée unique.'),
        spec: 'nginx as the single published entrypoint',
        locked: true,
        services: ['nginx'],
        // nginx-single-entry rides on the API option: it is about proxying and
        // upload limits, neither of which exists without a backend.
      },
      {
        id: 'infra-coolify',
        label: 'Coolify',
        description: L('Producción.', 'Production.', 'Production.'),
        spec: 'Production deployment on Coolify (multi-stage images, compose file with no custom networks)',
        locked: true,
        // coolify-healthcheck rides on the API option instead: a stack whose
        // only container is nginx has no startup sequence to get wrong.
        gotchas: ['coolify-no-networks', 'coolify-logging', 'coolify-build-args'],
        tasks: [
          'Deploy on Coolify: point the resource at `docker-compose.coolify.yml`, set the domain on the nginx service, and paste the env vars into the UI.',
        ],
      },
    ],
  },

  {
    id: 'base-quality',
    title: L('Calidad', 'Quality', 'Qualité'),
    question: L('Base de calidad', 'Quality baseline', 'Socle qualité'),
    mode: 'multi',
    baseline: true,
    options: [
      {
        id: 'q-strict-ts',
        label: L('TypeScript strict', 'Strict TypeScript', 'TypeScript strict'),
        description: L('Sin any implícito.', 'No implicit any.', 'Pas de any implicite.'),
        spec: 'Strict TypeScript everywhere',
        locked: true,
      },
      {
        id: 'q-english-code',
        label: L('Código en inglés', 'Code in English', 'Code en anglais'),
        description: L('La interfaz puede ir en otro idioma.', 'The UI may be localised.', 'L’interface peut être localisée.'),
        spec: 'Code, comments and commits in English; UI strings may be localised',
        locked: true,
      },
      {
        id: 'q-vitest',
        label: 'Vitest',
        description: L('Tests.', 'Tests.', 'Tests.'),
        // Deliberately does not name supertest / Testing Library: those depend
        // on workspaces this project may not have.
        spec: 'Vitest for unit and integration tests',
        locked: true,
        deps: { frontendDev: ['vitest'], backendDev: ['vitest', 'supertest'] },
      },
      {
        id: 'q-eslint',
        label: 'ESLint 9',
        description: L('Flat config, cero warnings.', 'Flat config, zero warnings.', 'Flat config, zéro avertissement.'),
        spec: 'ESLint 9 (flat config) with typescript-eslint, zero warnings allowed',
        locked: true,
        deps: { frontendDev: ['eslint', '@eslint/js', 'typescript-eslint'] },
      },
      {
        id: 'q-conventional',
        label: 'Conventional commits',
        description: L('feat:, fix:, chore:', 'feat:, fix:, chore:', 'feat:, fix:, chore:'),
        spec: 'Conventional commits',
        locked: true,
      },
    ],
  },
];

export const STEP_IDS = STEPS.map((s) => s.id);

export function visibleSteps(sel: Selection): Step[] {
  return STEPS.filter((s) => !s.visibleIf || s.visibleIf(sel));
}

/** The visible steps that are actual questions, in the order they are asked. */
export function questionSteps(sel: Selection): Step[] {
  return visibleSteps(sel).filter((s) => !s.baseline);
}
