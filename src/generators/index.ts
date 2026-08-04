import type { Blueprint, GeneratedFile } from '@/catalog/types';
import { buildContext } from './context';
import {
  generateAgentsMd,
  generateClaudeMd,
  generateCursorRules,
} from './instructions';
import {
  generateBackendDockerfileDev,
  generateBackendDockerfileProd,
  generateCi,
  generateComposeCoolify,
  generateComposeDev,
  generateEmailDockerfile,
  generateEntrypoint,
  generateEnvExample,
  generateNginxConf,
  generateNginxDockerfileProd,
  generateReadme,
} from './infra';
import { generatePrompt } from './prompt';

/** The full output set for a blueprint, in the order the tabs show them. */
export function generateFiles(bp: Blueprint): GeneratedFile[] {
  const ctx = buildContext(bp);
  const files: GeneratedFile[] = [];

  files.push({ path: 'BOOTSTRAP_PROMPT.md', language: 'markdown', contents: generatePrompt(ctx) });

  if (ctx.forClaude) {
    files.push({ path: 'CLAUDE.md', language: 'markdown', contents: generateClaudeMd(ctx) });
  }
  if (ctx.forCursor) {
    files.push({
      path: '.cursor/rules/project.mdc',
      language: 'markdown',
      contents: generateCursorRules(ctx),
    });
  }
  if (ctx.forClaude && ctx.forCursor) {
    files.push({ path: 'AGENTS.md', language: 'markdown', contents: generateAgentsMd(ctx) });
  }

  files.push({ path: 'README.md', language: 'markdown', contents: generateReadme(ctx) });
  files.push({ path: '.env.example', language: 'env', contents: generateEnvExample(ctx) });

  if (ctx.hasComposeDev) {
    files.push({ path: 'docker-compose.yml', language: 'yaml', contents: generateComposeDev(ctx) });
  }
  if (ctx.hasCoolify) {
    files.push({
      path: 'docker-compose.coolify.yml',
      language: 'yaml',
      contents: generateComposeCoolify(ctx),
    });
    files.push({
      path: 'nginx/Dockerfile.prod',
      language: 'dockerfile',
      contents: generateNginxDockerfileProd(ctx),
    });
    files.push({
      path: 'nginx/nginx.coolify.conf',
      language: 'nginx',
      contents: generateNginxConf(ctx, 'prod'),
    });
  }
  if (ctx.hasNginx && ctx.hasComposeDev) {
    files.push({ path: 'nginx/nginx.conf', language: 'nginx', contents: generateNginxConf(ctx, 'dev') });
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
  if (ctx.has('infra-ci')) {
    files.push({ path: '.github/workflows/ci.yml', language: 'yaml', contents: generateCi(ctx) });
  }

  // One trailing newline on every file, always: POSIX tools expect it and a
  // missing one shows up as a spurious diff on the very first edit.
  return files.map((f) => ({ ...f, contents: `${f.contents.replace(/\s+$/, '')}\n` }));
}

export { buildContext };
