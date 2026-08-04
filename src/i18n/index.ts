import { createContext, useContext } from 'react';

/**
 * UI localisation.
 *
 * Only the interface is translated. Everything the generators emit — prompts,
 * CLAUDE.md, compose files — is always English, because it is read by a coding
 * agent and lives in a repository whose code is English.
 */
export const LANGS = ['es', 'en', 'fr'] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABELS: Record<Lang, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
};

/** A plain string means "identical in every language" (product names, mostly). */
export type I18nText = string | Partial<Record<Lang, string>>;

export function tx(text: I18nText, lang: Lang): string {
  if (typeof text === 'string') return text;
  return text[lang] ?? text.en ?? text.es ?? text.fr ?? '';
}

export const LanguageContext = createContext<Lang>('es');

export function useLang(): Lang {
  return useContext(LanguageContext);
}

type Dict = Record<Lang, string>;

const UI = {
  tagline: {
    es: '— plantillas de arranque para Claude Code y Cursor',
    en: '— bootstrap templates for Claude Code and Cursor',
    fr: '— modèles de démarrage pour Claude Code et Cursor',
  },
  reset: { es: 'Empezar de cero', en: 'Start over', fr: 'Recommencer' },
  back: { es: 'Atrás', en: 'Back', fr: 'Retour' },
  next: { es: 'Siguiente', en: 'Next', fr: 'Suivant' },
  generate: { es: 'Generar', en: 'Generate', fr: 'Générer' },
  chooseOne: { es: 'Elige una opción', en: 'Pick one', fr: 'Choisissez une option' },
  chooseMany: { es: 'Puedes elegir varias', en: 'Pick as many as you need', fr: 'Plusieurs choix possibles' },
  recommended: { es: 'recomendado', en: 'recommended', fr: 'recommandé' },
  requires: { es: 'Requiere', en: 'Requires', fr: 'Nécessite' },
  incompatible: { es: 'Incompatible con', en: 'Incompatible with', fr: 'Incompatible avec' },
  remove: { es: 'Quitar', en: 'Remove', fr: 'Retirer' },
  language: { es: 'Idioma', en: 'Language', fr: 'Langue' },

  screenProject: { es: 'Proyecto', en: 'Project', fr: 'Projet' },
  screenResult: { es: 'Resultado', en: 'Result', fr: 'Résultat' },

  metaTitle: {
    es: '¿Qué vas a construir?',
    en: 'What are you building?',
    fr: 'Que construisez-vous ?',
  },
  metaHelp: {
    es: 'Sólo el nombre es obligatorio. Todo lo demás se puede rellenar después en el repo generado.',
    en: 'Only the name is required. Everything else can be filled in later in the generated repo.',
    fr: 'Seul le nom est obligatoire. Le reste peut être complété plus tard dans le dépôt généré.',
  },
  fieldName: { es: 'Nombre del proyecto', en: 'Project name', fr: 'Nom du projet' },
  fieldSlug: { es: 'Slug', en: 'Slug', fr: 'Slug' },
  slugHint: {
    es: 'Nombres de contenedores, volúmenes y COMPOSE_PROJECT_NAME.',
    en: 'Container names, volume names and COMPOSE_PROJECT_NAME.',
    fr: 'Noms des conteneurs, des volumes et COMPOSE_PROJECT_NAME.',
  },
  fieldDescription: { es: 'Descripción', en: 'Description', fr: 'Description' },
  descriptionHint: {
    es: 'Una o dos frases: qué hace y para quién.',
    en: 'One or two sentences: what it does and for whom.',
    fr: 'Une ou deux phrases : ce que ça fait et pour qui.',
  },
  descriptionPlaceholder: {
    es: 'Plataforma de inteligencia documental: los usuarios suben documentos y consultan su contenido por chat.',
    en: 'Document intelligence platform: users upload documents and query them through a chat interface.',
    fr: "Plateforme d'intelligence documentaire : les utilisateurs déposent des documents et les interrogent par chat.",
  },
  fieldDomain: { es: 'Dominio de producción', en: 'Production domain', fr: 'Domaine de production' },
  domainHint: {
    es: 'Opcional. Se usa en el README y en el .env.example.',
    en: 'Optional. Used in the README and .env.example.',
    fr: 'Facultatif. Utilisé dans le README et le .env.example.',
  },
  fieldPort: { es: 'Puerto HTTP local', en: 'Local HTTP port', fr: 'Port HTTP local' },
  portHint: {
    es: 'Si ya tienes otro proyecto en el 80, cámbialo aquí.',
    en: 'Change it if another project already owns port 80.',
    fr: 'À changer si un autre projet occupe déjà le port 80.',
  },
  fieldExtra: {
    es: 'Contexto extra para el agente',
    en: 'Extra context for the agent',
    fr: "Contexte supplémentaire pour l'agent",
  },
  extraHint: {
    es: 'Se añade literalmente al final del prompt: reglas de negocio, integraciones, lo que no encaje en las opciones.',
    en: 'Appended verbatim to the prompt: business rules, integrations, anything the options do not cover.',
    fr: "Ajouté tel quel à la fin du prompt : règles métier, intégrations, tout ce que les options ne couvrent pas.",
  },
  extraPlaceholder: {
    es: 'El cliente ya tiene un ERP con API REST; hay que importar clientes de ahí cada noche.',
    en: 'The client already runs an ERP with a REST API; customers must be imported from it nightly.',
    fr: "Le client dispose déjà d'un ERP avec une API REST ; les clients doivent en être importés chaque nuit.",
  },

  summarySelection: { es: 'Selección', en: 'Selection', fr: 'Sélection' },
  summaryEmpty: {
    es: 'Nada seleccionado todavía.',
    en: 'Nothing selected yet.',
    fr: 'Rien de sélectionné pour le moment.',
  },
  summaryFiles: {
    es: 'ficheros a generar',
    en: 'files will be generated',
    fr: 'fichiers seront générés',
  },
  summaryTraps: {
    es: 'trampas documentadas',
    en: 'documented traps',
    fr: 'pièges documentés',
  },

  resultTitle: {
    es: 'Tu plantilla está lista',
    en: 'Your template is ready',
    fr: 'Votre modèle est prêt',
  },
  resultHelp: {
    es: 'Copia el prompt en Claude Code o Cursor, o baja el ZIP y descomprímelo en el repo nuevo.',
    en: 'Paste the prompt into Claude Code or Cursor, or download the ZIP and unpack it into the new repo.',
    fr: 'Collez le prompt dans Claude Code ou Cursor, ou téléchargez le ZIP et décompressez-le dans le nouveau dépôt.',
  },
  outputNote: {
    es: 'Los ficheros generados están siempre en inglés, aunque la interfaz esté en otro idioma.',
    en: 'Generated files are always in English, whatever the interface language is.',
    fr: "Les fichiers générés sont toujours en anglais, quelle que soit la langue de l'interface.",
  },
  downloadZip: { es: 'Descargar ZIP', en: 'Download ZIP', fr: 'Télécharger le ZIP' },
  copyPrompt: { es: 'Copiar prompt', en: 'Copy prompt', fr: 'Copier le prompt' },
  copy: { es: 'Copiar', en: 'Copy', fr: 'Copier' },
  download: { es: 'Bajar', en: 'Download', fr: 'Télécharger' },
} satisfies Record<string, Dict>;

export type UiKey = keyof typeof UI;

export function t(key: UiKey, lang: Lang): string {
  return UI[key][lang];
}
