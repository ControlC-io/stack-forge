import { Check, Lock } from 'lucide-react';
import type { Selection, Step } from '@/catalog/types';
import { t, tx, useLang } from '@/i18n';
import { availability } from '@/lib/blueprint';
import { cn } from '@/lib/utils';

interface Props {
  step: Step;
  selection: Selection;
  onToggle: (optionId: string) => void;
}

export function StepView({ step, selection, onToggle }: Props) {
  const lang = useLang();
  const selected = selection[step.id] ?? [];

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">{tx(step.title, lang)}</p>
        <h2 className="text-xl font-semibold text-ink-100">{tx(step.question, lang)}</h2>
        {step.help ? <p className="text-sm text-ink-400">{tx(step.help, lang)}</p> : null}
        <p className="text-xs text-ink-500">
          {step.mode === 'single' ? t('chooseOne', lang) : t('chooseMany', lang)}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {step.options.map((option) => {
          const isSelected = selected.includes(option.id);
          const { enabled, missing, conflict } = availability(option, selection);
          const reason = missing.length
            ? `${t('requires', lang)} ${missing.map((m) => tx(m, lang)).join(' + ')}`
            : conflict
              ? `${t('incompatible', lang)} ${tx(conflict, lang)}`
              : '';

          return (
            <button
              key={option.id}
              type="button"
              disabled={!enabled}
              onClick={() => onToggle(option.id)}
              aria-pressed={isSelected}
              className={cn(
                'group relative flex h-full flex-col gap-1.5 rounded-xl border p-4 text-left transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                isSelected
                  ? 'border-accent bg-accent/8 shadow-[inset_0_0_0_1px_rgba(242,177,52,0.25)]'
                  : 'border-ink-700 bg-ink-900 hover:border-ink-500 hover:bg-ink-850',
                !enabled && 'cursor-not-allowed opacity-45 hover:border-ink-700 hover:bg-ink-900',
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="font-medium text-ink-100">{tx(option.label, lang)}</span>
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center border',
                    step.mode === 'single' ? 'rounded-full' : 'rounded-md',
                    isSelected ? 'border-accent bg-accent text-ink-950' : 'border-ink-600',
                  )}
                >
                  {!enabled ? (
                    <Lock className="size-3 text-ink-500" />
                  ) : isSelected ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : null}
                </span>
              </span>

              <span className="text-sm leading-relaxed text-ink-400">{tx(option.description, lang)}</span>

              {option.recommended && !isSelected ? (
                <span className="mt-1 w-fit rounded border border-accent-dim px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                  {t('recommended', lang)}
                </span>
              ) : null}

              {reason ? <span className="mt-1 text-xs text-ink-500">{reason}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
