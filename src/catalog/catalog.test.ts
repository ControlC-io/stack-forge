import { describe, expect, it } from 'vitest';
import { GOTCHAS } from './gotchas';
import { STEPS } from './steps';
import type { TechOption } from './types';
import { LANGS } from '@/i18n';

const ALL_OPTIONS: TechOption[] = STEPS.flatMap((s) => s.options);
const ALL_IDS = new Set(ALL_OPTIONS.map((o) => o.id));

describe('catalog integrity', () => {
  it('has no duplicate option ids', () => {
    const seen = new Set<string>();
    const dupes = ALL_OPTIONS.map((o) => o.id).filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
    expect(dupes).toEqual([]);
  });

  it('has no duplicate step ids', () => {
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(STEPS.length);
  });

  it('only references option ids that exist', () => {
    const dangling: string[] = [];
    for (const option of ALL_OPTIONS) {
      for (const id of [...(option.requires ?? []), ...(option.conflicts ?? [])]) {
        if (!ALL_IDS.has(id)) dangling.push(`${option.id} -> ${id}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it('only references gotchas that exist', () => {
    const known = new Set(GOTCHAS.map((g) => g.id));
    const dangling = ALL_OPTIONS.flatMap((o) => (o.gotchas ?? []).map((g) => `${o.id} -> ${g}`)).filter(
      (pair) => !known.has(pair.split(' -> ')[1] ?? ''),
    );
    expect(dangling).toEqual([]);
  });

  it('gates every gotcha on an option that exists', () => {
    const dangling = GOTCHAS.flatMap((g) => g.when.map((id) => `${g.id} -> ${id}`)).filter(
      (pair) => !ALL_IDS.has(pair.split(' -> ')[1] ?? ''),
    );
    expect(dangling).toEqual([]);
  });

  it('never leaves a gotcha unreachable', () => {
    // A gotcha nothing can select is dead documentation.
    const reachable = new Set(ALL_OPTIONS.flatMap((o) => o.gotchas ?? []));
    for (const g of GOTCHAS) {
      const gated = g.when.some((id) => ALL_IDS.has(id));
      expect(gated || reachable.has(g.id), `gotcha "${g.id}" can never be triggered`).toBe(true);
    }
  });

  it('translates every UI string into all three languages', () => {
    const missing: string[] = [];
    const check = (value: unknown, where: string) => {
      if (typeof value === 'string' || value === undefined) return;
      const record = value as Record<string, string | undefined>;
      for (const lang of LANGS) {
        if (!record[lang]?.trim()) missing.push(`${where}.${lang}`);
      }
    };
    for (const step of STEPS) {
      check(step.title, `step:${step.id}.title`);
      check(step.question, `step:${step.id}.question`);
      check(step.help, `step:${step.id}.help`);
      check(step.why, `step:${step.id}.why`);
      for (const option of step.options) {
        check(option.label, `${option.id}.label`);
        check(option.description, `${option.id}.description`);
        check(option.why, `${option.id}.why`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('explains why every question and every answer matters', () => {
    // The "i" next to each choice is how someone new decides without asking.
    const missing: string[] = [];
    for (const step of STEPS) {
      if (step.baseline) continue;
      if (!step.why) missing.push(`step:${step.id}`);
      for (const option of step.options) if (!option.why) missing.push(option.id);
    }
    expect(missing).toEqual([]);
  });

  it('gives every translated label an English `spec` for the generated files', () => {
    // A localised label cannot be pasted into a prompt as-is.
    const missing = ALL_OPTIONS.filter((o) => typeof o.label !== 'string' && !o.spec).map((o) => o.id);
    expect(missing).toEqual([]);
  });

  it('keeps generated text (spec/notes/tasks) free of accented Spanish or French', () => {
    const offenders: string[] = [];
    for (const option of ALL_OPTIONS) {
      const generated = [option.spec ?? '', ...(option.notes ?? []), ...(option.tasks ?? [])].join(' ');
      // Backtick-quoted identifiers are fine; prose accents mean a leaked translation.
      const accented = generated.match(/[áéíóúñçàèùôêâœ]/i);
      if (accented) offenders.push(`${option.id}: ${accented[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  it('marks at most one locked option in a single-choice step', () => {
    for (const step of STEPS) {
      if (step.mode !== 'single') continue;
      const locked = step.options.filter((o) => o.locked);
      expect(locked.length, `step "${step.id}" locks ${locked.length} options`).toBeLessThanOrEqual(1);
    }
  });

  it('keeps decisions and questions apart', () => {
    // A baseline step is never shown, so a choice inside it could never be
    // made; a locked option inside a question is a card nobody can click.
    for (const step of STEPS) {
      for (const option of step.options) {
        expect(Boolean(option.locked), `${step.id}.${option.id}`).toBe(Boolean(step.baseline));
      }
    }
  });

  it('never marks a locked option as recommended', () => {
    // "Recommended" implies a choice; locked means there is none.
    expect(ALL_OPTIONS.filter((o) => o.locked && o.recommended).map((o) => o.id)).toEqual([]);
  });

  it('never gives a locked option prerequisites it cannot guarantee', () => {
    // A locked option is force-selected, so an unmet `requires` would be pruned
    // right back out and fight ensureLocked forever.
    expect(ALL_OPTIONS.filter((o) => o.locked && o.requires?.length).map((o) => o.id)).toEqual([]);
  });

  it('declares env keys without duplicates inside one option', () => {
    for (const option of ALL_OPTIONS) {
      const keys = (option.env ?? []).map((e) => e.key);
      expect(new Set(keys).size, `duplicate env key in ${option.id}`).toBe(keys.length);
    }
  });

  it('never ships a secret with a default value', () => {
    const leaked = ALL_OPTIONS.flatMap((o) => (o.env ?? []).filter((e) => e.secret && e.value)).map(
      (e) => e.key,
    );
    expect(leaked).toEqual([]);
  });

  it('never puts a secret behind a VITE_ prefix', () => {
    // VITE_* is inlined into the bundle and is therefore public.
    const leaked = ALL_OPTIONS.flatMap((o) => o.env ?? [])
      .filter((e) => e.key.startsWith('VITE_') && e.secret)
      .map((e) => e.key);
    expect(leaked).toEqual([]);
  });
});
