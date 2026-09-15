import type { I18nText } from '@/i18n';

/**
 * Catalog data model.
 *
 * Everything the wizard shows and everything the generators emit derives from
 * these structures. Adding a technology means adding one TechOption — never
 * touching the UI or the generators.
 */

/** stepId -> selected option ids. */
export type Selection = Record<string, string[]>;

export interface EnvVar {
  key: string;
  /** Default value written into .env.example. Empty string means "fill me in". */
  value?: string;
  comment?: string;
  /** Secrets are emitted as blank with a `# required` marker. */
  secret?: boolean;
}

export type ServiceId =
  | 'postgres'
  | 'minio'
  | 'nginx'
  | 'backend'
  | 'frontend'
  | 'email_service';

export interface PackageDeps {
  frontend?: string[];
  frontendDev?: string[];
  backend?: string[];
  backendDev?: string[];
}

export interface TechOption {
  id: string;
  /** Shown in the wizard. A plain string means "same in every language". */
  label: I18nText;
  /** Shown in the wizard. Never lands in generated files. */
  description: I18nText;
  /** Behind the "i": why someone would tick this, and what skipping it costs. */
  why?: I18nText;
  /** English one-liner used in generated artifacts. Falls back to `label`. */
  spec?: string;
  recommended?: boolean;
  /**
   * Part of the stack baseline: always selected, cannot be toggled off. These
   * are shown so the user understands what they are getting, not so they can
   * choose — the whole point of the template is that these decisions are made.
   */
  locked?: boolean;
  /** Option ids that must ALL be selected for this option to be pickable. */
  requires?: string[];
  /** Option ids that make this one impossible. */
  conflicts?: string[];
  deps?: PackageDeps;
  env?: EnvVar[];
  services?: ServiceId[];
  /** Gotcha ids (see gotchas.ts) pulled into CLAUDE.md when this is selected. */
  gotchas?: string[];
  /** Bullet lines injected into the generated prompt. */
  notes?: string[];
  /** Ordered implementation steps contributed to the prompt's plan section. */
  tasks?: string[];
}

export interface Step {
  id: string;
  title: I18nText;
  question: I18nText;
  help?: I18nText;
  /** Behind the "i": why this question is asked at all. */
  why?: I18nText;
  mode: 'single' | 'multi';
  options: TechOption[];
  /** Hide the whole step when the current selection makes it irrelevant. */
  visibleIf?: (sel: Selection) => boolean;
  /**
   * The ControlC baseline for this branch: every option is locked, so there is
   * nothing to ask. Selected like any other step, never shown as a screen.
   */
  baseline?: boolean;
}

export type AppSize = 'small' | 'medium' | 'large';

/** Free-text project metadata collected on the first screen. */
export interface ProjectMeta {
  name: string;
  description: string;
  domain: string;
  extraContext: string;
  /** A known Coolify host from catalog/servers.ts, or 'custom'. */
  serverId: string;
  /** How much of the host this project may claim. */
  appSize: AppSize;
  /** Custom host only: total RAM. */
  serverRamGb: string;
  /** Custom host only: whether a swap file exists. */
  serverSwap: boolean;
}

export interface Blueprint {
  meta: ProjectMeta;
  selection: Selection;
  /**
   * Step ids the user has actually interacted with. Steps revealed by a later
   * branch arrive with their defaults; a step the user emptied on purpose stays
   * empty.
   */
  touched: string[];
}

export interface GeneratedFile {
  path: string;
  language: 'markdown' | 'yaml' | 'dockerfile' | 'nginx' | 'json' | 'env' | 'text';
  contents: string;
}

/** True when `id` is selected in any step. */
export function has(sel: Selection, id: string): boolean {
  for (const ids of Object.values(sel)) {
    if (ids.includes(id)) return true;
  }
  return false;
}

/** True when any of `ids` is selected. */
export function hasAny(sel: Selection, ids: string[]): boolean {
  return ids.some((id) => has(sel, id));
}
