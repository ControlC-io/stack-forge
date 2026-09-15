import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STEPS } from '@/catalog/steps';
import type { Blueprint, Step } from '@/catalog/types';
import { applyToggle, emptyBlueprint } from '@/lib/blueprint';
import { generateFiles } from '.';

/**
 * The YAML tests prove the compose files parse; only Docker proves Docker
 * accepts them (interpolation, `$$` escapes, key names, value types). Skipped
 * where the Docker CLI is not installed; GitHub's Ubuntu runners have it.
 */

const hasDocker = spawnSync('docker', ['compose', 'version'], { encoding: 'utf8' }).status === 0;

const step = (id: string): Step => STEPS.find((s) => s.id === id)!;

function blueprints(): Array<{ name: string; bp: Blueprint }> {
  const base = emptyBlueprint();
  let everything = base;
  for (const id of ['feat-email', 'feat-jobs', 'feat-ai', 'db-pgvector', 'feat-browser-worker', 'feat-cron']) {
    everything = applyToggle(everything, step('features'), id);
  }
  return [
    { name: 'default self-hosted', bp: base },
    { name: 'every feature', bp: everything },
  ];
}

/** .env.example with every blank value filled, so `${VAR:?}` resolves. */
function envFrom(example: string): string {
  return example
    .split('\n')
    .map((line) => (/^[A-Z][A-Z0-9_]*=$/.test(line) ? `${line}test-value` : line))
    .join('\n');
}

describe.skipIf(!hasDocker).each(blueprints())('docker compose accepts the files — $name', ({ bp }) => {
  const files = generateFiles(bp);
  const composeFiles = files.filter((f) => f.path.startsWith('docker-compose'));

  it.each(composeFiles.map((f) => f.path))('%s', (path) => {
    const dir = mkdtempSync(join(tmpdir(), 'stack-forge-'));
    try {
      for (const f of files) {
        const target = join(dir, f.path);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, f.contents);
      }
      writeFileSync(join(dir, '.env'), envFrom(files.find((f) => f.path === '.env.example')!.contents));

      const result = spawnSync('docker', ['compose', '--env-file', '.env', '-f', path, 'config', '--quiet'], {
        cwd: dir,
        encoding: 'utf8',
      });
      expect(result.status, result.stderr).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
