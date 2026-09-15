import { GOTCHAS, type Gotcha } from '@/catalog/gotchas';
import type { Blueprint, EnvVar, ProjectMeta, ServiceId, TechOption } from '@/catalog/types';
import { selectedIds, selectedOptions } from '@/lib/blueprint';
import { planMemory, type MemoryPlan } from '@/lib/memory';
import { envName, slugify } from '@/lib/utils';

/** Everything the generators need, derived once from the blueprint. */
export interface Ctx {
  meta: ProjectMeta;
  name: string;
  slug: string;
  envPrefix: string;
  ids: Set<string>;
  options: TechOption[];
  services: Set<ServiceId>;
  env: EnvVar[];
  gotchas: Gotcha[];
  deps: {
    frontend: string[];
    frontendDev: string[];
    backend: string[];
    backendDev: string[];
    worker: string[];
    workerDev: string[];
  };
  memory: MemoryPlan;
  has: (id: string) => boolean;
  hasFrontend: boolean;
  hasBackend: boolean;
  hasSupabase: boolean;
  hasDb: boolean;
  hasPostgres: boolean;
  hasPgvector: boolean;
  hasNginx: boolean;
  hasCoolify: boolean;
  hasComposeDev: boolean;
}

function uniq(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export function buildContext(bp: Blueprint): Ctx {
  const ids = selectedIds(bp.selection);
  const options = selectedOptions(bp.selection);
  const has = (id: string) => ids.has(id);

  // Generated files are English: this fallback lands in every one of them.
  const name = bp.meta.name.trim() || 'New project';
  const slug = slugify(bp.meta.name) || 'app';

  const services = new Set<ServiceId>();
  for (const o of options) for (const s of o.services ?? []) services.add(s);

  const hasFrontend = has('fe-react-vite');
  const hasBackend = has('backend-express');
  const hasNginx = has('infra-nginx');
  if (hasFrontend) services.add('frontend');
  if (hasNginx) services.add('nginx');

  const env: EnvVar[] = [];
  const seenEnv = new Set<string>();
  for (const o of options) {
    for (const v of o.env ?? []) {
      if (seenEnv.has(v.key)) continue;
      seenEnv.add(v.key);
      env.push(v);
    }
  }

  const gotchaIds = new Set(options.flatMap((o) => o.gotchas ?? []));
  const gotchas = GOTCHAS.filter((g) => gotchaIds.has(g.id) || g.when.some((id) => ids.has(id)));

  return {
    meta: bp.meta,
    name,
    slug,
    envPrefix: envName(slug),
    ids,
    options,
    services,
    env,
    gotchas,
    // A workspace that does not exist gets no dependencies, however many
    // cross-cutting options (testing, linting) would otherwise contribute to it.
    deps: {
      frontend: hasFrontend ? uniq(options.flatMap((o) => o.deps?.frontend ?? [])) : [],
      frontendDev: hasFrontend ? uniq(options.flatMap((o) => o.deps?.frontendDev ?? [])) : [],
      backend: hasBackend ? uniq(options.flatMap((o) => o.deps?.backend ?? [])) : [],
      backendDev: hasBackend ? uniq(options.flatMap((o) => o.deps?.backendDev ?? [])) : [],
      worker: services.has('worker') ? uniq(options.flatMap((o) => o.deps?.worker ?? [])) : [],
      workerDev: services.has('worker') ? uniq(options.flatMap((o) => o.deps?.workerDev ?? [])) : [],
    },
    memory: planMemory(bp.meta, services),
    has,
    hasFrontend,
    hasBackend,
    hasSupabase: has('stack-supabase'),
    hasDb: has('db-postgres-prisma'),
    hasPostgres: has('db-postgres-prisma'),
    hasPgvector: has('db-pgvector'),
    hasNginx,
    hasCoolify: has('infra-coolify'),
    hasComposeDev: has('infra-compose-dev'),
  };
}

/** Join non-empty sections with a blank line between them. */
export function joinSections(parts: (string | false | null | undefined)[]): string {
  return parts.filter((p): p is string => Boolean(p && p.trim())).join('\n\n');
}
