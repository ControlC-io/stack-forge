import { useMemo, useState } from 'react';
import { Check, Copy, Download, FileDown } from 'lucide-react';
import type { Blueprint } from '@/catalog/types';
import { generateFiles } from '@/generators';
import { buildContext } from '@/generators/context';
import { Quickstart } from './Quickstart';
import { t, useLang } from '@/i18n';
import { copyToClipboard, downloadFile, downloadZip } from '@/lib/download';
import { cn, slugify } from '@/lib/utils';
import { Button } from './ui';

export function OutputView({ blueprint }: { blueprint: Blueprint }) {
  const lang = useLang();
  const files = useMemo(() => generateFiles(blueprint), [blueprint]);
  const ctx = useMemo(() => buildContext(blueprint), [blueprint]);
  const [activePath, setActivePath] = useState<string>(files[0]?.path ?? '');
  const [copied, setCopied] = useState(false);

  const active = files.find((f) => f.path === activePath) ?? files[0];
  const slug = slugify(blueprint.meta.slug || blueprint.meta.name) || 'project';

  const copy = async (text: string) => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  if (!active) return null;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            {t('screenResult', lang)}
          </p>
          <h2 className="text-xl font-semibold text-ink-100">{t('resultTitle', lang)}</h2>
          <p className="text-sm text-ink-400">{t('resultHelp', lang)}</p>
          <p className="text-xs text-ink-500">{t('outputNote', lang)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadZip(files, slug)}>
            <FileDown className="size-4" /> {t('downloadZip', lang)}
          </Button>
          <Button variant="primary" onClick={() => copy(files[0]?.contents ?? '')}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {t('copyPrompt', lang)}
          </Button>
        </div>
      </header>

      <Quickstart ctx={ctx} />

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {files.map((f) => (
            <button
              key={f.path}
              type="button"
              onClick={() => setActivePath(f.path)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-2 text-left font-mono text-xs transition-colors',
                f.path === active.path
                  ? 'bg-ink-800 text-accent'
                  : 'text-ink-400 hover:bg-ink-850 hover:text-ink-200',
              )}
            >
              {f.path}
            </button>
          ))}
        </nav>

        <div className="min-w-0 overflow-hidden rounded-xl border border-ink-700 bg-ink-900">
          <div className="flex items-center justify-between border-b border-ink-700 px-3 py-2">
            <span className="truncate font-mono text-xs text-ink-300">{active.path}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => copy(active.contents)}>
                <Copy className="size-3.5" /> {t('copy', lang)}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => downloadFile(active)}>
                <Download className="size-3.5" /> {t('download', lang)}
              </Button>
            </div>
          </div>
          <pre className="max-h-[60vh] overflow-auto p-4 font-mono text-xs leading-relaxed text-ink-200">
            {active.contents}
          </pre>
        </div>
      </div>
    </section>
  );
}
