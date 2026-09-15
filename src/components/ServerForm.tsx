import { Check, Server } from 'lucide-react';
import { APP_SIZES, CUSTOM_SERVER, SERVERS } from '@/catalog/servers';
import type { AppSize, ProjectMeta, ServiceId } from '@/catalog/types';
import { t, tx, useLang } from '@/i18n';
import { mb, planMemory } from '@/lib/memory';
import { cn } from '@/lib/utils';
import { Field, Info, TextInput } from './ui';

interface Props {
  meta: ProjectMeta;
  services: Set<ServiceId>;
  hasBackend: boolean;
  onChange: (meta: ProjectMeta) => void;
}

function Card({
  selected,
  title,
  detail,
  onClick,
}: {
  selected: boolean;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex h-full flex-col gap-1 rounded-xl border p-4 text-left transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        selected ? 'border-accent bg-accent/8' : 'border-ink-700 bg-ink-900 hover:border-ink-500 hover:bg-ink-850',
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-medium text-ink-100">{title}</span>
        <span
          className={cn(
            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-accent bg-accent text-ink-950' : 'border-ink-600',
          )}
        >
          {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </span>
      </span>
      <span className="text-sm leading-relaxed text-ink-400">{detail}</span>
    </button>
  );
}

/**
 * Where it runs and how much of that host it may take. Picking a known Coolify
 * server replaces typing RAM figures; the numbers feed straight into every
 * mem_limit of the generated production compose.
 */
export function ServerForm({ meta, services, hasBackend, onChange }: Props) {
  const lang = useLang();
  const plan = planMemory(meta, services);
  const set = <K extends keyof ProjectMeta>(key: K, value: ProjectMeta[K]) =>
    onChange({ ...meta, [key]: value });
  const custom = meta.serverId === CUSTOM_SERVER;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          {t('screenServer', lang)}
        </p>
        <h2 className="flex items-center gap-2 text-xl font-semibold text-ink-100">
          {t('serverTitle', lang)}
          <Info text={t('whyServer', lang)} />
        </h2>
        <p className="text-sm text-ink-400">{t('serverHelp', lang)}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {SERVERS.map((s) => (
          <Card
            key={s.id}
            selected={meta.serverId === s.id}
            title={s.label}
            detail={s.details}
            onClick={() => set('serverId', s.id)}
          />
        ))}
        <Card
          selected={custom}
          title={t('serverCustom', lang)}
          detail={t('serverCustomHint', lang)}
          onClick={() => set('serverId', CUSTOM_SERVER)}
        />
      </div>

      {custom ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('serverRam', lang)} hint={t('serverRamHint', lang)} why={t('whyServerRam', lang)}>
            <TextInput
              value={meta.serverRamGb}
              inputMode="decimal"
              placeholder="8"
              onChange={(e) => set('serverRamGb', e.target.value.replace(/[^\d.]/g, ''))}
            />
          </Field>
          <label className="flex cursor-pointer items-start gap-3 self-end rounded-xl border border-ink-700 bg-ink-900 p-4">
            <input
              type="checkbox"
              checked={meta.serverSwap}
              onChange={(e) => set('serverSwap', e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--color-accent)]"
            />
            <span className="flex items-center gap-1.5 text-sm font-medium text-ink-100">
              {t('serverSwap', lang)}
              <Info text={t('whySwap', lang)} />
            </span>
          </label>
        </div>
      ) : null}

      {/* A static site is one nginx container: there is nothing to size. */}
      {hasBackend ? (
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-ink-100">
            {t('appSize', lang)}
            <Info text={t('whyAppSize', lang)} />
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(APP_SIZES) as AppSize[]).map((size) => (
              <Card
                key={size}
                selected={meta.appSize === size}
                title={tx(APP_SIZES[size].label, lang)}
                detail={tx(APP_SIZES[size].description, lang)}
                onClick={() => set('appSize', size)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <details className="rounded-xl border border-ink-700 bg-ink-900 p-4">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-100">
          <Server className="size-4 text-accent" /> {t('serverBudget', lang)}
          <span className="font-mono text-xs text-ink-400">· {plan.availableGb.toFixed(1)} GB</span>
        </summary>
        <ul className="mt-3 space-y-1 font-mono text-xs">
          {Object.entries(plan.limits).map(([service, limit]) => (
            <li key={service} className="flex justify-between gap-4">
              <span className="text-ink-400">{service}</span>
              <span className="text-ink-200">{mb(limit)}</span>
            </li>
          ))}
          {hasBackend ? (
            <li className="flex justify-between gap-4 border-t border-ink-800 pt-1">
              <span className="text-ink-400">{t('serverNodeHeap', lang)}</span>
              <span className="text-ink-200">{plan.nodeHeap} MB</span>
            </li>
          ) : null}
        </ul>
        {/* Warnings stay English: they are the text that lands in the generated files. */}
        <div className="mt-3 space-y-1.5">
          {plan.warnings.map((w) => (
            <p key={w} className="text-xs leading-relaxed text-ink-400">
              ⚠️ {w}
            </p>
          ))}
        </div>
      </details>
    </section>
  );
}
