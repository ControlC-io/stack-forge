import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Hammer, Moon, RotateCcw, Sun } from 'lucide-react';
import { visibleSteps } from '@/catalog/steps';
import type { Blueprint, ProjectMeta } from '@/catalog/types';
import { has } from '@/catalog/types';
import { buildContext } from '@/generators/context';
import { MetaForm } from '@/components/MetaForm';
import { ServerForm } from '@/components/ServerForm';
import { OutputView } from '@/components/OutputView';
import { StepView } from '@/components/StepView';
import { Summary } from '@/components/Summary';
import { Button } from '@/components/ui';
import {
  DEFAULT_LANG,
  LANGS,
  LANG_LABELS,
  LanguageContext,
  t,
  tx,
  type I18nText,
  type Lang,
} from '@/i18n';
import { applyToggle, emptyBlueprint, loadBlueprint, saveBlueprint } from '@/lib/blueprint';
import { cn } from '@/lib/utils';

const LANG_KEY = 'stack-forge.lang.v1';
const THEME_KEY = 'stack-forge.theme.v1';

type Theme = 'dark' | 'light';

type Screen =
  | { kind: 'meta'; id: 'meta'; title: I18nText }
  | { kind: 'step'; id: string; title: I18nText }
  | { kind: 'server'; id: 'server'; title: I18nText }
  | { kind: 'output'; id: 'output'; title: I18nText };

function loadLang(): Lang {
  const stored = localStorage.getItem(LANG_KEY);
  return LANGS.includes(stored as Lang) ? (stored as Lang) : DEFAULT_LANG;
}

function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  // No stored choice: light. index.html stamps the same value on <html> so the
  // first paint is already light and there is no flash of the dark ramp.
  return 'light';
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => loadLang());
  const [theme, setTheme] = useState<Theme>(() => loadTheme());
  const [blueprint, setBlueprint] = useState<Blueprint>(() => loadBlueprint());
  const [index, setIndex] = useState(0);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    saveBlueprint(blueprint);
  }, [blueprint]);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const screens = useMemo<Screen[]>(() => {
    const steps = visibleSteps(blueprint.selection).map<Screen>((s) => ({
      kind: 'step',
      id: s.id,
      title: s.title,
    }));
    // The host sizing screen only exists when there is something to deploy.
    const server: Screen[] = has(blueprint.selection, 'infra-coolify')
      ? [{ kind: 'server', id: 'server', title: { es: 'Servidor', en: 'Server', fr: 'Serveur' } }]
      : [];

    return [
      { kind: 'meta', id: 'meta', title: { es: 'Proyecto', en: 'Project', fr: 'Projet' } },
      ...steps,
      ...server,
      { kind: 'output', id: 'output', title: { es: 'Resultado', en: 'Result', fr: 'Résultat' } },
    ];
  }, [blueprint.selection]);

  // A branch can disappear while you are standing on it (choosing "frontend
  // only" removes the database step), so the index is always clamped.
  const current = screens[Math.min(index, screens.length - 1)]!;
  const currentIndex = screens.indexOf(current);

  const setMeta = (meta: ProjectMeta) => setBlueprint((bp) => ({ ...bp, meta }));

  const handleToggle = (stepId: string, optionId: string) => {
    setBlueprint((bp) => {
      const step = visibleSteps(bp.selection).find((s) => s.id === stepId);
      if (!step) return bp;
      return applyToggle(bp, step, optionId);
    });
  };

  const reset = () => {
    setBlueprint(emptyBlueprint());
    setIndex(0);
  };

  const step =
    current.kind === 'step'
      ? visibleSteps(blueprint.selection).find((s) => s.id === current.id)
      : undefined;

  const progress = Math.round((currentIndex / (screens.length - 1)) * 100);

  return (
    <LanguageContext.Provider value={lang}>
      <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-10 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-5">
            <div className="flex items-center gap-2">
              <Hammer className="size-5 text-accent" />
              <span className="font-semibold text-ink-100">ControlC Stack Forge</span>
              <span className="hidden text-sm text-ink-500 sm:inline">{t('tagline', lang)}</span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="flex items-center rounded-lg border border-ink-700 p-0.5"
                role="group"
                aria-label={t('language', lang)}
              >
                {LANGS.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLang(code)}
                    aria-pressed={code === lang}
                    title={LANG_LABELS[code]}
                    className={cn(
                      'rounded-md px-2 py-1 text-xs font-medium uppercase transition-colors',
                      code === lang
                        ? 'bg-ink-800 text-accent'
                        : 'text-ink-500 hover:text-ink-200',
                    )}
                  >
                    {code}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? t('themeLight', lang) : t('themeDark', lang)}
                aria-label={t('theme', lang)}
              >
                {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>

              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="size-3.5" /> {t('reset', lang)}
              </Button>
            </div>
          </div>
          <div className="h-0.5 bg-ink-800">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-5 py-8">
          <nav className="hidden w-44 shrink-0 lg:block">
            <ol className="sticky top-24 space-y-0.5">
              {screens.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors',
                      i === currentIndex
                        ? 'bg-ink-850 font-medium text-accent'
                        : 'text-ink-400 hover:bg-ink-900 hover:text-ink-200',
                    )}
                  >
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        i <= currentIndex ? 'bg-accent' : 'bg-ink-600',
                      )}
                    />
                    {tx(s.title, lang)}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <main className="min-w-0 flex-1 space-y-8">
            {current.kind === 'meta' ? <MetaForm meta={blueprint.meta} onChange={setMeta} /> : null}

            {current.kind === 'step' && step ? (
              <StepView
                step={step}
                selection={blueprint.selection}
                onToggle={(optionId) => handleToggle(step.id, optionId)}
              />
            ) : null}

            {current.kind === 'server' ? (
              <ServerForm
                meta={blueprint.meta}
                services={buildContext(blueprint).services}
                onChange={setMeta}
              />
            ) : null}

            {current.kind === 'output' ? <OutputView blueprint={blueprint} /> : null}

            <div className="flex items-center justify-between border-t border-ink-800 pt-5">
              <Button
                variant="ghost"
                onClick={() => setIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="size-4" /> {t('back', lang)}
              </Button>
              <span className="text-xs text-ink-500">
                {currentIndex + 1} / {screens.length}
              </span>
              <Button
                variant="primary"
                onClick={() => setIndex(Math.min(screens.length - 1, currentIndex + 1))}
                disabled={currentIndex === screens.length - 1}
              >
                {currentIndex === screens.length - 2 ? t('generate', lang) : t('next', lang)}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </main>

          <div className="hidden w-64 shrink-0 xl:block">
            <div className="sticky top-24">
              <Summary blueprint={blueprint} />
            </div>
          </div>
        </div>
      </div>
    </LanguageContext.Provider>
  );
}
