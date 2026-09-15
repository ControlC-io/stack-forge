import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { STEPS } from '@/catalog/steps';
import type { Blueprint, GeneratedFile, ProjectMeta, Step } from '@/catalog/types';
import { applyToggle, emptyBlueprint } from '@/lib/blueprint';
import { generateFiles } from '.';
import { buildContext, type Ctx } from './context';
import { quickstart } from '@/lib/quickstart';
import { grouped, groupOf } from '@/lib/fileGroups';

/**
 * Whole-project simulations.
 *
 * Where generators.test.ts asserts individual facts, this file takes each
 * blueprint as a deliverable and audits it the way a reviewer would: does the
 * YAML parse, does every `${VAR}` exist, does every COPY have something to
 * copy, does the documentation describe the project that was actually emitted.
 */

const step = (id: string): Step => STEPS.find((s) => s.id === id)!;

const META: ProjectMeta = {
  name: 'Folio App',
  description: 'RAG document intelligence platform.',
  domain: 'folio.example.com',
  extraContext: '',
  serverId: 'controlc-vps',
  appSize: 'medium',
  serverRamGb: '16',
  serverSwap: true,
};

interface Sim {
  name: string;
  bp: Blueprint;
}

/** A matrix wide enough to hit every branch, and every pair that interacts. */
function simulations(): Sim[] {
  const base: Blueprint = { ...emptyBlueprint(), meta: META };
  const sims: Sim[] = [];
  const add = (name: string, bp: Blueprint) => sims.push({ name, bp });

  add('01 default self-hosted', base);

  // Shape branches.
  for (const stack of ['stack-supabase', 'stack-static']) {
    add(`02 ${stack}`, applyToggle(base, step('stack'), stack));
  }

  // The full RAG shape: vector database + embeddings + parsing + uploads.
  let rag = applyToggle(base, step('features'), 'db-pgvector');
  rag = applyToggle(rag, step('features'), 'feat-ai');
  rag = applyToggle(rag, step('ai-capabilities'), 'ai-embeddings');
  rag = applyToggle(rag, step('ai-capabilities'), 'ai-parsing');
  add('04 full RAG', rag);


  // Supabase with everything, and Supabase stripped to the bone.
  let sbFull = applyToggle(base, step('stack'), 'stack-supabase');
  for (const id of ['sb-storage', 'sb-vector', 'sb-realtime']) {
    sbFull = applyToggle(sbFull, step('supabase'), id);
  }
  add('07 supabase full', sbFull);

  let sbBare = applyToggle(base, step('stack'), 'stack-supabase');
  for (const id of ['sb-rls', 'sb-auth']) sbBare = applyToggle(sbBare, step('supabase'), id);
  add('08 supabase bare', sbBare);

  // Stripping the self-hosted stack down: no login, no files, no extras.
  let bare = base;
  for (const id of ['rbac-simple', 'auth-better-auth-jwt', 'storage-minio']) {
    bare = applyToggle(bare, step('features'), id);
  }
  add('09 bare API', bare);

  // CI on each shape: the workflow must only reference workspaces that exist.
  add('09b fullstack + CI', applyToggle(base, step('team'), 'infra-ci'));
  add('09c static + CI', applyToggle(applyToggle(base, step('stack'), 'stack-static'), step('team'), 'infra-ci'));

  // Every feature at once.
  let loaded = base;
  for (const id of ['feat-email', 'feat-jobs', 'feat-ai', 'db-pgvector']) {
    loaded = applyToggle(loaded, step('features'), id);
  }
  add('10 every feature', loaded);

  // The scraper shape (pmp-scrapper, vitals): a Playwright worker on a schedule.
  let scraper = applyToggle(base, step('features'), 'feat-browser-worker');
  scraper = applyToggle(scraper, step('features'), 'feat-cron');
  scraper = applyToggle(scraper, step('team'), 'infra-ci');
  add('10b browser worker + cron + CI', { ...scraper, meta: { ...META, appSize: 'large' } });

  // Every interface extra at once, on each shape.
  for (const stack of ['stack-fullstack', 'stack-static']) {
    // Toggling the already-selected branch would deselect it.
    let ui = stack === 'stack-fullstack' ? base : applyToggle(base, step('stack'), stack);
    for (const id of ['ui-i18n', 'ui-charts', 'ui-markdown']) ui = applyToggle(ui, step('ui'), id);
    add(`11 interface extras (${stack})`, ui);
  }

  // Servers and sizes, including a host that cannot fit the stack.
  add('12 tiny custom host', { ...base, meta: { ...META, serverId: 'custom', serverRamGb: '2', serverSwap: false } });
  add('13 huge custom host', { ...base, meta: { ...META, serverId: 'custom', serverRamGb: '64', appSize: 'large' } });
  add('14 small app', { ...base, meta: { ...META, appSize: 'small' } });
  add('15 empty meta', { ...emptyBlueprint() });

  return sims;
}

