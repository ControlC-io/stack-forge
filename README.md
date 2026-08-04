# Stack Forge

A single-page form that turns a stack decision tree into the bootstrap material
for a new repository: a prompt for Claude Code or Cursor, the agent instruction
files, and the Docker/nginx/Coolify configuration that matches the choices.

No backend, no database, no accounts. The blueprint lives in `localStorage`.

## Why it exists

Starting a project with an agent means retyping the same brief every time — and
forgetting, every time, the handful of traps that cost days once already
(Coolify's `networks:` block, `prisma migrate reset`, presigned URLs signed for
the wrong host). Those traps are encoded in `src/catalog/gotchas.ts` and are
pulled into the generated files only when the relevant technology is selected.

## Run it

```bash
npm install
npm run dev          # http://127.0.0.1:5173
```

```bash
npm run build        # tsc + vite build → dist/
npm run typecheck
```

## Deploy (Coolify)

1. Create a Docker Compose resource pointing at this repo.
2. Compose file: `docker-compose.coolify.yml`.
3. Set the domain on the **web** service.

The image is a two-stage build: Node builds the bundle, `nginx:alpine` serves it.
Nothing else runs in production.

## Extending the catalog

Everything the wizard shows and everything the generators emit comes from data:

| File | Holds |
|---|---|
| `src/catalog/steps.ts` | the decision tree: steps, options, dependencies, npm packages, env vars |
| `src/catalog/gotchas.ts` | production traps, each gated on the options that make it relevant |
| `src/generators/` | the emitters: prompt, CLAUDE.md, Cursor rules, compose files, Dockerfiles, nginx |

Adding a technology means adding one `TechOption`. The UI, the dependency
resolution, the `.env.example` and the summary panel all follow automatically.

`label` and `description` are UI copy and are translated (`{ es, en, fr }`, or a
plain string for product names). `spec`, `notes` and `tasks` end up inside
generated files and are always English — the interface language never changes
what an agent reads.

The interface language is switched from the header (ES / EN / FR) and persisted
in `localStorage`. Chrome copy lives in the `UI` dictionary of `src/i18n/index.ts`.
