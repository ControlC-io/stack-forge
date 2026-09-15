import { APP_SIZES, serverById } from '@/catalog/servers';
import type { ProjectMeta, ServiceId } from '@/catalog/types';

/**
 * Container memory budget for the Coolify host.
 *
 * A service that exceeds its own `mem_limit` is OOM-killed (exit 137) even with
 * gigabytes free on the box, so these numbers have to come from the real host
 * and the share this project may take of it. Everything here is in MB unless
 * the name says GB.
 */
export interface MemoryPlan {
  /** Display name of the host, English. */
  hostLabel: string;
  totalGb: number;
  /** Several projects live on this host. */
  shared: boolean;
  /** What the chosen app size asks for. */
  requestedGb: number;
  /** What this stack actually gets: the request, capped by the host. */
  availableGb: number;
  limits: Partial<Record<ServiceId, number>>;
  /** V8 heap cap for the API, deliberately below its container limit. */
  nodeHeap: number;
  /** V8 heap cap for the Playwright worker: lower still, the browser lives outside it. */
  workerHeap: number;
  /** V8 heap cap for the build stages, which run on the production host. */
  buildHeap: number;
  /** null: nobody has confirmed whether the host has swap. */
  swap: boolean | null;
  /** English, rendered into the generated docs. */
  warnings: string[];
}

/** Coolify's own stack plus the OS. Measured, not guessed. */
const HOST_RESERVE_GB = 1.2;

const WEIGHTS: Record<string, number> = {
  backend: 0.45,
  postgres: 0.3,
  minio: 0.1,
  email_service: 0.05,
  nginx: 0.04,
  // As heavy as the API: a Chromium page easily outweighs a Node request.
  worker: 0.45,
};

const BOUNDS: Record<string, { min: number; max: number }> = {
  worker: { min: 768, max: 4096 },
  backend: { min: 512, max: 4096 },
  postgres: { min: 512, max: 4096 },
  minio: { min: 256, max: 1024 },
  email_service: { min: 128, max: 256 },
  nginx: { min: 128, max: 256 },
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const roundTo = (v: number, step: number) => Math.round(v / step) * step;

function num(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function planMemory(meta: ProjectMeta, services: Set<ServiceId>): MemoryPlan {
  const server = serverById(meta.serverId);
  const totalGb = server ? server.ramGb : clamp(num(meta.serverRamGb, 4), 1, 256);
  const shared = server?.shared ?? false;
  const swap = server ? (server.swap ?? null) : meta.serverSwap;
  const hostLabel = server?.label ?? 'Custom host';

  const requestedGb = (APP_SIZES[meta.appSize] ?? APP_SIZES.medium).gb;
  const hostFreeGb = Math.max(0.75, totalGb - HOST_RESERVE_GB);
  const availableGb = Math.min(requestedGb, hostFreeGb);

  // Only the services this project actually runs compete for the budget.
  const present = [...services].filter((s) => s !== 'frontend' && WEIGHTS[s] !== undefined);
  const weightSum = present.reduce((acc, s) => acc + (WEIGHTS[s] ?? 0), 0) || 1;

  const limits: Partial<Record<ServiceId, number>> = {};
  for (const service of present) {
    const share = ((WEIGHTS[service] ?? 0) / weightSum) * availableGb * 1024;
    const bound = BOUNDS[service] ?? { min: 128, max: 1024 };
    limits[service] = clamp(roundTo(share, 128), bound.min, bound.max);
  }

  // Leave room for off-heap buffers: uploads, base64 re-encoding, native libs.
  const backendLimit = limits.backend ?? 1024;
  const nodeHeap = Math.max(256, roundTo(backendLimit * 0.65, 64));
  const buildHeap = clamp(nodeHeap, 512, 1024);
  const workerHeap = Math.max(256, roundTo((limits.worker ?? 1024) * 0.4, 64));

  const warnings: string[] = [];
  const claimed = Object.values(limits).reduce((a, b) => a + b, 0);
  if (availableGb < requestedGb) {
    warnings.push(
      `The host only has ${hostFreeGb.toFixed(1)} GB left after the OS and Coolify, less than the ${requestedGb} GB this project asked for. The limits below are ceilings, not reservations — do not raise one without lowering another.`,
    );
  }
  if (claimed > availableGb * 1024) {
    warnings.push(
      'The per-service minimums add up to more than the available memory. Either give the project a larger size or drop a service (MinIO and the email service are the usual candidates).',
    );
  }
  if (shared) {
    warnings.push(
      `${hostLabel} is shared with other Coolify projects. These limits are this project's share, not the machine's: raising them takes memory from a neighbour.`,
    );
  }
  if (swap === false) {
    warnings.push(
      'There is no swap file on this host. Add one (4 GB is plenty) before the first deploy: without it a single spike kills a container instead of slowing it down.',
    );
  }
  if (swap === null) {
    warnings.push(
      'Nobody has confirmed a swap file on this host. Check with `swapon --show` before the first deploy: without swap a single spike kills a container instead of slowing it down.',
    );
  }

  return {
    hostLabel,
    totalGb,
    shared,
    requestedGb,
    availableGb,
    limits,
    nodeHeap,
    workerHeap,
    buildHeap,
    swap,
    warnings,
  };
}

export function mb(value: number): string {
  return value >= 1024 && value % 1024 === 0 ? `${value / 1024}g` : `${value}m`;
}
