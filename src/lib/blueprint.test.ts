import { describe, expect, it } from 'vitest';
import { STEPS, questionSteps, visibleSteps } from '@/catalog/steps';
import type { Blueprint, Step } from '@/catalog/types';
import { applyToggle, availability, emptyBlueprint, normalize, selectedIds } from './blueprint';

const step = (id: string): Step => {
  const found = STEPS.find((s) => s.id === id);
  if (!found) throw new Error(`unknown step ${id}`);
  return found;
};

const ids = (bp: Blueprint) => selectedIds(bp.selection);

describe('selection rules', () => {
  it('starts with every baseline option of the visible steps', () => {
    const bp = emptyBlueprint();
    for (const s of visibleSteps(bp.selection)) {
      for (const option of s.options) {
        if (option.locked) expect(ids(bp).has(option.id), `${option.id} missing`).toBe(true);
      }
    }
  });

  it('starts with every recommended option of the visible steps', () => {
    const bp = emptyBlueprint();
    for (const s of visibleSteps(bp.selection)) {
      for (const option of s.options) {
        if (!option.recommended || s.mode === 'single') continue;
        expect(ids(bp).has(option.id), `${option.id} is recommended but not selected`).toBe(true);
      }
    }
  });

  it('never asks about a baseline step', () => {
    for (const stack of ['stack-fullstack', 'stack-supabase', 'stack-static']) {
      const bp = applyToggle(emptyBlueprint(), step('stack'), stack);
      for (const s of questionSteps(bp.selection)) {
        expect(s.baseline, `${s.id} is a baseline shown as a question`).toBeFalsy();
      }
    }
  });

  it('does not change the selection on the first interaction', () => {
    // A fresh blueprint and a touched one must agree about everything the user
    // did not touch; otherwise the file list moves the moment you click.
    const fresh = emptyBlueprint();
    const touched = applyToggle(fresh, step('ui'), 'ui-i18n');
    for (const [stepId, chosen] of Object.entries(fresh.selection)) {
      if (stepId === 'ui') continue;
      expect(touched.selection[stepId], `step "${stepId}" changed on an unrelated click`).toEqual(chosen);
    }
  });

  it('refuses to unselect a locked option', () => {
    const bp = emptyBlueprint();
    const after = applyToggle(bp, step('base-api'), 'db-postgres-prisma');
    expect(ids(after).has('db-postgres-prisma')).toBe(true);
  });

  it('drops dependent options when their prerequisite goes away', () => {
    let bp = emptyBlueprint();
    expect(ids(bp).has('rbac-simple')).toBe(true);
    bp = applyToggle(bp, step('features'), 'auth-better-auth-jwt');
    expect(ids(bp).has('auth-better-auth-jwt')).toBe(false);
    expect(ids(bp).has('rbac-simple'), 'roles survived without login').toBe(false);
  });

  it('drops embeddings when semantic search goes away', () => {
    let bp = applyToggle(emptyBlueprint(), step('features'), 'db-pgvector');
    bp = applyToggle(bp, step('features'), 'feat-ai');
    bp = applyToggle(bp, step('ai-capabilities'), 'ai-embeddings');
    expect(ids(bp).has('ai-embeddings')).toBe(true);
    bp = applyToggle(bp, step('features'), 'db-pgvector');
    expect(ids(bp).has('ai-embeddings'), 'embeddings survived without a vector store').toBe(false);
  });

  it('keeps a step the user emptied on purpose empty', () => {
    let bp = emptyBlueprint();
    for (const id of ['rbac-simple', 'auth-better-auth-jwt', 'storage-minio']) {
      bp = applyToggle(bp, step('features'), id);
    }
    expect(bp.selection.features).toEqual([]);
    // A re-normalisation (what every render does) must not resurrect defaults.
    expect(normalize(bp).selection.features).toEqual([]);
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
    expect(visible).not.toContain('features');
    expect(visible).not.toContain('base-api');
    expect(visible).toContain('supabase');
  });

  it('drops everything server-side for a static project', () => {
    const bp = applyToggle(emptyBlueprint(), step('stack'), 'stack-static');
    const selected = ids(bp);
    for (const id of ['backend-express', 'db-postgres-prisma', 'auth-better-auth-jwt', 'storage-minio']) {
      expect(selected.has(id), `${id} leaked into a static project`).toBe(false);
    }
  });

  it('asks about AI only when the app needs it', () => {
    const off = emptyBlueprint();
    expect(questionSteps(off.selection).map((s) => s.id)).not.toContain('ai-capabilities');

    const on = applyToggle(off, step('features'), 'feat-ai');
    expect(questionSteps(on.selection).map((s) => s.id)).toContain('ai-capabilities');
    expect(ids(on).has('ai-chat'), 'no default AI use').toBe(true);
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

  it('drops an option stored under a step it no longer belongs to', () => {
    // infra-compose-dev moved from the always-visible deployment baseline to the
    // API baseline; an old draft of a static project must not keep it.
    const bp = applyToggle(emptyBlueprint(), step('stack'), 'stack-static');
    const stale = normalize({
      ...bp,
      selection: { ...bp.selection, 'base-infra': ['infra-compose-dev', 'infra-nginx'] },
    });
    expect(selectedIds(stale.selection).has('infra-compose-dev')).toBe(false);
  });

  it('survives a stored blueprint that references options and steps the catalog dropped', () => {
    const stale: Blueprint = {
      ...emptyBlueprint(),
      selection: { 'base-api': ['db-sqlite-prisma'], agent: ['agent-cursor'], stack: ['stack-api-only'] },
      touched: ['base-api', 'agent', 'stack'],
    };
    const fixed = normalize(stale);
    expect(fixed.selection['base-api']).not.toContain('db-sqlite-prisma');
    expect(fixed.selection.agent).toBeUndefined();
    expect(selectedIds(fixed.selection).has('stack-api-only')).toBe(false);
  });
});
