import type { I18nText } from '@/i18n';
import type { Ctx } from '@/generators/context';

/**
 * The "what do I actually do now" list shown on the result screen.
 *
 * Ordered by what has to be true before the next step can work: files on disk →
 * secrets filled → stack running locally → agent invoked → deployed. Derived
 * from the blueprint so it never mentions a service the project does not have.
 */
export interface QuickstartStep {
  title: I18nText;
  detail?: I18nText;
  command?: string;
  /** Rendered in the accent colour: skipping it will bite later. */
  warn?: boolean;
}

const L = (es: string, en: string, fr: string): I18nText => ({ es, en, fr });

export function quickstart(ctx: Ctx): QuickstartStep[] {
  const steps: QuickstartStep[] = [];
  const secrets = ctx.env.filter((v) => v.secret).length;

  steps.push({
    title: L(
      'Crea el repositorio vacío y descomprime el ZIP dentro',
      'Create the empty repository and unpack the ZIP into it',
      'Créez le dépôt vide et décompressez le ZIP dedans',
    ),
    detail: L(
      'Haz el primer commit con sólo estos ficheros. Así el trabajo del agente sale como un diff que puedes leer.',
      'Commit these files first. Everything the agent does then arrives as a diff you can actually read.',
      'Commitez d’abord ces fichiers. Le travail de l’agent arrive ensuite sous forme de diff lisible.',
    ),
    command: `git init && git add -A && git commit -m "chore: scaffold"`,
  });

  steps.push({
    title: L(
      `Copia .env.example a .env y rellena los ${secrets} valores marcados como required`,
      `Copy .env.example to .env and fill in the ${secrets} values marked required`,
      `Copiez .env.example vers .env et remplissez les ${secrets} valeurs marquées required`,
    ),
    detail: L(
      'Genera cada secreto, no los inventes a mano.',
      'Generate each secret; do not make them up by hand.',
      'Générez chaque secret ; ne les inventez pas à la main.',
    ),
    command: 'openssl rand -base64 32',
  });

  if (ctx.hasSupabase) {
    steps.push({
      title: L(
        'Crea el proyecto en supabase.com y copia la URL y la anon key al .env',
        'Create the project on supabase.com and copy the URL and anon key into .env',
        'Créez le projet sur supabase.com et copiez l’URL et la clé anon dans .env',
      ),
      detail: L(
        'La service_role key no entra en el .env del frontend: salta RLS entera.',
        'The service_role key does not belong in the frontend .env: it bypasses RLS entirely.',
        'La clé service_role n’a rien à faire dans le .env du frontend : elle contourne RLS.',
      ),
      warn: true,
    });
  }

  if (ctx.hasComposeDev) {
    steps.push({
      title: L(
        'Levanta el stack en local y comprueba que todo queda healthy',
        'Bring the stack up locally and check everything reaches healthy',
        'Démarrez le stack en local et vérifiez que tout devient healthy',
      ),
      detail: L(
        'En Windows abre http://127.0.0.1, no localhost.',
        'On Windows open http://127.0.0.1, not localhost.',
        'Sous Windows, ouvrez http://127.0.0.1, pas localhost.',
      ),
      command: 'docker compose up --build',
    });
  }

  steps.push({
    title: ctx.forCursor && !ctx.forClaude
      ? L(
          'Abre la carpeta en Cursor y pega BOOTSTRAP_PROMPT.md en el chat',
          'Open the folder in Cursor and paste BOOTSTRAP_PROMPT.md into the chat',
          'Ouvrez le dossier dans Cursor et collez BOOTSTRAP_PROMPT.md dans le chat',
        )
      : L(
          'Abre la carpeta con el agente y pega BOOTSTRAP_PROMPT.md',
          'Open the folder with your agent and paste BOOTSTRAP_PROMPT.md',
          'Ouvrez le dossier avec votre agent et collez BOOTSTRAP_PROMPT.md',
        ),
    detail: L(
      'Los ficheros de instrucciones ya están en su sitio: el agente los lee solo, no hace falta pegarlos.',
      'The instruction files are already in place: the agent reads them on its own, no need to paste them.',
      'Les fichiers d’instructions sont déjà en place : l’agent les lit seul, inutile de les coller.',
    ),
    command: ctx.forCursor && !ctx.forClaude ? undefined : 'claude',
  });

  steps.push({
    title: L(
      'Pídele el plan antes que el código',
      'Ask for the plan before the code',
      'Demandez le plan avant le code',
    ),
    detail: L(
      'El prompt trae un plan numerado y un "definition of done". Que te confirme el orden y luego vaya paso a paso: revisar un diff pequeño es lo único que escala.',
      'The prompt carries a numbered plan and a definition of done. Have it confirm the order, then go step by step: reviewing a small diff is the only thing that scales.',
      'Le prompt contient un plan numéroté et une definition of done. Faites-lui confirmer l’ordre, puis avancez pas à pas : relire un petit diff est la seule chose qui passe à l’échelle.',
    ),
  });

  if (ctx.hasCoolify) {
    steps.push({
      title: L(
        'Cuando funcione en local, despliega en Coolify',
        'Once it works locally, deploy to Coolify',
        'Une fois que ça marche en local, déployez sur Coolify',
      ),
      detail: L(
        'Recurso Docker Compose → fichero docker-compose.coolify.yml → dominio sobre el servicio nginx → pega el .env en la UI.',
        'Docker Compose resource → docker-compose.coolify.yml → domain on the nginx service → paste the .env into the UI.',
        'Ressource Docker Compose → docker-compose.coolify.yml → domaine sur le service nginx → collez le .env dans l’UI.',
      ),
    });

    steps.push({
      title: ctx.memory.swap
        ? L(
            'Programa las copias de seguridad de la base de datos',
            'Schedule the database backups',
            'Planifiez les sauvegardes de la base de données',
          )
        : L(
            'Crea el fichero de swap y programa las copias de seguridad',
            'Create the swap file and schedule the database backups',
            'Créez le fichier de swap et planifiez les sauvegardes',
          ),
      detail: L(
        'Nada de esto puede vivir en el repo, así que es lo que siempre se olvida.',
        'None of this can live in the repo, which is exactly why it is always the thing that gets forgotten.',
        'Rien de tout cela ne peut vivre dans le dépôt, c’est précisément ce qu’on oublie toujours.',
      ),
      warn: !ctx.memory.swap,
    });
  }

  return steps;
}
