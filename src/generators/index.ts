import type { Blueprint, GeneratedFile } from '@/catalog/types';
import { buildContext } from './context';
import {
  generateAgentsMd,
  generateClaudeMd,
  generateClaudePointer,
  generateCursorPointer,
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
} from './infra';
import { generatePrompt } from './prompt';

/** The full output set for a blueprint, in the order the tabs show them. */
export function generateFiles(bp: Blueprint): GeneratedFile[] {
  const ctx = buildContext(bp);
  const files: GeneratedFile[] = [];

  files.push({ path: 'BOOTSTRAP_PROMPT.md', language: 'markdown', contents: generatePrompt(ctx) });

  // With one agent, its own file holds the instructions. With two, AGENTS.md
  // holds them once and the tool-specific files are pointers — three copies of
  // the same rules is how they drift apart.
  const shared = ctx.forClaude && ctx.forCursor;
  if (shared) {
    files.push({ path: 'AGENTS.md', language: 'markdown', contents: generateAgentsMd(ctx) });
  }
  if (ctx.forClaude) {
    files.push({
      path: 'CLAUDE.md',
      language: 'markdown',
      contents: shared ? generateClaudePointer() : generateClaudeMd(ctx),
    });
  }
  if (ctx.forCursor) {
    files.push({
      path: '.cursor/rules/project.mdc',
      language: 'markdown',
      contents: shared ? generateCursorPointer(ctx) : generateCursorRules(ctx),
    });
  }

  // No README: the prompt already carries everything one would say, and its plan
  // ends by telling the agent to write one — from the project that exists by
  // then, not from a guess made before any code was written.
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
