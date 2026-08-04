import { tx } from '@/i18n';
import { mb } from '@/lib/memory';
import type { Ctx } from './context';
import { joinSections } from './context';

const bullet = (lines: string[]) => lines.map((l) => `- ${l}`).join('\n');

function stackSection(ctx: Ctx): string {
  // Generated output is always English, whatever the UI language is.
  const lines = ctx.options.map((o) => `**${o.spec ?? tx(o.label, 'en')}**`);
  const notes = ctx.options.flatMap((o) => o.notes ?? []);
  return joinSections([
    '## Stack\n\n' + bullet(lines),
    notes.length ? '### Stack notes\n\n' + bullet(notes) : '',
  ]);
}

function architectureSection(ctx: Ctx): string {
  if (ctx.hasSupabase) {
    return `## Architecture

\`\`\`
Browser ──▶ nginx (static bundle)
   └──────▶ Supabase  (Postgres + Auth${ctx.has('sb-storage') ? ' + Storage' : ''})
\`\`\`

There is no server of yours in this picture. The browser holds the anon key and
talks to Postgres directly, so **every access rule is a Row Level Security
policy** — there is no middleware layer to fall back on. Treat the database
schema and its policies as the security boundary, and keep them in
\`supabase/migrations/\` so the repository, not the dashboard, is the source of
truth.`;
  }

  if (!ctx.hasNginx && !ctx.hasBackend) {
    return `## Architecture

Single static SPA. No API, no database. All state lives in the browser
(localStorage), so every feature must survive a hard refresh and a cleared
storage without crashing.`;
  }

  const backing = [
    ctx.hasPostgres ? 'postgres:5432' : '',
    ctx.services.has('minio') ? 'minio:9000' : '',
    ctx.services.has('email_service') ? 'email_service:3001' : '',
  ].filter(Boolean);
  const backingTree = backing
    .map((s, i) => `\n                            ${i === backing.length - 1 ? '└─' : '├─'} ${s}`)
    .join('');

  const topology = ctx.hasNginx
    ? `\`\`\`
Browser
  └─ nginx  (the ONLY published entrypoint)
       ├─ /            → frontend (static bundle in prod, Vite dev server in dev)
       └─ /api/*       → backend:3000${backingTree}
\`\`\`

Network split: \`dmz_net\` holds nginx and the frontends; \`internal_net\` holds the
backend, database and storage. Only nginx publishes host ports.`
    : `The API is the only service. It listens on \`PORT\` and is reached directly.`;

  const authFlow = ctx.has('auth-better-auth-jwt')
    ? `

### Auth flow

1. \`POST /api/auth/sign-in/email\` → Better Auth creates the session cookie
2. \`GET /api/auth/jwt-from-session\` (with that cookie) → the app issues its own JWT
3. The frontend stores the JWT and sends \`Authorization: Bearer <jwt>\` on every call

Never re-verify the password to mint the JWT — the session is already proof.`
    : '';

  return `## Architecture\n\n${topology}${authFlow}`;
}

function planSection(ctx: Ctx): string {
  // Phased, not just concatenated: deploying before the stack is verified
  // locally is the single most expensive ordering mistake here.
  const build = ctx.options.filter((o) => !o.id.startsWith('infra-')).flatMap((o) => o.tasks ?? []);
  const deploy = ctx.options.filter((o) => o.id.startsWith('infra-')).flatMap((o) => o.tasks ?? []);

  const tasks: string[] = [
    'Create the repository skeleton and commit the tooling config first (tsconfig, linting, Docker), so every later step runs in the real environment.',
    ...build,
  ];

  if (ctx.hasCoolify) {
    tasks.push(
      'Ship the production compose file and multi-stage Dockerfiles in the same PR as the dev setup — retrofitting production later is how the memory and networking bugs below happen.',
    );
  }
  if (ctx.hasComposeDev) {
    tasks.push(
      '`docker compose up --build` must bring the whole stack up from a clean checkout with only `.env` filled in. Verify this, and only then move on.',
    );
  }

  tasks.push(...deploy);
  tasks.push('Write a README that documents: how to run it, the env vars, and the deployment steps.');

  return '## Implementation plan\n\n' + tasks.map((t, i) => `${i + 1}. ${t}`).join('\n');
}

