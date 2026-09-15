import type { Blueprint, GeneratedFile } from '@/catalog/types';
import { buildContext } from './context';
import { generateAgentsMd, generateClaudePointer } from './instructions';
import {
  generateBackendDockerfileDev,
  generateBackendDockerfileProd,
  generateComposeCoolify,
  generateComposeDev,
  generateEmailDockerfile,
  generateEntrypoint,
  generateEnvExample,
  generateNginxConf,
  generateNginxDockerfileProd,
  generateWorkerDockerfile,
} from './infra';
import { generatePrompt } from './prompt';

/** The full output set for a blueprint, in the order the tabs show them. */
export function generateFiles(bp: Blueprint): GeneratedFile[] {
  const ctx = buildContext(bp);
  const files: GeneratedFile[] = [];

  files.push({ path: 'BOOTSTRAP_PROMPT.md', language: 'markdown', contents: generatePrompt(ctx) });

  // AGENTS.md holds the rules once. Cursor and most other agents read it
  // natively; Claude Code reads CLAUDE.md, which imports it. A Cursor rule that
  // only pointed at the same file was a third copy to keep in sync.
  files.push({ path: 'AGENTS.md', language: 'markdown', contents: generateAgentsMd(ctx) });
  files.push({ path: 'CLAUDE.md', language: 'markdown', contents: generateClaudePointer() });

  // No README: the prompt already carries everything one would say, and its plan
  // ends by telling the agent to write one — from the project that exists by
  // then, not from a guess made before any code was written.
  files.push({ path: '.env.example', language: 'env', contents: generateEnvExample(ctx) });

  if (ctx.hasComposeDev) {
    files.push({ path: 'docker-compose.yml', language: 'yaml', contents: generateComposeDev(ctx) });
  }

  if (ctx.hasCoolify && ctx.hasBackend) {
    files.push({
      path: 'docker-compose.coolify.yml',
      language: 'yaml',
      contents: generateComposeCoolify(ctx),
    });
    files.push({
      path: 'nginx/Dockerfile.prod',
      language: 'dockerfile',
      contents: generateNginxDockerfileProd(ctx, 'nginx/nginx.coolify.conf'),
    });
    files.push({ path: 'nginx/nginx.coolify.conf', language: 'nginx', contents: generateNginxConf(ctx) });
  } else if (ctx.hasCoolify) {
    // One container needs no compose file: Coolify's Dockerfile resource builds
    // the root Dockerfile by default, which leaves nothing to configure.
    files.push({
      path: 'Dockerfile',
      language: 'dockerfile',
      contents: generateNginxDockerfileProd(ctx, 'nginx.conf'),
    });
    files.push({ path: 'nginx.conf', language: 'nginx', contents: generateNginxConf(ctx) });
  }

  if (ctx.hasBackend) {
    if (ctx.hasComposeDev) {
      files.push({
        path: 'backend/Dockerfile',
        language: 'dockerfile',
        contents: generateBackendDockerfileDev(),
      });
    }
    if (ctx.hasCoolify) {
      files.push({
        path: 'backend/Dockerfile.prod',
        language: 'dockerfile',
        contents: generateBackendDockerfileProd(ctx),
      });
      files.push({
        path: 'backend/docker-entrypoint.sh',
        language: 'text',
        contents: generateEntrypoint(ctx),
      });
    }
  }
  if (ctx.services.has('email_service')) {
    if (ctx.hasComposeDev) {
      files.push({
        path: 'email_service/Dockerfile',
        language: 'dockerfile',
        contents: generateEmailDockerfile('dev'),
      });
    }
    if (ctx.hasCoolify) {
      files.push({
        path: 'email_service/Dockerfile.prod',
        language: 'dockerfile',
        contents: generateEmailDockerfile('prod'),
      });
    }
  }
  if (ctx.services.has('worker')) {
    // Both compose files build this one image: a browser worker has no dev mode.
    files.push({
      path: 'worker/Dockerfile.prod',
      language: 'dockerfile',
      contents: generateWorkerDockerfile(ctx),
    });
  }

  // One trailing newline on every file, always: POSIX tools expect it and a
  // missing one shows up as a spurious diff on the very first edit.
  return files.map((f) => ({ ...f, contents: `${f.contents.replace(/\s+$/, '')}\n` }));
}

export { buildContext };
