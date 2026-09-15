import { describe, expect, it } from 'vitest';
import { STEPS } from '@/catalog/steps';
import type { Blueprint, ProjectMeta, Step } from '@/catalog/types';
import { tx } from '@/i18n';
import { applyToggle, emptyBlueprint, selectedOptions } from '@/lib/blueprint';
import { generateFiles } from '.';
import { buildContext } from './context';

const step = (id: string): Step => STEPS.find((s) => s.id === id)!;

const META: ProjectMeta = {
  name: 'Folio App',
  description: 'RAG document intelligence platform.',
  domain: 'folio.example.com',
  extraContext: 'Customers are imported from an ERP nightly.',
  serverId: 'controlc-vps',
  appSize: 'medium',
  serverRamGb: '16',
  serverSwap: false,
};

/** A host that is not in the server list. */
const custom = (ram: string, extra: Partial<ProjectMeta> = {}): Partial<ProjectMeta> => ({
  serverId: 'custom',
  serverRamGb: ram,
  ...extra,
});

const withMeta = (bp: Blueprint, meta: Partial<ProjectMeta> = {}): Blueprint => ({
  ...bp,
  meta: { ...META, ...meta },
});

/** One blueprint per meaningfully different branch of the tree. */
function variants(): Array<{ name: string; bp: Blueprint }> {
  const base = withMeta(emptyBlueprint());
  const out: Array<{ name: string; bp: Blueprint }> = [{ name: 'default self-hosted', bp: base }];

  for (const id of ['stack-supabase', 'stack-static']) {
    out.push({ name: id, bp: applyToggle(base, step('stack'), id) });
  }

  const ai = applyToggle(base, step('features'), 'feat-ai');
  out.push({ name: 'ai', bp: ai });
  out.push({ name: 'ai + parsing', bp: applyToggle(ai, step('ai-capabilities'), 'ai-parsing') });

  out.push({ name: 'rag', bp: applyToggle(base, step('features'), 'db-pgvector') });
  out.push({
    name: 'no auth',
    bp: applyToggle(applyToggle(base, step('features'), 'rbac-simple'), step('features'), 'auth-better-auth-jwt'),
  });
  out.push({ name: 'no storage', bp: applyToggle(base, step('features'), 'storage-minio') });
  out.push({ name: 'email service', bp: applyToggle(base, step('features'), 'feat-email') });
  out.push({ name: 'team with CI', bp: applyToggle(base, step('team'), 'infra-ci') });
  out.push({ name: 'browser worker', bp: applyToggle(base, step('features'), 'feat-browser-worker') });
  out.push({ name: 'cron', bp: applyToggle(base, step('features'), 'feat-cron') });
  out.push({ name: 'claude design', bp: applyToggle(base, step('design'), 'design-claude') });
  out.push({ name: 'tiny custom host', bp: withMeta(base, custom('2', { serverSwap: true })) });

  return out;
}

