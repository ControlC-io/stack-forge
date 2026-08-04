import { GOTCHAS, type Gotcha } from '@/catalog/gotchas';
import type { Blueprint, EnvVar, ProjectMeta, ServiceId, TechOption } from '@/catalog/types';
import { selectedIds, selectedOptions } from '@/lib/blueprint';
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
  deps: { frontend: string[]; frontendDev: string[]; backend: string[]; backendDev: string[] };
  has: (id: string) => boolean;
  hasFrontend: boolean;
  hasBackend: boolean;
  hasDb: boolean;
  hasPostgres: boolean;
  hasNginx: boolean;
  hasCoolify: boolean;
  hasComposeDev: boolean;
  forClaude: boolean;
  forCursor: boolean;
}

function uniq(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export function buildContext(bp: Blueprint): Ctx {
  const ids = selectedIds(bp.selection);
  const options = selectedOptions(bp.selection);
  const has = (id: string) => ids.has(id);

  const name = bp.meta.name.trim() || 'Nuevo proyecto';
  const slug = slugify(bp.meta.slug || bp.meta.name) || 'app';

  const services = new Set<ServiceId>();
  for (const o of options) for (const s of o.services ?? []) services.add(s);

  const hasFrontend = has('fe-react-vite') || has('fe-nextjs');
  const hasBackend = has('backend-express') || has('backend-fastify');
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
    deps: {
      frontend: uniq(options.flatMap((o) => o.deps?.frontend ?? [])),
      frontendDev: uniq(options.flatMap((o) => o.deps?.frontendDev ?? [])),
      backend: uniq(options.flatMap((o) => o.deps?.backend ?? [])),
      backendDev: uniq(options.flatMap((o) => o.deps?.backendDev ?? [])),
    },
    has,
    hasFrontend,
    hasBackend,
    hasDb: has('db-postgres-prisma') || has('db-postgres-pgvector') || has('db-sqlite-prisma'),
    hasPostgres: has('db-postgres-prisma') || has('db-postgres-pgvector'),
    hasNginx,
    hasCoolify: has('infra-coolify'),
    hasComposeDev: has('infra-compose-dev'),
    forClaude: has('agent-claude-code') || has('agent-both'),
    forCursor: has('agent-cursor') || has('agent-both'),
  };
}

/** Join non-empty sections with a blank line between them. */
export function joinSections(parts: (string | false | null | undefined)[]): string {
  return parts.filter((p): p is string => Boolean(p && p.trim())).join('\n\n');
}
