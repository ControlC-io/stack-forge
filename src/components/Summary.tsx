import { AlertTriangle, FileCode2 } from 'lucide-react';
import type { Blueprint } from '@/catalog/types';
import { buildContext } from '@/generators/context';
import { generateFiles } from '@/generators';
import { t, tx, useLang } from '@/i18n';
import { Chip } from './ui';

export function Summary({ blueprint }: { blueprint: Blueprint }) {
  const lang = useLang();
  const ctx = buildContext(blueprint);
  const files = generateFiles(blueprint);

  return (
    <aside className="space-y-6 text-sm">
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          {t('summarySelection', lang)}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {ctx.options.length ? (
            ctx.options.map((o) => <Chip key={o.id}>{tx(o.label, lang)}</Chip>)
          ) : (
            <p className="text-ink-500">{t('summaryEmpty', lang)}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <FileCode2 className="size-3.5" /> {files.length} {t('summaryFiles', lang)}
        </h3>
        <ul className="space-y-0.5 font-mono text-xs text-ink-400">
          {files.map((f) => (
            <li key={f.path}>{f.path}</li>
          ))}
        </ul>
      </div>

      {ctx.gotchas.length ? (
        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
            <AlertTriangle className="size-3.5" /> {ctx.gotchas.length} {t('summaryTraps', lang)}
          </h3>
          {/* Gotcha titles stay English: they are the generated documentation. */}
          <ul className="space-y-1 text-xs text-ink-400">
            {ctx.gotchas.map((g) => (
              <li key={g.id}>· {g.title}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
