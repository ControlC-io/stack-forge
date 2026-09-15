import { useState } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SyntheticEvent,
  TextareaHTMLAttributes,
} from 'react';
import { t, useLang } from '@/i18n';
import { cn } from '@/lib/utils';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'md';
};

export function Button({ variant = 'outline', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm',
        variant === 'primary' && 'bg-accent text-ink-950 hover:bg-accent-soft',
        variant === 'outline' && 'border border-ink-600 bg-ink-850 text-ink-100 hover:border-ink-500 hover:bg-ink-800',
        variant === 'ghost' && 'text-ink-300 hover:bg-ink-800 hover:text-ink-100',
        className,
      )}
    />
  );
}

/**
 * The "why is this needed?" marker. A span with role=button rather than a
 * <button>, because it sits inside option cards that are buttons themselves;
 * it stops the event so opening it never toggles the card or focuses a field.
 */
export function Info({ text }: { text: string }) {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  // Opening only, never toggling: a mouse click arrives right after the hover
  // has already opened it, so a toggle would close it under the cursor.
  const show = (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <span
      className="relative inline-flex shrink-0 align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        role="button"
        tabIndex={0}
        aria-label={t('why', lang)}
        aria-expanded={open}
        onClick={show}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') show(e);
          if (e.key === 'Escape') setOpen(false);
        }}
        onBlur={() => setOpen(false)}
        className="flex size-4 cursor-help items-center justify-center rounded-full border border-ink-500 font-serif text-[10px] font-semibold italic leading-none text-ink-400 transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        i
      </span>
      {open ? (
        <span
          role="tooltip"
          className="absolute top-full left-1/2 z-30 mt-2 w-64 -translate-x-1/2 rounded-lg border border-ink-600 bg-ink-850 p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-ink-200 shadow-lg"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}

export function Field({
  label,
  hint,
  why,
  children,
}: {
  label: string;
  hint?: string;
  why?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1.5 text-sm font-medium text-ink-200">
        {label}
        {why ? <Info text={why} /> : null}
      </span>
      {children}
      {hint ? <span className="block text-xs text-ink-400">{hint}</span> : null}
    </label>
  );
}

const inputBase =
  'w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-accent focus:outline-none';

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, className)} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputBase, 'min-h-24 resize-y', className)} />;
}

export function Chip({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  const lang = useLang();
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-ink-700 bg-ink-850 px-2 py-0.5 text-xs text-ink-200">
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="text-ink-500 transition-colors hover:text-accent"
          aria-label={t('remove', lang)}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
