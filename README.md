# ControlC Stack Forge

A short wizard that turns a few answers into the bootstrap material for a new
repository: a prompt for Claude Code or Cursor, the agent instructions
(`AGENTS.md`, with `CLAUDE.md` importing it), and the Docker, nginx and Coolify
configuration that matches the choices.

No backend, no database, no accounts. The answers live in `localStorage`.

It is deliberately opinionated. Everything ControlC has already settled on —
React 19 + Vite, Tailwind 4 + shadcn, strict TypeScript, Vitest, ESLint,
Express + Prisma + PostgreSQL, Coolify — is never asked. The wizard only asks
what changes between projects: the kind of app, which features it needs (login,
files, email, AI, semantic search, background jobs), interface extras, whether
there is a design to follow, and which Coolify server it
goes to. Every question and option carries an "i" explaining why it matters.

## Why it exists

Starting a project with an agent means retyping the same brief every time — and
forgetting, every time, the handful of traps that cost days once already
(Coolify's `networks:` block, `prisma migrate reset`, presigned URLs signed for
the wrong host). Those traps are encoded in `src/catalog/gotchas.ts` and are
written into `AGENTS.md` only when the relevant technology is selected.

## Run it

```bash
npm install
npm run dev          # http://127.0.0.1:5173
```

```bash
npm test             # catalog, selection rules and whole-project simulations
npm run typecheck
npm run build        # tsc + vite build → dist/
```

## Deploy

### GitHub Pages (current production)

Every push to `main` runs `.github/workflows/deploy.yml`: tests, build, publish
to https://controlc-io.github.io/stack-forge/. A failing test stops the deploy.

The workflow builds with `BASE_PATH=/stack-forge/`, because Pages serves the site
from that sub-path.

### Coolify

1. Create a Docker Compose resource pointing at this repo.
2. Compose file: `docker-compose.coolify.yml`.
3. Set the domain on the **web** service.

The image is a two-stage build: Node builds the bundle, `nginx:alpine` serves it.
Nothing else runs in production.

It builds for the root of its domain. To serve it from a sub-path instead, set
`BASE_PATH` (for example `/stack-forge/`) in Coolify's environment variables —
a wrong value gives a blank page, because every asset request 404s.

The link-preview tags in `index.html` point at the GitHub Pages URL; change them
if the Coolify domain becomes the canonical one.

## Extending the catalog

Everything the wizard shows and everything the generators emit comes from data:

| File | Holds |
|---|---|
| `src/catalog/steps.ts` | the questions and the hidden baseline steps: options, dependencies, npm packages, env vars |
| `src/catalog/gotchas.ts` | production traps, each gated on the options that make it relevant |
| `src/catalog/servers.ts` | the known Coolify hosts and the app sizes offered on the server screen |
| `src/generators/` | the emitters: prompt, `AGENTS.md`, compose files, Dockerfiles, nginx, CI |
| `src/lib/memory.ts` | turns the host and app size into every `mem_limit` and V8 heap cap |

Adding a technology means adding one `TechOption`. The UI, the dependency
resolution, the `.env.example` and the summary panel all follow automatically.
A decision that is already made goes into a `baseline` step as a locked option;
a real choice goes into a question step and needs a `why`, which a catalog test
enforces.

`label`, `description` and `why` are UI copy and are translated (`{ es, en, fr }`,
or a plain string for product names). `spec`, `notes` and `tasks` end up inside
generated files and are always English — the interface language never changes
what an agent reads, and a simulation test fails on any Spanish or French in the
output.

The interface language is switched from the header and persisted in
`localStorage`. Chrome copy lives in the `UI` dictionary of `src/i18n/index.ts`.
