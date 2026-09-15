import { cn } from '@/lib/utils';

/**
 * The Stack Forge mark: three layers of a stack, the top one hot from the
 * forge. Same geometry as public/favicon.svg, but painted through the theme
 * tokens so it sits on either surface.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn('size-7', className)}>
      <rect width="64" height="64" rx="14" className="fill-ink-900 stroke-ink-700" strokeWidth="2" />
      <rect x="12" y="41" width="32" height="8" rx="2" className="fill-ink-600" />
      <rect x="12" y="29" width="32" height="8" rx="2" className="fill-ink-400" />
      <rect x="12" y="17" width="32" height="8" rx="2" className="fill-accent" />
      <path
        d="M51 9 L53.2 14.8 L59 17 L53.2 19.2 L51 25 L48.8 19.2 L43 17 L48.8 14.8 Z"
        className="fill-accent-soft"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
          ControlC
        </span>
        <span className="font-mono text-[15px] font-semibold tracking-tight text-ink-100">
          stack<span className="text-accent">/</span>forge
        </span>
      </span>
    </span>
  );
}
