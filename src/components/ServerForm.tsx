import { Server } from 'lucide-react';
import type { ProjectMeta, ServiceId } from '@/catalog/types';
import { t, useLang } from '@/i18n';
import { mb, planMemory } from '@/lib/memory';
import { Field, TextInput } from './ui';

interface Props {
  meta: ProjectMeta;
  services: Set<ServiceId>;
  onChange: (meta: ProjectMeta) => void;
}

/**
 * Host sizing. This is not a taste question, so it is a form rather than a set
 * of cards: the numbers feed straight into every mem_limit of the generated
 * production compose.
 */
export function ServerForm({ meta, services, onChange }: Props) {
  const lang = useLang();
  const plan = planMemory(meta, services);
  const set = <K extends keyof ProjectMeta>(key: K, value: ProjectMeta[K]) =>
    onChange({ ...meta, [key]: value });

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          {t('screenServer', lang)}
        </p>
        <h2 className="text-xl font-semibold text-ink-100">{t('serverTitle', lang)}</h2>
        <p className="text-sm text-ink-400">{t('serverHelp', lang)}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('serverRam', lang)} hint={t('serverRamHint', lang)}>
          <TextInput
            value={meta.serverRamGb}
            inputMode="decimal"
            placeholder="4"
            onChange={(e) => set('serverRamGb', e.target.value.replace(/[^\d.]/g, ''))}
          />
        </Field>

        <Field label={t('serverOther', lang)} hint={t('serverOtherHint', lang)}>
          <TextInput
            value={meta.serverOtherGb}
            inputMode="decimal"
            placeholder="0"
            onChange={(e) => set('serverOtherGb', e.target.value.replace(/[^\d.]/g, ''))}
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-700 bg-ink-900 p-4">
        <input
          type="checkbox"
          checked={meta.serverSwap}
          onChange={(e) => set('serverSwap', e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--color-accent)]"
        />
        <span className="space-y-0.5">
          <span className="block text-sm font-medium text-ink-100">{t('serverSwap', lang)}</span>
          <span className="block text-xs text-ink-400">{t('serverSwapHint', lang)}</span>
        </span>
      </label>

      <div className="space-y-3 rounded-xl border border-ink-700 bg-ink-900 p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium text-ink-100">
          <Server className="size-4 text-accent" /> {t('serverBudget', lang)}
        </h3>
        <p className="text-xs text-ink-400">
          <span className="font-mono text-ink-200">{plan.availableGb.toFixed(1)} GB</span>{' '}
          {t('serverAvailable', lang)}
        </p>

        <ul className="space-y-1 font-mono text-xs">
          {Object.entries(plan.limits).map(([service, limit]) => (
            <li key={service} className="flex justify-between gap-4">
              <span className="text-ink-400">{service}</span>
              <span className="text-ink-200">{mb(limit)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-4 border-t border-ink-800 pt-1">
            <span className="text-ink-400">{t('serverNodeHeap', lang)}</span>
            <span className="text-ink-200">{plan.nodeHeap} MB</span>
          </li>
        </ul>

        {plan.warnings.map((w) => (
          <p key={w} className="text-xs leading-relaxed text-accent">
            ⚠️ {w}
          </p>
        ))}
      </div>
    </section>
  );
}
