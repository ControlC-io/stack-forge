import { AlertTriangle, FileCode2 } from 'lucide-react';
import type { Blueprint } from '@/catalog/types';
import { buildContext } from '@/generators/context';
import { generateFiles } from '@/generators';
import { t, tx, useLang } from '@/i18n';
import { GROUP_LABELS, grouped } from '@/lib/fileGroups';
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
          {/* Answers only: the locked baseline is the same for every project and
              buried the few choices that were actually made. */}
          {ctx.options.some((o) => !o.locked) ? (
            ctx.options.filter((o) => !o.locked).map((o) => <Chip key={o.id}>{tx(o.label, lang)}</Chip>)
          ) : (
            <p className="text-ink-500">{t('summaryEmpty', lang)}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <FileCode2 className="size-3.5" /> {files.length} {t('summaryFiles', lang)}
        </h3>
        {/* Documents open; infrastructure stays folded — it is the part you
            never read, and showing it flat makes the output look heavier than
            it is. */}
        {grouped(files).map(({ group, files: bucket }) => (
          <details key={group} open={group === 'documents'} className="group/details">
            <summary className="cursor-pointer list-none text-xs text-ink-300 marker:content-none">
              <span className="text-ink-500 group-open/details:hidden">▸ </span>
              <span className="hidden text-ink-500 group-open/details:inline">▾ </span>
              {tx(GROUP_LABELS[group], lang)}
              <span className="text-ink-500"> · {bucket.length}</span>
            </summary>
            <ul className="mt-1 mb-2 space-y-0.5 pl-3 font-mono text-xs text-ink-400">
              {bucket.map((f) => (
                <li key={f.path}>{f.path}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      {/* A count, not the list: the titles are agent documentation and do not
          help anyone answer the questions on screen. */}
      {ctx.gotchas.length ? (
        <p className="flex items-center gap-1.5 text-xs text-ink-400">
          <AlertTriangle className="size-3.5" /> {ctx.gotchas.length} {t('summaryTraps', lang)}
        </p>
      ) : null}
    </aside>
  );
}
