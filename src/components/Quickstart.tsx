import { Rocket } from 'lucide-react';
import type { Ctx } from '@/generators/context';
import { t, tx, useLang } from '@/i18n';
import { quickstart } from '@/lib/quickstart';
import { cn } from '@/lib/utils';

export function Quickstart({ ctx }: { ctx: Ctx }) {
  const lang = useLang();
  const steps = quickstart(ctx);

  return (
    <section className="rounded-xl border border-ink-700 bg-ink-900 p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-100">
        <Rocket className="size-4 text-accent" /> {t('quickstartTitle', lang)}
      </h3>

      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span
              className={cn(
                'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                step.warn ? 'border-accent text-accent' : 'border-ink-600 text-ink-400',
              )}
            >
              {i + 1}
            </span>
            <div className="min-w-0 space-y-1">
              <p className={cn('text-sm font-medium', step.warn ? 'text-accent' : 'text-ink-100')}>
                {tx(step.title, lang)}
              </p>
              {step.detail ? (
                <p className="text-xs leading-relaxed text-ink-400">{tx(step.detail, lang)}</p>
              ) : null}
              {step.command ? (
                <code className="mt-1 block overflow-x-auto rounded-md border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-xs text-ink-300">
                  {step.command}
                </code>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
