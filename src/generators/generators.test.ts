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
  slug: 'folio-app',
  description: 'RAG document intelligence platform.',
  domain: 'folio.example.com',
  httpPort: '80',
  extraContext: 'Customers are imported from an ERP nightly.',
  serverRamGb: '16',
  serverOtherGb: '6',
  serverSwap: false,
};

const withMeta = (bp: Blueprint, meta: Partial<ProjectMeta> = {}): Blueprint => ({
  ...bp,
  meta: { ...META, ...meta },
});

/** One blueprint per meaningfully different branch of the tree. */
function variants(): Array<{ name: string; bp: Blueprint }> {
  const base = withMeta(emptyBlueprint());
  const out: Array<{ name: string; bp: Blueprint }> = [{ name: 'default self-hosted', bp: base }];

  for (const id of ['stack-supabase', 'stack-static', 'stack-api-only']) {
    out.push({ name: id, bp: applyToggle(base, step('stack'), id) });
  }

  out.push({ name: 'cursor', bp: applyToggle(base, step('agent'), 'agent-cursor') });
  out.push({ name: 'both agents', bp: applyToggle(base, step('agent'), 'agent-both') });

  const ai = applyToggle(base, step('backend'), 'feat-ai');
  out.push({ name: 'ai + openrouter', bp: ai });
  out.push({ name: 'ai + direct sdks', bp: applyToggle(ai, step('ai-provider'), 'ai-direct') });
  out.push({ name: 'ai + ollama', bp: applyToggle(ai, step('ai-provider'), 'ai-local') });

  out.push({ name: 'rag', bp: applyToggle(base, step('database'), 'db-pgvector') });
  out.push({ name: 'no auth', bp: applyToggle(applyToggle(base, step('auth'), 'rbac-simple'), step('auth'), 'auth-better-auth-jwt') });
  out.push({ name: 'no storage', bp: applyToggle(base, step('storage'), 'storage-minio') });
  out.push({ name: 'email service', bp: applyToggle(base, step('backend'), 'feat-email') });
  out.push({ name: 'tiny host', bp: withMeta(base, { serverRamGb: '2', serverOtherGb: '0', serverSwap: true }) });

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
    ] as const) {
      expect(new RegExp(`^  ${service}:`, 'm').test(dev), `${service} in dev compose`).toBe(present);
      expect(new RegExp(`^  ${service}:`, 'm').test(prod), `${service} in prod compose`).toBe(present);
    }
  });

  it('gives every production service a memory limit, a healthcheck and log rotation', () => {
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
    expect(byPath('nginx/Dockerfile.prod')).toBeDefined();
  });

  it('writes the agent instruction files the agent step asked for', () => {
    expect(Boolean(byPath('CLAUDE.md'))).toBe(ctx.forClaude);
    expect(Boolean(byPath('.cursor/rules/project.mdc'))).toBe(ctx.forCursor);
    expect(Boolean(byPath('AGENTS.md'))).toBe(ctx.forClaude && ctx.forCursor);
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

  it('does not repeat the architecture in the stack list', () => {
    const topology = 'Network topology: `dmz_net`';
    expect(prompt.split(topology).length - 1, 'topology stated twice').toBeLessThanOrEqual(1);
  });

  it('spells out the traps rather than naming them', () => {
    expect(prompt).toContain('NEVER declare a `networks:` block');
    expect(prompt).toContain('prisma db push');
    expect(prompt).toContain('exit 137');
  });

  it('stays a readable length', () => {
    const words = prompt.split(/\s+/).length;
    expect(words).toBeGreaterThan(600);
    expect(words, 'the prompt is getting too long to be read').toBeLessThan(6000);
  });

  it('describes the Supabase architecture instead of the self-hosted one', () => {
    const sb = applyToggle(bp, step('stack'), 'stack-supabase');
    const text = generateFiles(sb)[0]!.contents;
    expect(text).toContain('Row Level Security');
    expect(text).not.toContain('Express 4');
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
      readme: files.find((f) => f.path === 'README.md')!.contents,
    };
  };

  it('reports the host size the user typed', () => {
    const { prompt, readme } = build({ serverRamGb: '16', serverOtherGb: '6' });
    expect(prompt).toContain('**16 GB**');
    expect(prompt).toContain('6 GB is already claimed by other stacks');
    expect(readme).toContain('**16 GB**');
  });

  it('puts the computed limits in the compose file and the prompt, and they agree', () => {
    const { ctx, prompt, compose } = build({ serverRamGb: '16', serverOtherGb: '6' });
    for (const [service, limit] of Object.entries(ctx.memory.limits)) {
      const rendered = limit % 1024 === 0 ? `${limit / 1024}g` : `${limit}m`;
      expect(compose, `${service} limit missing from compose`).toContain(`mem_limit: ${rendered}`);
      expect(prompt, `${service} limit missing from prompt`).toContain(`| \`${service}\` | ${rendered} |`);
    }
  });

  it('scales the limits with the host', () => {
    const small = build({ serverRamGb: '2', serverOtherGb: '0' });
    const big = build({ serverRamGb: '32', serverOtherGb: '0' });
    expect(big.ctx.memory.limits.backend!).toBeGreaterThan(small.ctx.memory.limits.backend!);
    expect(small.ctx.memory.limits.backend!).toBeGreaterThanOrEqual(512);
  });

  it('never lets the limits exceed what the host has', () => {
    for (const ram of ['2', '4', '8', '16', '64']) {
      for (const other of ['0', '1', '6']) {
        const { ctx } = build({ serverRamGb: ram, serverOtherGb: other });
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
      const { ctx, compose, dockerfile } = build({ serverRamGb: ram });
      expect(ctx.memory.nodeHeap).toBeLessThan(ctx.memory.limits.backend!);
      expect(compose).toContain(`--max-old-space-size=${ctx.memory.nodeHeap}`);
      expect(dockerfile).toContain(`--max-old-space-size=${ctx.memory.buildHeap}`);
    }
  });

  it('warns about a missing swap file everywhere it matters', () => {
    const without = build({ serverSwap: false });
    expect(without.prompt).toContain('add one before the first deploy');
    expect(without.compose).toContain('no swap file');
    expect(without.readme).toContain('there is none today');

    const withSwap = build({ serverSwap: true });
    expect(withSwap.prompt).toContain('Swap file on the host: **yes**');
    expect(withSwap.compose).not.toContain('no swap file');
  });

  it('warns when the host is too small for the stack', () => {
    const { ctx } = build({ serverRamGb: '2', serverOtherGb: '0' });
    expect(ctx.memory.warnings.length).toBeGreaterThan(0);
  });

  it('survives nonsense input instead of emitting NaN', () => {
    const { ctx, compose } = build({ serverRamGb: '', serverOtherGb: 'abc' });
    expect(Number.isFinite(ctx.memory.availableGb)).toBe(true);
    expect(compose).not.toMatch(/NaN|undefined/);
  });
});
