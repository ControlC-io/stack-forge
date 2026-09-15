import type { AppSize } from './types';
import type { I18nText } from '@/i18n';

/**
 * The Coolify hosts ControlC deploys to.
 *
 * Picking one of these replaces typing RAM figures by hand. A host here is
 * `shared`: several projects live on it, so a project gets a share of the
 * machine (its `AppSize`), never the whole of it.
 */
export interface CoolifyServer {
  id: string;
  label: string;
  /** Shown under the label in the wizard. */
  details: string;
  ramGb: number;
  cpuCores: number;
  shared: boolean;
  /** Undefined means nobody has confirmed it; the output says so. */
  swap?: boolean;
}

export const CUSTOM_SERVER = 'custom';

export const SERVERS: CoolifyServer[] = [
  {
    id: 'controlc-vps',
    label: 'ControlC VPS',
    details: 'Debian 12 (bookworm) · x86_64 · 8 CPU · 15.3 GB RAM',
    ramGb: 15.3,
    cpuCores: 8,
    shared: true,
  },
];

export function serverById(id: string): CoolifyServer | undefined {
  return SERVERS.find((s) => s.id === id);
}

/** Memory this project may claim on the host, before the host's own limits. */
export const APP_SIZES: Record<AppSize, { gb: number; label: I18nText; description: I18nText }> = {
  small: {
    gb: 1.5,
    label: { es: 'Pequeña', en: 'Small', fr: 'Petite' },
    description: {
      es: 'Herramienta interna, pocos usuarios. 1,5 GB.',
      en: 'Internal tool, few users. 1.5 GB.',
      fr: 'Outil interne, peu d’utilisateurs. 1,5 Go.',
    },
  },
  medium: {
    gb: 3,
    label: { es: 'Media', en: 'Medium', fr: 'Moyenne' },
    description: {
      es: 'App de cliente normal. 3 GB.',
      en: 'A regular client app. 3 GB.',
      fr: 'Une app client classique. 3 Go.',
    },
  },
  large: {
    gb: 6,
    label: { es: 'Grande', en: 'Large', fr: 'Grande' },
    description: {
      es: 'IA, OCR, RAG o scraping: trabajo pesado en memoria. 6 GB.',
      en: 'AI, OCR, RAG or scraping: memory-heavy work. 6 GB.',
      fr: 'IA, OCR, RAG ou scraping : travail gourmand en mémoire. 6 Go.',
    },
  },
};
