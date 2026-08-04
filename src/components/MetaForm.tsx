import type { ProjectMeta } from '@/catalog/types';
import { t, useLang } from '@/i18n';
import { Field, TextArea, TextInput } from './ui';
import { slugify } from '@/lib/utils';

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
        <Field label={t('fieldName', lang)}>
          <TextInput
            value={meta.name}
            placeholder="Folio App"
            onChange={(e) => {
              const name = e.target.value;
              // Keep the slug in sync until the user overrides it by hand.
              const auto = !meta.slug || meta.slug === slugify(meta.name);
              onChange({ ...meta, name, slug: auto ? slugify(name) : meta.slug });
            }}
          />
        </Field>

        <Field label={t('fieldSlug', lang)} hint={t('slugHint', lang)}>
          <TextInput
            value={meta.slug}
            placeholder="folio-app"
            onChange={(e) => set('slug', slugify(e.target.value))}
          />
        </Field>
      </div>

      <Field label={t('fieldDescription', lang)} hint={t('descriptionHint', lang)}>
        <TextArea
          value={meta.description}
          placeholder={t('descriptionPlaceholder', lang)}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('fieldDomain', lang)} hint={t('domainHint', lang)}>
          <TextInput
            value={meta.domain}
            placeholder="app.midominio.com"
            onChange={(e) => set('domain', e.target.value)}
          />
        </Field>

        <Field label={t('fieldPort', lang)} hint={t('portHint', lang)}>
          <TextInput
            value={meta.httpPort}
            inputMode="numeric"
            placeholder="80"
            onChange={(e) => set('httpPort', e.target.value.replace(/\D/g, ''))}
          />
        </Field>
      </div>

      <Field label={t('fieldExtra', lang)} hint={t('extraHint', lang)}>
        <TextArea
          value={meta.extraContext}
          placeholder={t('extraPlaceholder', lang)}
          onChange={(e) => set('extraContext', e.target.value)}
        />
      </Field>
    </section>
  );
}
