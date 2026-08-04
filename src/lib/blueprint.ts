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
};

/** Everything marked `recommended` in a visible step, resolved iteratively. */
export function defaultSelection(): Selection {
  let sel: Selection = {};
  // Two passes: visibility of later steps depends on earlier answers.
  for (let pass = 0; pass < 3; pass++) {
    const next: Selection = { ...sel };
    for (const step of visibleSteps(next)) {
      if (next[step.id]?.length) continue;
      const picks = step.options.filter((o) => o.recommended).map((o) => o.id);
      if (picks.length) next[step.id] = step.mode === 'single' ? picks.slice(0, 1) : picks;
    }
    sel = next;
  }
  return sel;
}

export function emptyBlueprint(): Blueprint {
  return { meta: { ...EMPTY_META }, selection: defaultSelection() };
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

/** Toggle an option, honouring the step's single/multi mode. */
export function toggle(sel: Selection, step: Step, optionId: string): Selection {
  const current = sel[step.id] ?? [];
  const next: Selection = { ...sel };
  if (step.mode === 'single') {
    next[step.id] = current.includes(optionId) ? [] : [optionId];
  } else {
    next[step.id] = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
  }
  return prune(next);
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
  return out;
}

export function isComplete(bp: Blueprint): boolean {
  return bp.meta.name.trim().length > 0;
}

export function loadBlueprint(): Blueprint {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyBlueprint();
    const parsed = JSON.parse(raw) as Partial<Blueprint>;
    return {
      meta: { ...EMPTY_META, ...(parsed.meta ?? {}) },
      selection: parsed.selection ?? defaultSelection(),
    };
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
