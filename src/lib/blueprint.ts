import { STEPS, visibleSteps } from '@/catalog/steps';
import type { Blueprint, ProjectMeta, Selection, Step, TechOption } from '@/catalog/types';
import { has } from '@/catalog/types';
import type { I18nText } from '@/i18n';

export const STORAGE_KEY = 'stack-forge.blueprint.v1';

export const EMPTY_META: ProjectMeta = {
  name: '',
  slug: '',
  description: '',
  domain: '',
  httpPort: '80',
  extraContext: '',
  serverRamGb: '4',
  serverOtherGb: '0',
  serverSwap: true,
};

/**
 * Baseline options are always on: they are the template's opinion, not a
 * question. Called after every mutation so a stored blueprint from an older
 * catalog version still comes back consistent.
 */
export function ensureLocked(sel: Selection): Selection {
  const out: Selection = { ...sel };
  for (const step of visibleSteps(out)) {
    const locked = step.options.filter((o) => o.locked).map((o) => o.id);
    if (!locked.length) continue;
    const current = out[step.id] ?? [];
    const missing = locked.filter((id) => !current.includes(id));
    if (missing.length) out[step.id] = [...missing, ...current];
  }
  return out;
}

/** Everything locked or marked `recommended` in a visible step. */
export function defaultSelection(): Selection {
  let sel: Selection = {};
  // Several passes: visibility of later steps depends on earlier answers.
  for (let pass = 0; pass < 4; pass++) {
    const next: Selection = ensureLocked(sel);
    for (const step of visibleSteps(next)) {
      if (next[step.id]?.length) continue;
      const picks = step.options.filter((o) => o.recommended || o.locked).map((o) => o.id);
      if (picks.length) next[step.id] = step.mode === 'single' ? picks.slice(0, 1) : picks;
    }
    sel = next;
  }
  return sel;
}

export function emptyBlueprint(): Blueprint {
  return { meta: { ...EMPTY_META }, selection: defaultSelection(), touched: [] };
}

/** All option ids currently selected, across visible steps only. */
export function selectedIds(sel: Selection): Set<string> {
  const visible = new Set(visibleSteps(sel).map((s) => s.id));
  const out = new Set<string>();
  for (const [stepId, ids] of Object.entries(sel)) {
    if (!visible.has(stepId)) continue;
    for (const id of ids) out.add(id);
  }
  return out;
}

const OPTION_INDEX = new Map<string, TechOption>(
  STEPS.flatMap((s) => s.options.map((o) => [o.id, o] as const)),
);

export function optionById(id: string): TechOption | undefined {
  return OPTION_INDEX.get(id);
}

export function selectedOptions(sel: Selection): TechOption[] {
  const ids = selectedIds(sel);
  return STEPS.flatMap((s) => s.options).filter((o) => ids.has(o.id));
}

export interface Availability {
  enabled: boolean;
  /** Labels of the missing prerequisites, for the caller to translate. */
  missing: I18nText[];
  /** Label of the first conflicting selection, if any. */
  conflict?: I18nText;
}

/** An option is pickable when every `requires` is selected and no `conflicts` is. */
export function availability(option: TechOption, sel: Selection): Availability {
  const missing = (option.requires ?? [])
    .filter((id) => !has(sel, id))
    .map((id) => optionById(id)?.label ?? id);
  if (missing.length) return { enabled: false, missing };

  const clash = (option.conflicts ?? []).find((id) => has(sel, id));
  if (clash) return { enabled: false, missing: [], conflict: optionById(clash)?.label ?? clash };

  return { enabled: true, missing: [] };
}

/**
 * Toggle an option and re-normalise the whole blueprint.
 *
 * `touched` is what separates "this step has never been seen" from "the user
 * deliberately emptied this step": switching branch reveals steps that should
 * arrive with their defaults, but unticking every box in a step you are looking
 * at must stay empty.
 */
export function applyToggle(bp: Blueprint, step: Step, optionId: string): Blueprint {
  // Baseline options are not a choice; clicking one is a no-op.
  if (optionById(optionId)?.locked) return bp;

  const current = bp.selection[step.id] ?? [];
  const next: Selection = { ...bp.selection };
  if (step.mode === 'single') {
    next[step.id] = current.includes(optionId) ? [] : [optionId];
  } else {
    next[step.id] = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
  }

  const touched = bp.touched.includes(step.id) ? bp.touched : [...bp.touched, step.id];
  return normalize({ ...bp, selection: next, touched });
}

/** Seed untouched visible steps, drop orphans, force the baseline back in. */
export function normalize(bp: Blueprint): Blueprint {
  let selection = prune(bp.selection);

  // Several passes: seeding one step can reveal another.
  for (let pass = 0; pass < 4; pass++) {
    const next: Selection = { ...selection };
    for (const step of visibleSteps(next)) {
      if (bp.touched.includes(step.id)) continue;
      // Locked ids are injected automatically, so they do not count as "the
      // step already has an answer" — otherwise a freshly revealed step with a
      // baseline option would never receive its recommended extras.
      const chosen = (next[step.id] ?? []).filter((id) => !optionById(id)?.locked);
      if (chosen.length) continue;
      const picks = step.options.filter((o) => o.recommended || o.locked).map((o) => o.id);
      if (picks.length) next[step.id] = step.mode === 'single' ? picks.slice(0, 1) : picks;
    }
    selection = prune(next);
  }

  return { ...bp, selection };
}

/**
 * Drop selections whose prerequisites just disappeared. Without this you can
 * select "file uploads" (requires MinIO), switch storage to none, and generate
 * a prompt describing an upload endpoint with nowhere to put the bytes.
 */
function prune(sel: Selection): Selection {
  let out = sel;
  for (let pass = 0; pass < 3; pass++) {
    const next: Selection = {};
    for (const step of STEPS) {
      const ids = out[step.id] ?? [];
      next[step.id] = ids.filter((id) => {
        const opt = optionById(id);
        if (!opt) return false;
        return (opt.requires ?? []).every((req) => has(out, req));
      });
    }
    out = next;
  }
  return ensureLocked(out);
}

export function isComplete(bp: Blueprint): boolean {
  return bp.meta.name.trim().length > 0;
}

export function loadBlueprint(): Blueprint {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyBlueprint();
    const parsed = JSON.parse(raw) as Partial<Blueprint>;
    // normalize() drops ids the catalog no longer knows and re-seeds anything
    // the stored blueprint predates, so an old draft still opens cleanly.
    return normalize({
      meta: { ...EMPTY_META, ...(parsed.meta ?? {}) },
      selection: parsed.selection ?? defaultSelection(),
      touched: parsed.touched ?? [],
    });
  } catch {
    return emptyBlueprint();
  }
}

export function saveBlueprint(bp: Blueprint): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bp));
  } catch {
    // Private mode / quota — the wizard still works, it just will not persist.
  }
}
