import type { ProjectMeta } from '@/catalog/types';
import { t, useLang } from '@/i18n';
import { Field, TextArea, TextInput } from './ui';

interface Props {
  meta: ProjectMeta;
  onChange: (meta: ProjectMeta) => void;
}

export function MetaForm({ meta, onChange }: Props) {
  const lang = useLang();
  const set = <K extends keyof ProjectMeta>(key: K, value: ProjectMeta[K]) =>
    onChange({ ...meta, [key]: value });

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          {t('screenProject', lang)}
        </p>
        <h2 className="text-xl font-semibold text-ink-100">{t('metaTitle', lang)}</h2>
        <p className="text-sm text-ink-400">{t('metaHelp', lang)}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('fieldName', lang)} hint={t('nameHint', lang)} why={t('whyName', lang)}>
          <TextInput value={meta.name} placeholder="Folio App" onChange={(e) => set('name', e.target.value)} />
        </Field>

        <Field label={t('fieldDomain', lang)} hint={t('domainHint', lang)} why={t('whyDomain', lang)}>
          <TextInput
            value={meta.domain}
            placeholder="app.controlc.io"
            onChange={(e) => set('domain', e.target.value)}
          />
        </Field>
      </div>

      <Field
        label={t('fieldDescription', lang)}
        hint={t('descriptionHint', lang)}
        why={t('whyDescription', lang)}
      >
        <TextArea
          value={meta.description}
          placeholder={t('descriptionPlaceholder', lang)}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>

      <Field label={t('fieldExtra', lang)} hint={t('extraHint', lang)} why={t('whyExtra', lang)}>
        <TextArea
          value={meta.extraContext}
          placeholder={t('extraPlaceholder', lang)}
          onChange={(e) => set('extraContext', e.target.value)}
        />
      </Field>
    </section>
  );
}
