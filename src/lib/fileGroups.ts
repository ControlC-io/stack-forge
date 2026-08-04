import type { GeneratedFile } from '@/catalog/types';
import type { I18nText } from '@/i18n';

/**
 * How the output is presented.
 *
 * The file count is not the burden — the reading is. Three of these files are
 * documents you actually open; the rest are consumed by Docker and nginx and
 * exist precisely so nobody has to write them by hand. Grouping says that.
 */
export type FileGroup = 'documents' | 'infra' | 'ci';

export const GROUP_LABELS: Record<FileGroup, I18nText> = {
  documents: { es: 'Documentos', en: 'Documents', fr: 'Documents' },
  infra: { es: 'Infraestructura', en: 'Infrastructure', fr: 'Infrastructure' },
  ci: { es: 'Integración continua', en: 'Continuous integration', fr: 'Intégration continue' },
};

export const GROUP_HINTS: Record<FileGroup, I18nText> = {
  documents: {
    es: 'Los abres tú y los lee el agente.',
    en: 'You open these; the agent reads them.',
    fr: 'Vous les ouvrez ; l’agent les lit.',
  },
  infra: {
    es: 'No los lee nadie: los consumen Docker y nginx.',
    en: 'Nobody reads these: Docker and nginx consume them.',
    fr: 'Personne ne les lit : Docker et nginx les consomment.',
  },
  ci: {
    es: 'Se ejecuta en cada push.',
    en: 'Runs on every push.',
    fr: 'S’exécute à chaque push.',
  },
};

export function groupOf(file: GeneratedFile): FileGroup {
  if (file.path.startsWith('.github/')) return 'ci';
  if (file.language === 'markdown') return 'documents';
  return 'infra';
}

/** Files bucketed in display order, skipping empty groups. */
export function grouped(files: GeneratedFile[]): Array<{ group: FileGroup; files: GeneratedFile[] }> {
  const order: FileGroup[] = ['documents', 'infra', 'ci'];
  return order
    .map((group) => ({ group, files: files.filter((f) => groupOf(f) === group) }))
    .filter((bucket) => bucket.files.length > 0);
}