interface Project {
  ctx: Ctx;
  files: GeneratedFile[];
  file: (path: string) => string | undefined;
  paths: Set<string>;
}

function build(bp: Blueprint): Project {
  const files = generateFiles(bp);
  return {
    ctx: buildContext(bp),
    files,
    file: (path) => files.find((f) => f.path === path)?.contents,
    paths: new Set(files.map((f) => f.path)),
  };
}

/** `${VAR}`, `${VAR:-default}`, `${VAR:?message}` */
function interpolations(yaml: string): Array<{ key: string; required: boolean }> {
  const out: Array<{ key: string; required: boolean }> = [];
  for (const m of yaml.matchAll(/\$\{([A-Z_][A-Z0-9_]*)(:([-?]))?[^}]*\}/g)) {
    out.push({ key: m[1]!, required: m[3] !== '-' });
  }
  return out;
}

function envKeys(envExample: string): Set<string> {
  return new Set(
    envExample
      .split('\n')
      .map((l) => l.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
      .filter((k): k is string => Boolean(k)),
  );
}

describe.each(simulations())('simulation — $name', ({ bp }) => {
  const project = build(bp);
  const { ctx, files, file, paths } = project;

  it('produces valid YAML for every compose file', () => {
    for (const f of files.filter((x) => x.language === 'yaml')) {
      expect(() => parse(f.contents), `${f.path} does not parse`).not.toThrow();
      const doc = parse(f.contents) as Record<string, unknown>;
      expect(doc, `${f.path} parsed to nothing`).toBeTruthy();
    }
  });

  it('declares at least one service and no empty service in each compose file', () => {
    for (const f of files.filter((x) => x.path.startsWith('docker-compose'))) {
      const doc = parse(f.contents) as { services?: Record<string, unknown> };
      const services = Object.entries(doc.services ?? {});
      expect(services.length, `${f.path} has no services`).toBeGreaterThan(0);
      for (const [name, body] of services) {
        expect(body, `${f.path}: service "${name}" is empty`).toBeTruthy();
        const svc = body as Record<string, unknown>;
        expect(
          Boolean(svc.image || svc.build),
          `${f.path}: service "${name}" has neither image nor build`,
        ).toBe(true);
      }
    }
  });

  it('resolves every required ${VAR} from .env.example', () => {
    const known = envKeys(file('.env.example') ?? '');
    for (const f of files.filter((x) => x.path.startsWith('docker-compose'))) {
      for (const { key, required } of interpolations(f.contents)) {
        if (!required) continue;
        expect(known.has(key), `${f.path} needs ${key}, which .env.example never defines`).toBe(true);
      }
    }
  });

  it('points every build at a Dockerfile it actually emits', () => {
    for (const f of files.filter((x) => x.path.startsWith('docker-compose'))) {
      const doc = parse(f.contents) as {
        services?: Record<string, { build?: string | { context?: string; dockerfile?: string } }>;
      };
      for (const [name, svc] of Object.entries(doc.services ?? {})) {
        const build = svc.build;
        if (!build || typeof build === 'string') continue; // dev images build from a directory
        if (!build.dockerfile) continue;
        const context = (build.context ?? '.').replace(/^\.\/?/, '');
        const path = [context, build.dockerfile].filter(Boolean).join('/').replace(/^\/+/, '');
        // A prod Dockerfile is ours to ship; a dev one may live in a folder the
        // agent creates, so only assert on the files this tool is responsible for.
        if (!path.endsWith('.prod')) continue;
        expect(paths.has(path), `${f.path}: service "${name}" builds ${path}, which is not generated`).toBe(
          true,
        );
      }
    }
  });

  it('copies only config files it also emits', () => {
    for (const f of files.filter((x) => x.language === 'dockerfile')) {
      for (const m of f.contents.matchAll(/^COPY (?!--from)(\S+) /gm)) {
        const source = m[1]!;
        // Anything the agent will write (src, package.json) is out of scope;
        // these are the files this generator is responsible for.
        if (!/\.(conf|sh)$/.test(source)) continue;
        const candidates = [source, `${f.path.split('/')[0]}/${source}`];
        expect(
          candidates.some((c) => paths.has(c)),
          `${f.path} copies ${source}, which is not generated`,
        ).toBe(true);
      }
    }
  });

  it('proxies to a backend only when there is a backend', () => {
    for (const f of files.filter((x) => x.language === 'nginx')) {
      expect(f.contents.includes('proxy_pass http://backend:3000'), `${f.path}`).toBe(ctx.hasBackend);
    }
    // The dev proxy targets the Vite container, which only exists with a UI.
    const dev = file('nginx/nginx.conf');
    if (dev) expect(dev.includes('proxy_pass http://frontend:5173')).toBe(ctx.hasFrontend);
  });

  it('documents the project it actually generated', () => {
    const prompt = file('BOOTSTRAP_PROMPT.md') ?? '';
    expect(prompt.includes('docker compose up --build')).toBe(ctx.hasComposeDev);
    // A static project deploys a single Dockerfile, with no compose file at all.
    expect(prompt.includes('docker-compose.coolify.yml')).toBe(ctx.hasCoolify && ctx.hasBackend);

    // Whichever file carries the rules — AGENTS.md when two agents share them.
    const instructions = file('AGENTS.md') ?? file('CLAUDE.md') ?? file('.cursor/rules/project.mdc');
    if (instructions) {
      expect(instructions.includes('prisma:push')).toBe(ctx.hasDb);
      expect(instructions.includes('npx supabase')).toBe(ctx.hasSupabase);
    }
  });

  it('mentions a dependency only when it installs it', () => {
    const prompt = file('BOOTSTRAP_PROMPT.md') ?? '';
    const all = [
      ...ctx.deps.frontend,
      ...ctx.deps.frontendDev,
      ...ctx.deps.backend,
      ...ctx.deps.backendDev,
      ...ctx.deps.worker,
      ...ctx.deps.workerDev,
    ];

    // Only the install lines count: prose legitimately contains words like
    // "next", and a package name inside a sentence is not an install.
    const installed = new Set(
      (prompt.match(/^npm i (-D )?.+$/gm) ?? []).flatMap((line) =>
        line.replace(/^npm i (-D )?/, '').split(/\s+/),
      ),
    );

    for (const dep of all) expect(installed.has(dep), `${dep} is never installed`).toBe(true);
    for (const dep of installed) {
      expect(all.includes(dep), `${dep} is installed but no selected option asked for it`).toBe(true);
    }
  });

  it('gives a quickstart that matches the project', () => {
    const steps = quickstart(ctx);
    expect(steps.length).toBeGreaterThanOrEqual(4);
    const text = JSON.stringify(steps);
    expect(text.includes('docker compose up --build')).toBe(ctx.hasComposeDev);
    expect(text.includes('supabase.com')).toBe(ctx.hasSupabase);
    expect(text.includes('Coolify')).toBe(ctx.hasCoolify);
  });

  it('never gives advice about something the project does not have', () => {
    // Orphan advice is the failure mode this whole file exists to catch: text
    // inherited from a richer stack that quietly describes a different project.
    const prompt = file('BOOTSTRAP_PROMPT.md') ?? '';
    const forbidden: Array<[boolean, string[]]> = [
      [
        !ctx.hasBackend,
        ['backend:3000', '/api/health/live', 'Express', "The API's V8 heap", 'supertest', 'multer'],
      ],
      [!ctx.hasFrontend, ['react-router', 'Tailwind', 'Vite', 'the frontend', 'the frontends']],
      [!ctx.services.has('worker'), ['Playwright', 'Chromium']],
      [!ctx.hasDb && !ctx.hasSupabase, ['postgres', 'Postgres', 'prisma']],
      [!ctx.hasSupabase, ['anon key', 'Row Level Security']],
      [!ctx.has('feat-ai'), ['OPENROUTER_API_KEY', 'LLM_MODEL']],
      [!ctx.services.has('minio'), ['MinIO', 'presigned']],
    ];

    for (const [applies, phrases] of forbidden) {
      if (!applies) continue;
      for (const phrase of phrases) {
        // Word boundaries: "Vitest" must not count as a mention of "Vite".
        const found = new RegExp(`\\b${phrase.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`).test(prompt);
        expect(found, `prompt mentions "${phrase}" but the project has no such thing`).toBe(false);
      }
    }
  });

  it('installs dependencies only into workspaces that exist', () => {
    if (!ctx.hasBackend) expect([...ctx.deps.backend, ...ctx.deps.backendDev]).toEqual([]);
    if (!ctx.hasFrontend) expect([...ctx.deps.frontend, ...ctx.deps.frontendDev]).toEqual([]);
    if (!ctx.services.has('worker')) expect([...ctx.deps.worker, ...ctx.deps.workerDev]).toEqual([]);
  });

  it('keeps every markdown heading non-empty', () => {
    for (const f of files.filter((x) => x.language === 'markdown')) {
      const sections = f.contents.split(/^## /m).slice(1);
      for (const section of sections) {
        const [heading, ...body] = section.split('\n');
        expect(body.join('\n').trim().length, `${f.path}: "${heading}" is an empty section`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  it('puts every file in exactly one group, and never duplicates one', () => {
    const buckets = grouped(files);
    const total = buckets.reduce((acc, b) => acc + b.files.length, 0);
    expect(total, 'a file is missing from the grouping').toBe(files.length);
    expect(new Set(files.map((f) => f.path)).size, 'duplicate path').toBe(files.length);
  });

  it('states the rules once, however many agents read them', () => {
    // The reading burden is what matters, not the file count: exactly two
    // documents carry content — the prompt and one instruction file. Any others
    // are pointers to it.
    const docs = files.filter((f) => groupOf(f) === 'documents');
    expect(docs.some((f) => f.path === 'BOOTSTRAP_PROMPT.md')).toBe(true);

    const substantial = docs.filter((f) => f.contents.length > 800);
    expect(
      substantial.map((f) => f.path),
      'more than one instruction file carries the full rules',
    ).toHaveLength(2);

    if (docs.length > 2) {
      for (const pointer of docs.filter((f) => !substantial.includes(f))) {
        expect(pointer.contents, `${pointer.path} should point at the shared file`).toMatch(/AGENTS\.md/);
      }
    }
  });

  it('writes no Spanish or French into the generated files', () => {
    // The UI is translated; the output an agent reads never is.
    for (const f of files) {
      expect(f.contents, f.path).not.toMatch(/Nuevo proyecto|[áéíóúñ¿¡àèùçœ]/i);
    }
  });

  it('ends every file with exactly one trailing newline', () => {
    for (const f of files) {
      expect(f.contents.endsWith('\n'), `${f.path} has no trailing newline`).toBe(true);
      expect(f.contents.endsWith('\n\n\n'), `${f.path} ends with blank lines`).toBe(false);
    }
  });
});
