import type { Ctx } from './context';
import { joinSections } from './context';

function commandsSection(ctx: Ctx): string {
  const blocks: string[] = [];

  if (ctx.hasComposeDev) {
    blocks.push(`### Docker

\`\`\`bash
docker compose up --build      # build and start every service
docker compose up -d           # background
docker compose restart backend # ← after ANY backend code change (see gotchas)
docker compose down -v         # ⚠️ DESTRUCTIVE: wipes the database volume
\`\`\``);
  }

  if (ctx.hasBackend) {
    const prisma = ctx.hasDb
      ? `
npm run prisma:generate    # after schema changes
npm run prisma:push        # apply schema (SAFE — use this, never migrate dev)
npm run prisma:studio      # data browser
npm run seed               # idempotent baseline data`
      : '';
    blocks.push(`### Backend (\`backend/\`)

\`\`\`bash
npm run dev                # watch mode${prisma}
npm run build              # tsc → dist/
\`\`\``);
  }

  if (ctx.hasSupabase) {
    blocks.push(`### Supabase

\`\`\`bash
npx supabase migration new <name>   # every schema change starts here
npx supabase db push                # apply migrations to the linked project
npx supabase gen types typescript --linked > src/lib/database.types.ts
\`\`\`

Never change the schema only from the dashboard: the repo stops describing
production and the next deploy silently disagrees with it.`);
  }

  if (ctx.hasFrontend) {
    blocks.push(`### Frontend (\`frontend/\`)

\`\`\`bash
npm run dev                # Vite dev server on 5173
npm run build              # tsc + vite build
\`\`\``);
  }

  return blocks.length ? '## Commands\n\n' + blocks.join('\n\n') : '';
}

function structureSection(ctx: Ctx): string {
  const lines: string[] = [];
  if (ctx.hasFrontend) {
    lines.push(`frontend/
  src/
    components/ui/    # shared primitives — reuse, never fork
    pages/            # one file per route
    lib/              # api client, helpers
    index.css         # Tailwind entry + @theme tokens`);
  }
  if (ctx.hasBackend) {
    lines.push(`backend/
  src/
    routes/           # one router per domain, mounted under /api
    lib/              # storage, providers, cross-cutting helpers
    middleware/       # auth, role guard, error handler
    index.ts          # app bootstrap + graceful shutdown${ctx.hasDb ? '\n  prisma/schema.prisma' : ''}`);
  }
  if (ctx.hasNginx) lines.push(`nginx/nginx.conf      # the only entrypoint`);
  if (!lines.length) return '';
  return '## Repository layout\n\n```\n' + lines.join('\n') + '\n```';
}

function constraintsSection(ctx: Ctx): string {
  const rules: string[] = [];
  if (ctx.has('q-strict-ts')) rules.push('Strict TypeScript — no implicit `any`.');
  if (ctx.has('q-english-code')) rules.push('Code, comments and commits in English.');
  rules.push('API keys and secrets live exclusively in `.env` — never in the database or the frontend.');
  if (ctx.has('rbac-simple')) rules.push('The role guard is applied to every business route without exception.');
  if (ctx.hasPostgres) {
    rules.push('Raw SQL: always quote camelCase columns, always `text[]` and never `uuid[]`.');
    rules.push('`$executeRaw` for void-returning functions, `$queryRaw` for result-returning ones.');
  }
  if (ctx.hasCoolify) {
    rules.push('Never add a `networks:` block to the Coolify compose file.');
    rules.push(
      `Never raise a \`mem_limit\` without lowering another: the host has ${ctx.memory.totalGb} GB and the limits already add up to what is available.`,
    );
  }
  if (ctx.hasSupabase) {
    rules.push('Every table has RLS enabled with an explicit policy. The `service_role` key never leaves the server.');
  }
  if (ctx.has('feat-ai')) {
    rules.push('Model keys stay in backend env vars; the model id is configuration, never hard-coded.');
  }
  return '## Constraints\n\n' + rules.map((r) => `- ${r}`).join('\n');
}

function gotchasSection(ctx: Ctx): string {
  if (!ctx.gotchas.length) return '';
  const body = ctx.gotchas
    .map((g, i) => `### ${i + 1}. ${g.title}\n\n${g.body}`)
    .join('\n\n---\n\n');
  return `## ⚠️ Critical gotchas\n\nNon-obvious issues that have already cost real time. Read the relevant one before touching that area.\n\n${body}`;
}

export function generateClaudeMd(ctx: Ctx): string {
  return joinSections([
    `# CLAUDE.md\n\nGuidance for Claude Code when working on this repository.`,
    `## Project overview\n\n**${ctx.name}** — ${ctx.meta.description.trim() || 'TODO: one-paragraph description.'}`,
    commandsSection(ctx),
    gotchasSection(ctx),
    structureSection(ctx),
    constraintsSection(ctx),
  ]);
}

/**
 * The single source of truth when more than one agent is in play.
 *
 * Three near-identical instruction files is how they drift: someone edits the
 * one their tool reads, and the other agent keeps working from the old rules.
 */
export function generateAgentsMd(ctx: Ctx): string {
  return joinSections([
    `# AGENTS.md\n\nInstructions for any coding agent working in this repository.\nThis is the source of truth: \`CLAUDE.md\` and \`.cursor/rules/\` point here.`,
    `## Project overview\n\n**${ctx.name}** — ${ctx.meta.description.trim() || 'TODO: one-paragraph description.'}`,
    commandsSection(ctx),
    gotchasSection(ctx),
    structureSection(ctx),
    constraintsSection(ctx),
  ]);
}

/** What CLAUDE.md becomes when AGENTS.md exists. */
export function generateClaudePointer(): string {
  return `# CLAUDE.md

The instructions for this repository live in **AGENTS.md**, so that every agent
reads the same rules. Do not duplicate them here.

@AGENTS.md
`;
}

/** What the Cursor rule becomes when AGENTS.md exists. */
export function generateCursorPointer(ctx: Ctx): string {
  return `---
description: Project rules for ${ctx.name}
globs:
alwaysApply: true
---

The instructions for this repository live in **AGENTS.md** at the repo root.
Read it before making any change, and keep it as the only copy of these rules.
`;
}

export function generateCursorRules(ctx: Ctx): string {
  const body = joinSections([
    `**${ctx.name}** — ${ctx.meta.description.trim() || 'TODO: one-paragraph description.'}`,
    commandsSection(ctx),
    constraintsSection(ctx),
    gotchasSection(ctx),
  ]);

  return `---
description: Project stack, conventions and known traps for ${ctx.name}
globs:
alwaysApply: true
---

${body}
`;
}
