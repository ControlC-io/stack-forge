import type { ProjectMeta, ServiceId } from '@/catalog/types';

/**
 * Container memory budget for the Coolify host.
 *
 * A service that exceeds its own `mem_limit` is OOM-killed (exit 137) even with
 * gigabytes free on the box, so these numbers have to come from the real host
 * size rather than from a template default. Everything here is in MB.
 */
export interface MemoryPlan {
  totalGb: number;
  otherGb: number;
  /** GB left for this stack after the OS and Coolify's own containers. */
  availableGb: number;
  limits: Partial<Record<ServiceId, number>>;
  /** V8 heap cap for the API, deliberately below its container limit. */
  nodeHeap: number;
  /** V8 heap cap for the build stages, which run on the production host. */
  buildHeap: number;
  swap: boolean;
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
};

const BOUNDS: Record<string, { min: number; max: number }> = {
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
  const totalGb = clamp(num(meta.serverRamGb, 4), 1, 256);
  const otherGb = clamp(num(meta.serverOtherGb, 0), 0, Math.max(0, totalGb - 1));
  const availableGb = Math.max(0.75, totalGb - otherGb - HOST_RESERVE_GB);

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

  const warnings: string[] = [];
  const claimed = Object.values(limits).reduce((a, b) => a + b, 0);
  if (totalGb - otherGb < 2.5) {
    warnings.push(
      `Only ${(totalGb - otherGb).toFixed(1)} GB is available to this host once other stacks are accounted for. The limits below are ceilings, not reservations — do not raise one without lowering another.`,
    );
  }
  if (claimed > availableGb * 1024) {
    warnings.push(
      'The per-service minimums add up to more than the available memory. Either give the host more RAM or drop a service (MinIO and the email service are the usual candidates).',
    );
  }
  if (!meta.serverSwap) {
    warnings.push(
      'There is no swap file on this host. Add one (4 GB is plenty) before the first deploy: without it a single spike kills a container instead of slowing it down.',
    );
  }

  return { totalGb, otherGb, availableGb, limits, nodeHeap, buildHeap, swap: meta.serverSwap, warnings };
}

export function mb(value: number): string {
  return value >= 1024 && value % 1024 === 0 ? `${value / 1024}g` : `${value}m`;
}