function conventionsSection(ctx: Ctx): string {
  const rules: string[] = [];
  if (ctx.has('q-strict-ts')) rules.push('Strict TypeScript. No implicit `any`, no unexplained `@ts-ignore`.');
  if (ctx.has('q-english-code')) rules.push('Code, comments, commit messages and documentation in English. UI strings may be in another language.');
  if (ctx.has('q-conventional')) rules.push('Conventional commits (`feat:`, `fix:`, `chore:`) with a scope.');
  if (ctx.has('q-vitest')) rules.push('Vitest for tests. Every bug fix lands with the test that reproduces it.');
  if (ctx.has('q-eslint')) rules.push('ESLint must pass with zero warnings before a commit.');
  rules.push('Secrets live only in `.env` on the server — never in the database, never in the frontend bundle, never committed.');
  if (ctx.has('rbac-simple')) rules.push('Every business route goes through the role guard. No data endpoint is ever left unauthenticated.');
  if (ctx.hasPostgres) rules.push('In raw SQL always quote camelCase identifiers and use `text[]`, never `uuid[]`.');
  if (ctx.hasFrontend) rules.push('Reuse the existing UI primitives; do not introduce a second component library.');

  return '## Conventions\n\n' + bullet(rules);
}

function gotchaSection(ctx: Ctx): string {
  if (!ctx.gotchas.length) return '';
  const body = ctx.gotchas
    .map((g) => `### ${g.title}\n\n${g.body}`)
    .join('\n\n');
  return `## Known traps (already paid for — do not rediscover them)\n\n${body}`;
}

function budgetSection(ctx: Ctx): string {
  if (!ctx.hasCoolify) return '';
  const { totalGb, otherGb, availableGb, limits, nodeHeap, buildHeap, swap, warnings } = ctx.memory;
  const rows = Object.entries(limits)
    .map(([service, value]) => `| \`${service}\` | ${mb(value)} |`)
    .join('\n');

  return `## Production budget

The target host has **${totalGb} GB** of RAM${otherGb > 0 ? `, of which ${otherGb} GB is already claimed by other stacks` : ''}. After the OS and
Coolify's own containers (~1.2 GB), roughly **${availableGb.toFixed(1)} GB** is available to this project.

| Service | mem_limit |
|---|---|
${rows}

The API's V8 heap is capped at **${nodeHeap} MB**, below its container limit, so the
garbage collector reclaims instead of the kernel OOM-killing the container. Build
stages are capped at **${buildHeap} MB** because Coolify builds on the production
server, next to the running containers.

Swap file on the host: **${swap ? 'yes' : 'NO — add one before the first deploy'}**.
${warnings.length ? '\n' + warnings.map((w) => `> ⚠️ ${w}`).join('\n\n') : ''}`;
}

function acceptanceSection(ctx: Ctx): string {
  const checks: string[] = [];
  if (ctx.hasComposeDev) checks.push('`docker compose up --build` from a clean clone brings every service to healthy.');
  if (ctx.hasBackend) checks.push('`/api/health/live` returns 200 without touching the database.');
  if (ctx.hasFrontend) checks.push('The frontend builds (`npm run build`) with no TypeScript errors.');
  if (ctx.has('auth-better-auth-jwt')) checks.push('Sign-up, sign-in, refresh and sign-out all work end to end in the browser.');
  if (ctx.has('sb-rls')) checks.push('Every table has RLS enabled and an explicit policy per operation, verified while signed in as a normal user (not from the dashboard SQL editor).');
  if (ctx.hasCoolify) checks.push('The production compose file declares no `networks:` block and every service has `mem_limit`, log rotation and a healthcheck.');
  checks.push('The README lets someone who has never seen the repo run it in under ten minutes.');
  return '## Definition of done\n\n' + checks.map((c) => `- [ ] ${c}`).join('\n');
}

export function generatePrompt(ctx: Ctx): string {
  const description = ctx.meta.description.trim() || 'TODO: describe what this product does and for whom.';
  const extra = ctx.meta.extraContext.trim();

  return joinSections([
    `# Bootstrap prompt — ${ctx.name}`,
    `You are setting up a brand new repository from scratch. Read this whole brief
before writing any code, then implement it in the order given below. Ask me
before deviating from the stack: it is chosen deliberately and the traps at the
end of this document are the reason.`,
    `## Product\n\n${description}`,
    architectureSection(ctx),
    stackSection(ctx),
    planSection(ctx),
    conventionsSection(ctx),
    budgetSection(ctx),
    gotchaSection(ctx),
    acceptanceSection(ctx),
    extra ? `## Extra context from me\n\n${extra}` : '',
    `---\n_Generated with ControlC Stack Forge._`,
  ]);
}