describe.each(variants())('generated output — $name', ({ bp }) => {
  const files = generateFiles(bp);
  const ctx = buildContext(bp);
  const byPath = (p: string) => files.find((f) => f.path === p);

  it('emits a prompt and never an empty file', () => {
    expect(files.length).toBeGreaterThan(3);
    expect(files[0]?.path).toBe('BOOTSTRAP_PROMPT.md');
    for (const f of files) expect(f.contents.trim().length, `${f.path} is empty`).toBeGreaterThan(0);
  });

  it('never leaks an unresolved value into a file', () => {
    for (const f of files) {
      expect(f.contents, `${f.path}`).not.toMatch(/undefined|NaN|\[object Object\]/);
    }
  });

  it('never leaks localised UI copy into the generated files', () => {
    // Everything an agent reads must be English, whatever the interface shows.
    const spanishOnly = selectedOptions(bp.selection)
      .map((o) => tx(o.description, 'es'))
      .filter((s) => s.length > 25);
    for (const f of files) {
      for (const phrase of spanishOnly) {
        expect(f.contents.includes(phrase), `${f.path} contains Spanish UI copy`).toBe(false);
      }
    }
  });

  it('writes one .env key per line, without duplicates', () => {
    const env = byPath('.env.example');
    expect(env).toBeDefined();
    const keys = (env?.contents ?? '')
      .split('\n')
      .filter((l) => /^[A-Z][A-Z0-9_]*=/.test(l))
      .map((l) => l.split('=')[0]);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('declares every env var the selected options need', () => {
    const env = byPath('.env.example')?.contents ?? '';
    for (const option of ctx.options) {
      for (const v of option.env ?? []) {
        expect(env.includes(`${v.key}=`), `${v.key} (from ${option.id}) missing from .env.example`).toBe(true);
      }
    }
  });

  it('keeps the compose files coherent with the selected services', () => {
    const dev = byPath('docker-compose.yml')?.contents ?? '';
    const prod = byPath('docker-compose.coolify.yml')?.contents ?? '';

    expect(/^networks:/m.test(prod), 'Coolify compose must not declare networks').toBe(false);
    expect(/^\s+ports:/m.test(prod), 'Coolify compose must not publish host ports').toBe(false);

    for (const [service, present] of [
      ['postgres', ctx.hasPostgres],
      ['minio', ctx.services.has('minio')],
      ['backend', ctx.hasBackend],
      ['worker', ctx.services.has('worker')],
    ] as const) {
      expect(new RegExp(`^  ${service}:`, 'm').test(dev), `${service} in dev compose`).toBe(present);
      expect(new RegExp(`^  ${service}:`, 'm').test(prod), `${service} in prod compose`).toBe(present);
    }
  });

  it('gives every production service a memory limit, a healthcheck and log rotation', () => {
    if (!ctx.hasBackend) {
      // A single container deploys from a Dockerfile; there is no compose file.
      expect(byPath('docker-compose.coolify.yml')).toBeUndefined();
      return;
    }
    const prod = byPath('docker-compose.coolify.yml')?.contents ?? '';
    // container_name is the only marker unique to a service block (top-level
    // keys like `volumes:` and the logging anchor share the same indentation).
    const services = prod.match(/^ {4}container_name:/gm) ?? [];
    expect(services.length).toBeGreaterThan(0);
    expect((prod.match(/mem_limit:/g) ?? []).length).toBe(services.length);
    expect((prod.match(/logging: \*default-logging/g) ?? []).length).toBe(services.length);
    expect((prod.match(/healthcheck:/g) ?? []).length).toBe(services.length);
  });

  it('ships a Dockerfile for every service it builds', () => {
    if (ctx.hasBackend) {
      expect(byPath('backend/Dockerfile.prod'), 'backend prod image').toBeDefined();
      expect(byPath('backend/docker-entrypoint.sh'), 'backend entrypoint').toBeDefined();
    } else {
      expect(byPath('backend/Dockerfile.prod')).toBeUndefined();
    }
    if (ctx.hasBackend) {
      expect(byPath('nginx/Dockerfile.prod')).toBeDefined();
      expect(byPath('Dockerfile')).toBeUndefined();
    } else {
      expect(byPath('Dockerfile')?.contents).toContain('COPY nginx.conf /etc/nginx/nginx.conf');
      expect(byPath('nginx.conf')).toBeDefined();
      expect(byPath('nginx/Dockerfile.prod')).toBeUndefined();
    }
  });

  it('writes the instructions for both agents, once', () => {
    expect(byPath('AGENTS.md')).toBeDefined();
    expect(byPath('CLAUDE.md')?.contents).toContain('@AGENTS.md');
    // Cursor reads AGENTS.md itself; a rule pointing at it is a third copy.
    expect(byPath('.cursor/rules/project.mdc')).toBeUndefined();
  });

  it('keeps server-side advice out of AGENTS.md when there is no server', () => {
    const agents = byPath('AGENTS.md')!.contents;
    if (!ctx.hasBackend) {
      // The build-heap cap still applies (the nginx image builds the bundle
      // with Node); the runtime heap advice does not.
      expect(agents).not.toContain('max-old-space-size=1280');
      expect(agents).not.toContain('limits already add up');
    }
    if (!ctx.hasDb && !ctx.hasSupabase) expect(agents).not.toMatch(/database/i);
    // Stated once, as a gotcha, not again as a constraint.
    expect(agents.split('Never add a `networks:` block').length - 1).toBe(0);
  });

  it('writes a CI workflow only when the team asked for one', () => {
    expect(Boolean(byPath('.github/workflows/ci.yml'))).toBe(ctx.has('infra-ci'));
  });

  it('runs Docker locally only when there is a stack to run', () => {
    expect(Boolean(byPath('docker-compose.yml'))).toBe(ctx.hasBackend);
    // Locally Vite serves the UI and proxies /api: there is no dev nginx at all.
    expect(byPath('nginx/nginx.conf')).toBeUndefined();
    if (ctx.hasBackend) {
      const dev = byPath('docker-compose.yml')!.contents;
      expect(dev).not.toMatch(/^ {2}nginx:/m);
      expect(dev).toContain('${FRONTEND_PORT:-5173}:5173');
    }
  });

  it('pins the Playwright package, the image and the build arg to one version', () => {
    if (!ctx.services.has('worker')) {
      expect(byPath('worker/Dockerfile.prod')).toBeUndefined();
      return;
    }
    const version = ctx.env.find((v) => v.key === 'PLAYWRIGHT_VERSION')?.value;
    expect(version).toBeTruthy();
    expect(ctx.deps.worker).toContain(`playwright@${version}`);
    expect(byPath('worker/Dockerfile.prod')!.contents).toContain(`ARG PLAYWRIGHT_VERSION=${version}`);
    const prod = byPath('docker-compose.coolify.yml')!.contents;
    expect(prod).toContain(`\${PLAYWRIGHT_VERSION:-${version}}`);
    expect(prod).toMatch(/ {2}worker:[\s\S]*?shm_size: 512m/);
  });

  it('serves presigned downloads through nginx whenever there is storage', () => {
    const prod = byPath('nginx/nginx.coolify.conf')?.contents ?? '';
    expect(prod.includes('location /app-files/')).toBe(ctx.services.has('minio'));
  });

  it('never describes a network split the production compose does not have', () => {
    for (const f of files) expect(f.contents, f.path).not.toMatch(/dmz_net|internal_net/);
  });

  it('keeps Prisma out of a project with no Prisma', () => {
    if (ctx.hasDb) return;
    for (const f of files) expect(f.contents, `${f.path}`).not.toMatch(/prisma/i);
  });
});

describe('prompt quality', () => {
  const bp = withMeta(emptyBlueprint());
  const prompt = generateFiles(bp)[0]!.contents;

  it('carries every section an agent needs, in order', () => {
    const sections = [
      '# Bootstrap prompt',
      '## Product',
      '## Architecture',
      '## Stack',
      '## Implementation plan',
      '## Conventions',
      '## Production budget',
      '## Known traps',
      '## Definition of done',
    ];
    let cursor = -1;
    for (const heading of sections) {
      const at = prompt.indexOf(heading);
      expect(at, `missing section: ${heading}`).toBeGreaterThan(-1);
      expect(at, `section out of order: ${heading}`).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it('includes the project description and the extra context verbatim', () => {
    expect(prompt).toContain(META.description);
    expect(prompt).toContain(META.extraContext);
  });

  it('gives a numbered plan and a checkable definition of done', () => {
    expect(prompt).toMatch(/^1\. /m);
    expect(prompt).toMatch(/^5\. /m);
    expect(prompt.match(/^- \[ \] /gm)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it('never plans the deployment before the stack is verified locally', () => {
    const verify = prompt.indexOf('bring the whole stack up from a clean checkout');
    const deploy = prompt.indexOf('Deploy on Coolify');
    expect(verify).toBeGreaterThan(-1);
    expect(deploy).toBeGreaterThan(verify);
  });

  it('names the traps in the prompt and spells them out once, in AGENTS.md', () => {
    const agents = generateFiles(bp).find((f) => f.path === 'AGENTS.md')!.contents;
    expect(prompt).toContain('NEVER declare a `networks:` block');
    expect(agents).toContain('exit 137');
    expect(agents).toContain('Always use `prisma db push`');
    // The bodies are not duplicated into the prompt.
    expect(prompt).not.toContain('exit 137** even when the host');
  });

  it('does not list the deployment and quality baselines as stack items', () => {
    expect(prompt).not.toContain('**Strict TypeScript everywhere**');
    expect(prompt).not.toContain('**nginx as the single published entrypoint**');
  });

  it('stays a readable length', () => {
    const words = prompt.split(/\s+/).length;
    expect(words).toBeGreaterThan(600);
    expect(words, 'the prompt is getting too long to be read').toBeLessThan(6000);
  });

  it('accepts a pasted URL as the domain without doubling the scheme', () => {
    for (const domain of ['https://vitals.controlc.io/', 'http://vitals.controlc.io/app', ' vitals.controlc.io ']) {
      const env = generateFiles(withMeta(emptyBlueprint(), { domain })).find((f) => f.path === '.env.example')!;
      expect(env.contents, domain).toContain('PUBLIC_URL=https://vitals.controlc.io\n');
    }
  });

  it('describes the Supabase architecture instead of the self-hosted one', () => {
    const sb = applyToggle(bp, step('stack'), 'stack-supabase');
    const text = generateFiles(sb)[0]!.contents;
    expect(text).toContain('Row Level Security');
    expect(text).not.toContain('Express 5');
    expect(text).not.toContain('prisma db push');
  });
});

describe('server sizing reaches the generated files', () => {
  const build = (meta: Partial<ProjectMeta>) => {
    const bp = withMeta(emptyBlueprint(), meta);
    const files = generateFiles(bp);
    return {
      ctx: buildContext(bp),
      prompt: files[0]!.contents,
      compose: files.find((f) => f.path === 'docker-compose.coolify.yml')!.contents,
      dockerfile: files.find((f) => f.path === 'backend/Dockerfile.prod')!.contents,
    };
  };

  it('reports the server the user picked', () => {
    const { prompt, compose } = build({});
    expect(prompt).toContain('**ControlC VPS**');
    expect(prompt).toContain('**15.3 GB**');
    expect(prompt).toContain('shared with other Coolify projects');
    expect(compose).toContain('ControlC VPS');
  });

  it('reports the RAM of a custom host', () => {
    const { prompt } = build(custom('32'));
    expect(prompt).toContain('**Custom host**');
    expect(prompt).toContain('**32 GB**');
  });

  it('puts the computed limits in the compose file and the prompt, and they agree', () => {
    const { ctx, prompt, compose } = build({ appSize: 'large' });
    for (const [service, limit] of Object.entries(ctx.memory.limits)) {
      const rendered = limit % 1024 === 0 ? `${limit / 1024}g` : `${limit}m`;
      expect(compose, `${service} limit missing from compose`).toContain(`mem_limit: ${rendered}`);
      expect(prompt, `${service} limit missing from prompt`).toContain(`| \`${service}\` | ${rendered} |`);
    }
  });

  it('scales the limits with the app size', () => {
    const small = build({ appSize: 'small' });
    const big = build({ appSize: 'large' });
    expect(big.ctx.memory.limits.backend!).toBeGreaterThan(small.ctx.memory.limits.backend!);
    expect(small.ctx.memory.limits.backend!).toBeGreaterThanOrEqual(512);
  });

  it('never gives a project more than the host has', () => {
    const { ctx } = build(custom('4', { appSize: 'large' }));
    expect(ctx.memory.availableGb).toBeLessThan(4);
    expect(ctx.memory.warnings.join(' ')).toContain('less than the 6 GB');
  });

  it('never lets the limits exceed the budget', () => {
    for (const ram of ['2', '4', '8', '16', '64']) {
      for (const appSize of ['small', 'medium', 'large'] as const) {
        const { ctx } = build(custom(ram, { appSize }));
        const claimed = Object.values(ctx.memory.limits).reduce((a, b) => a + b, 0);
        const budget = ctx.memory.availableGb * 1024;
        if (claimed > budget) {
          // Allowed only when the per-service minimums cannot fit, and then it
          // must say so out loud.
          expect(ctx.memory.warnings.join(' ')).toContain('minimums');
        }
      }
    }
  });

  it('keeps the V8 heap below the container limit', () => {
    for (const ram of ['2', '4', '16', '64']) {
      const { ctx, compose, dockerfile } = build(custom(ram, { appSize: 'large' }));
      expect(ctx.memory.nodeHeap).toBeLessThan(ctx.memory.limits.backend!);
      expect(compose).toContain(`--max-old-space-size=${ctx.memory.nodeHeap}`);
      expect(dockerfile).toContain(`--max-old-space-size=${ctx.memory.buildHeap}`);
    }
  });

  it('warns about a missing swap file everywhere it matters', () => {
    const without = build(custom('8', { serverSwap: false }));
    expect(without.prompt).toContain('add one before the first deploy');
    expect(without.compose).toContain('no swap file');

    const withSwap = build(custom('8', { serverSwap: true }));
    expect(withSwap.prompt).toContain('Swap file on the host: **yes**');
    expect(withSwap.compose).not.toContain('no swap file');
  });

  it('does not claim swap on a known server nobody has checked', () => {
    const { prompt, compose } = build({ serverSwap: true });
    expect(prompt).toContain('Swap file on the host: **unconfirmed');
    expect(compose).toContain('swapon --show');
  });

  it('warns when the host is too small for the stack', () => {
    const { ctx } = build(custom('2'));
    expect(ctx.memory.warnings.length).toBeGreaterThan(0);
  });

  it('survives nonsense input instead of emitting NaN', () => {
    const { ctx, compose } = build(custom('', { appSize: 'huge' as never }));
    expect(Number.isFinite(ctx.memory.availableGb)).toBe(true);
    expect(compose).not.toMatch(/NaN|undefined/);
  });
});
