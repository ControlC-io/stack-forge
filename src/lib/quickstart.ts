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

  if (!ctx.hasComposeDev) {
    steps.push({
      title: L('Arranca el frontend en local', 'Start the frontend locally', 'Démarrez le frontend en local'),
      detail: L(
        'Sin API ni base de datos propias no hace falta Docker en local: basta con Vite.',
        'With no API or database of your own there is no need for Docker locally: Vite is enough.',
        'Sans API ni base de données propres, Docker est inutile en local : Vite suffit.',
      ),
      command: 'cd frontend && npm install && npm run dev',
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
        'Abre http://127.0.0.1:5173 (en Windows, no localhost).',
        'Open http://127.0.0.1:5173 (on Windows, not localhost).',
        'Ouvrez http://127.0.0.1:5173 (sous Windows, pas localhost).',
      ),
      command: 'docker compose up --build',
    });
  }

  steps.push({
    title: L(
      'Abre la carpeta con Claude Code (o Cursor) y pega BOOTSTRAP_PROMPT.md',
      'Open the folder with Claude Code (or Cursor) and paste BOOTSTRAP_PROMPT.md',
      'Ouvrez le dossier avec Claude Code (ou Cursor) et collez BOOTSTRAP_PROMPT.md',
    ),
    detail: L(
      'AGENTS.md y CLAUDE.md ya están en su sitio: Claude Code y Cursor los leen solos.',
      'AGENTS.md and CLAUDE.md are already in place: Claude Code and Cursor read them on their own.',
      'AGENTS.md et CLAUDE.md sont déjà en place : Claude Code et Cursor les lisent seuls.',
    ),
    command: 'claude',
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
      detail: ctx.hasBackend
        ? L(
            'Recurso Docker Compose → fichero docker-compose.coolify.yml → dominio sobre el servicio nginx → pega el .env en la UI.',
            'Docker Compose resource → docker-compose.coolify.yml → domain on the nginx service → paste the .env into the UI.',
            'Ressource Docker Compose → docker-compose.coolify.yml → domaine sur le service nginx → collez le .env dans l’UI.',
          )
        : L(
            'Recurso Dockerfile → el Dockerfile de la raíz → dominio → límite de memoria en los límites del recurso → valores VITE_* como variables de build.',
            'Dockerfile resource → the root Dockerfile → domain → memory limit in the resource limits → VITE_* values as build variables.',
            'Ressource Dockerfile → le Dockerfile racine → domaine → limite mémoire dans les limites de la ressource → valeurs VITE_* en variables de build.',
          ),
    });
  }

  // Backups and a second look at swap only matter when there is a database of
  // your own on the host.
  if (ctx.hasCoolify && ctx.hasBackend) {
    steps.push({
      title: ctx.memory.swap === true
        ? L(
            'Programa las copias de seguridad de la base de datos',
            'Schedule the database backups',
            'Planifiez les sauvegardes de la base de données',
          )
        : L(
            'Comprueba el swap del servidor y programa las copias de seguridad',
            'Check the host swap and schedule the database backups',
            'Vérifiez le swap du serveur et planifiez les sauvegardes',
          ),
      detail: L(
        'Nada de esto puede vivir en el repo, así que es lo que siempre se olvida.',
        'None of this can live in the repo, which is exactly why it is always the thing that gets forgotten.',
        'Rien de tout cela ne peut vivre dans le dépôt, c’est précisément ce qu’on oublie toujours.',
      ),
      command: ctx.memory.swap === true ? undefined : 'swapon --show',
      warn: ctx.memory.swap !== true,
    });
  }

  return steps;
}
