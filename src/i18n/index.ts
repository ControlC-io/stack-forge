import { createContext, useContext } from 'react';

/**
 * UI localisation.
 *
 * Only the interface is translated. Everything the generators emit — prompts,
 * CLAUDE.md, compose files — is always English, because it is read by a coding
 * agent and lives in a repository whose code is English.
 */
/** Display order of the language switcher; the first entry is the default. */
export const LANGS = ['en', 'fr', 'es'] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = LANGS[0];

export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
};

/** A plain string means "identical in every language" (product names, mostly). */
export type I18nText = string | Partial<Record<Lang, string>>;

export function tx(text: I18nText, lang: Lang): string {
  if (typeof text === 'string') return text;
  return text[lang] ?? text.en ?? text.fr ?? text.es ?? '';
}

export const LanguageContext = createContext<Lang>(DEFAULT_LANG);

export function useLang(): Lang {
  return useContext(LanguageContext);
}

type Dict = Record<Lang, string>;

const UI = {
  tagline: {
    es: 'Plantillas de arranque para Claude Code y Cursor',
    en: 'Bootstrap templates for Claude Code and Cursor',
    fr: 'Modèles de démarrage pour Claude Code et Cursor',
  },
  reset: { es: 'Empezar de cero', en: 'Start over', fr: 'Recommencer' },
  back: { es: 'Atrás', en: 'Back', fr: 'Retour' },
  next: { es: 'Siguiente', en: 'Next', fr: 'Suivant' },
  generate: { es: 'Generar', en: 'Generate', fr: 'Générer' },
  chooseOne: { es: 'Elige una opción', en: 'Pick one', fr: 'Choisissez une option' },
  chooseMany: { es: 'Puedes elegir varias', en: 'Pick as many as you need', fr: 'Plusieurs choix possibles' },
  recommended: { es: 'recomendado', en: 'recommended', fr: 'recommandé' },
  locked: { es: 'base del stack', en: 'stack baseline', fr: 'socle du stack' },
  lockedHint: {
    es: 'Las opciones marcadas como base del stack no se pueden desmarcar: son la decisión que la plantilla ya tomó por ti.',
    en: 'Options marked as stack baseline cannot be unticked: they are the decision the template already made for you.',
    fr: 'Les options marquées « socle du stack » ne peuvent pas être décochées : c’est la décision déjà prise par le modèle.',
  },
  theme: { es: 'Tema', en: 'Theme', fr: 'Thème' },
  themeDark: { es: 'Oscuro', en: 'Dark', fr: 'Sombre' },
  themeLight: { es: 'Claro', en: 'Light', fr: 'Clair' },

  screenServer: { es: 'Servidor', en: 'Server', fr: 'Serveur' },
  serverTitle: {
    es: '¿En qué servidor de Coolify se despliega?',
    en: 'Which Coolify server does it deploy to?',
    fr: 'Sur quel serveur Coolify est-il déployé ?',
  },
  serverHelp: {
    es: 'Con esto se calculan los límites de memoria del compose de producción. No hace falta tocar números.',
    en: 'This sizes the memory limits of the production compose. No numbers to type.',
    fr: 'Cela dimensionne les limites mémoire du compose de production. Aucun chiffre à saisir.',
  },
  serverCustom: { es: 'Otro servidor', en: 'Another server', fr: 'Autre serveur' },
  serverCustomHint: {
    es: 'Un VPS que no está en la lista: indica su RAM.',
    en: 'A VPS that is not listed: enter its RAM.',
    fr: 'Un VPS absent de la liste : indiquez sa RAM.',
  },
  serverRam: { es: 'RAM total del servidor (GB)', en: 'Total host RAM (GB)', fr: 'RAM totale du serveur (Go)' },
  serverRamHint: {
    es: 'Lo que muestra Coolify en Server Details.',
    en: 'What Coolify shows under Server Details.',
    fr: 'Ce que Coolify affiche dans Server Details.',
  },
  serverSwap: { es: 'El servidor tiene fichero de swap', en: 'The host has a swap file', fr: 'Le serveur a un fichier de swap' },
  appSize: {
    es: '¿Cuánta memoria le damos a esta app?',
    en: 'How much memory does this app get?',
    fr: 'Combien de mémoire pour cette app ?',
  },
  serverBudget: { es: 'Ver el reparto calculado', en: 'See the computed budget', fr: 'Voir la répartition calculée' },
  serverNodeHeap: { es: 'Heap de Node en la API', en: 'Node heap for the API', fr: 'Heap Node de l’API' },
  why: { es: '¿Por qué hace falta?', en: 'Why is this needed?', fr: 'Pourquoi est-ce nécessaire ?' },
  whyName: {
    es: 'Da nombre al prompt, a COMPOSE_PROJECT_NAME y a los contenedores y volúmenes. Cambiarlo después deja huérfanos los volúmenes con los datos.',
    en: 'It names the prompt, COMPOSE_PROJECT_NAME, the containers and the volumes. Changing it later orphans the volumes holding the data.',
    fr: 'Il nomme le prompt, COMPOSE_PROJECT_NAME, les conteneurs et les volumes. Le changer plus tard rend orphelins les volumes contenant les données.',
  },
  whyDomain: {
    es: 'Opcional. Rellena PUBLIC_URL en el .env.example; si aún no lo sabes, déjalo vacío.',
    en: 'Optional. It fills PUBLIC_URL in .env.example; leave it empty if you do not know it yet.',
    fr: 'Facultatif. Remplit PUBLIC_URL dans le .env.example ; laissez vide si vous ne le connaissez pas encore.',
  },
  whyDescription: {
    es: 'Sí, es lo más importante. Es lo único que le dice al agente qué construir: va a la sección Product del prompt y al AGENTS.md. Vacía, el prompt dice TODO y el agente adivina.',
    en: 'Yes, it is the most important part. It is the only thing telling the agent what to build: it goes into the Product section of the prompt and AGENTS.md. Empty, the prompt says TODO and the agent guesses.',
    fr: 'Oui, c’est le plus important. C’est la seule chose qui dit à l’agent quoi construire : elle va dans la section Product du prompt et dans AGENTS.md. Vide, le prompt indique TODO et l’agent devine.',
  },
  whyExtra: {
    es: 'Opcional. Para lo que las opciones no cubren: reglas de negocio, integraciones, el idioma de la interfaz. Se pega tal cual al final del prompt.',
    en: 'Optional. For what the options do not cover: business rules, integrations, the UI language. It is pasted verbatim at the end of the prompt.',
    fr: 'Facultatif. Pour ce que les options ne couvrent pas : règles métier, intégrations, langue de l’interface. Collé tel quel à la fin du prompt.',
  },
  whyServer: {
    es: 'Cada contenedor recibe un mem_limit. Si lo supera muere con exit 137 aunque la máquina tenga RAM libre, así que los límites salen del servidor real.',
    en: 'Every container gets a mem_limit. One that exceeds it dies with exit 137 even when the box has RAM free, so the limits come from the real host.',
    fr: 'Chaque conteneur reçoit un mem_limit. S’il le dépasse, il meurt avec exit 137 même si la machine a de la RAM libre : les limites viennent donc du vrai serveur.',
  },
  whyAppSize: {
    es: 'El VPS lo comparten varios proyectos. Esta es la parte que se lleva esta app, repartida entre la API, la base de datos y MinIO.',
    en: 'Several projects share the VPS. This is the share of this app, split between the API, the database and MinIO.',
    fr: 'Plusieurs projets partagent le VPS. C’est la part de cette app, répartie entre l’API, la base de données et MinIO.',
  },
  whyServerRam: {
    es: 'Sin la RAM real, los límites de memoria serían una suposición.',
    en: 'Without the real RAM, the memory limits would be a guess.',
    fr: 'Sans la RAM réelle, les limites mémoire seraient une supposition.',
  },
  whySwap: {
    es: 'Sin swap, un pico mata un contenedor en lugar de ralentizarlo. Si no hay, el resultado te pide crearlo.',
    en: 'Without swap, a spike kills a container instead of slowing it down. If there is none, the output tells you to add it.',
    fr: 'Sans swap, un pic tue un conteneur au lieu de le ralentir. S’il n’y en a pas, le résultat demande d’en ajouter.',
  },
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
    es: 'Unas pocas preguntas y tendrás el prompt, las instrucciones del agente y la configuración de Docker y Coolify.',
    en: 'A few questions and you get the prompt, the agent instructions and the Docker and Coolify configuration.',
    fr: 'Quelques questions et vous obtenez le prompt, les instructions de l’agent et la configuration Docker et Coolify.',
  },
  fieldName: { es: 'Nombre del proyecto', en: 'Project name', fr: 'Nom du projet' },
  nameHint: {
    es: 'También da nombre a los contenedores y volúmenes.',
    en: 'Also names the containers and volumes.',
    fr: 'Nomme aussi les conteneurs et les volumes.',
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
    es: 'Opcional. El que pondrás en el servicio nginx de Coolify.',
    en: 'Optional. The one you will set on the nginx service in Coolify.',
    fr: 'Facultatif. Celui que vous mettrez sur le service nginx dans Coolify.',
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
  quickstartTitle: {
    es: 'Por dónde empezar',
    en: 'Where to start',
    fr: 'Par où commencer',
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
