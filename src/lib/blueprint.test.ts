import { describe, expect, it } from 'vitest';
import { STEPS, visibleSteps } from '@/catalog/steps';
import type { Blueprint, Step } from '@/catalog/types';
import { applyToggle, availability, emptyBlueprint, normalize, selectedIds } from './blueprint';

const step = (id: string): Step => {
  const found = STEPS.find((s) => s.id === id);
  if (!found) throw new Error(`unknown step ${id}`);
  return found;
};

const ids = (bp: Blueprint) => selectedIds(bp.selection);

describe('selection rules', () => {
  it('starts with every baseline and recommended option of the visible steps', () => {
    const bp = emptyBlueprint();
    for (const s of visibleSteps(bp.selection)) {
      for (const option of s.options) {
        if (option.locked) expect(ids(bp).has(option.id), `${option.id} missing`).toBe(true);
      }
    }
  });

  it('refuses to unselect a locked option', () => {
    const bp = emptyBlueprint();
    const after = applyToggle(bp, step('database'), 'db-postgres-prisma');
    expect(ids(after).has('db-postgres-prisma')).toBe(true);
  });

  it('drops dependent options when their prerequisite goes away', () => {
    let bp = emptyBlueprint();
    expect(ids(bp).has('feat-uploads')).toBe(true);
    bp = applyToggle(bp, step('storage'), 'storage-minio');
    expect(ids(bp).has('storage-minio')).toBe(false);
    expect(ids(bp).has('feat-uploads'), 'uploads survived without storage').toBe(false);
  });

  it('keeps a step the user emptied on purpose empty', () => {
    let bp = emptyBlueprint();
    bp = applyToggle(bp, step('auth'), 'rbac-simple');
    bp = applyToggle(bp, step('auth'), 'auth-better-auth-jwt');
    expect(bp.selection.auth).toEqual([]);
    // A re-normalisation (what every render does) must not resurrect defaults.
    expect(normalize(bp).selection.auth).toEqual([]);
  });

  it('seeds a branch revealed later with its own defaults', () => {
    const bp = applyToggle(emptyBlueprint(), step('stack'), 'stack-supabase');
    expect(ids(bp).has('sb-core'), 'baseline missing').toBe(true);
    expect(ids(bp).has('sb-rls'), 'recommended RLS missing').toBe(true);
    expect(ids(bp).has('sb-auth'), 'recommended auth missing').toBe(true);
  });

  it('hides the self-hosted steps behind the Supabase branch', () => {
    const bp = applyToggle(emptyBlueprint(), step('stack'), 'stack-supabase');
    const visible = visibleSteps(bp.selection).map((s) => s.id);
    expect(visible).not.toContain('backend');
    expect(visible).not.toContain('database');
    expect(visible).not.toContain('auth');
    expect(visible).not.toContain('storage');
    expect(visible).toContain('supabase');
  });

  it('hides the frontend step for an API-only project', () => {
    const bp = applyToggle(emptyBlueprint(), step('stack'), 'stack-api-only');
    expect(visibleSteps(bp.selection).map((s) => s.id)).not.toContain('frontend');
  });

  it('drops everything server-side for a static project', () => {
    const bp = applyToggle(emptyBlueprint(), step('stack'), 'stack-static');
    const selected = ids(bp);
    for (const id of ['backend-express', 'db-postgres-prisma', 'auth-better-auth-jwt', 'storage-minio']) {
      expect(selected.has(id), `${id} leaked into a static project`).toBe(false);
    }
  });

  it('reveals the AI sub-branch only when the module is on', () => {
    const off = emptyBlueprint();
    expect(visibleSteps(off.selection).map((s) => s.id)).not.toContain('ai-provider');

    const on = applyToggle(off, step('backend'), 'feat-ai');
    expect(visibleSteps(on.selection).map((s) => s.id)).toContain('ai-provider');
    expect(ids(on).has('ai-openrouter'), 'no default provider').toBe(true);
  });

  it('keeps exactly one AI provider selected', () => {
    let bp = applyToggle(emptyBlueprint(), step('backend'), 'feat-ai');
    bp = applyToggle(bp, step('ai-provider'), 'ai-direct');
    expect(bp.selection['ai-provider']).toEqual(['ai-direct']);
  });

  it('never leaves a selected option whose prerequisites are unmet', () => {
    // Sweep every single toggle from the default blueprint.
    const base = emptyBlueprint();
    for (const s of STEPS) {
      for (const option of s.options) {
        const bp = applyToggle(base, s, option.id);
        for (const id of ids(bp)) {
          const { enabled } = availability(
            STEPS.flatMap((x) => x.options).find((o) => o.id === id)!,
            bp.selection,
          );
          expect(enabled, `after toggling ${option.id}, "${id}" is selected but unavailable`).toBe(true);
        }
      }
    }
  });

  it('never selects an option from a hidden step', () => {
    const base = emptyBlueprint();
    for (const s of STEPS) {
      for (const option of s.options) {
        const bp = applyToggle(base, s, option.id);
        const visible = new Set(visibleSteps(bp.selection).map((x) => x.id));
        for (const [stepId, chosen] of Object.entries(bp.selection)) {
          if (visible.has(stepId) || chosen.length === 0) continue;
          // Hidden steps may keep their state, but it must not reach the output.
          for (const id of chosen) {
            expect(ids(bp).has(id), `hidden ${stepId}.${id} leaked into the output`).toBe(false);
          }
        }
      }
    }
  });

  it('survives a stored blueprint that references options the catalog dropped', () => {
    const stale: Blueprint = {
      ...emptyBlueprint(),
      selection: { database: ['db-sqlite-prisma'], stack: ['shape-fullstack'] },
      touched: ['database'],
    };
    const fixed = normalize(stale);
    expect(fixed.selection.database).not.toContain('db-sqlite-prisma');
    expect(fixed.selection.database).toContain('db-postgres-prisma');
  });
});
