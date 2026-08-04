# CLAUDE.md

Guidance for Claude Code when working on this repository.

## Project overview

**ControlC Stack Forge** — a static React SPA that generates bootstrap material for new
repositories: a prompt for Claude Code / Cursor, the agent instruction files
(`CLAUDE.md`, `.cursor/rules/project.mdc`, `AGENTS.md`), and the matching Docker,
nginx and Coolify configuration.

No backend, no database, no auth. State lives in `localStorage` under
`stack-forge.blueprint.v1`.

## Commands

```bash
npm run dev        # Vite on 5173
npm run build      # tsc + vite build
npm run typecheck  # tsc --noEmit
```

## Architecture

```
src/
  catalog/     data only — the decision tree and the gotcha library
    types.ts     TechOption / Step / Blueprint, plus has()/hasAny()
    steps.ts     STEPS: the ordered decision tree
    gotchas.ts   GOTCHAS: production traps, gated by option id
  lib/
    blueprint.ts selection state, defaults, requires/conflicts, pruning
    download.ts  clipboard, single-file download, zip (fflate)
  generators/  pure functions Blueprint -> GeneratedFile[]
    context.ts   derives everything the emitters need, once
    prompt.ts / instructions.ts / infra.ts / index.ts
  components/  wizard UI
```

The data flow is one-way: `Blueprint` → `buildContext()` → generators →
`GeneratedFile[]`. Generators never read the catalog directly, only the context.

## Conventions

- Strict TypeScript, `noUncheckedIndexedAccess` is on — index access is
  `T | undefined` and must be handled.
- Tailwind CSS 4 configured with `@theme` in `src/index.css`. There is no
  `tailwind.config.js`; a config copied from a Tailwind 3 project is ignored.
- **The UI is translated (es/en/fr), generated output is always English.** On a
  `TechOption`, `label`/`description` are UI-only and are `I18nText`
  (`{ es, en, fr }`, or a plain string when the term is a product name);
  `spec`/`notes`/`tasks` land in generated files and must be English. Code and
  comments are English.
- Adding a UI string means adding a key to the `UI` dictionary in
  `src/i18n/index.ts` with all three languages — the `satisfies` clause fails
  the build if one is missing.
- Adding a technology means adding one `TechOption` to `src/catalog/steps.ts` —
  never special-casing it in a component or a generator.
- The catalog is **opinionated on purpose**. If a decision was already made for
  this stack, the option is `locked` (always on, not clickable) rather than a
  choice with a "recommended" badge. Only add a real alternative when both
  branches are ones we would genuinely ship.
- Both themes must work. Every colour goes through the `--color-ink-*` /
  `--color-accent*` tokens, which `:root[data-theme='light']` overrides — never
  hard-code a hex or add a `dark:` variant.
- Every gotcha in `src/catalog/gotchas.ts` must be real: something that actually
  broke a deployment, with the fix. This library is the point of the app; do not
  pad it with generic advice.

## Gotchas

### Selections must be pruned, not just toggled

An option can require another (`feat-uploads` requires `storage-minio`). When the
prerequisite is deselected, `prune()` in `lib/blueprint.ts` drops the dependent
selection. Without it the wizard happily generates a prompt describing an upload
endpoint with nowhere to put the bytes.

### `touched` is what makes defaults safe

`normalize()` seeds a visible step with its locked + recommended options only if
the user has never interacted with it. Without that flag, switching branch could
not seed the newly revealed steps (they would arrive empty) *and* deliberately
emptying a step — "no login on this project" — would be undone on the next
render. Locked ids do not count as an answer when deciding whether to seed.

### The step list is dynamic

`visibleSteps()` recomputes on every selection change, so the screen you are
standing on can disappear (picking "solo frontend" removes the database step).
`App.tsx` clamps the index on every render — keep that clamp.

### Vite needs `allowedHosts: true` behind a proxy

Vite 5.3+ rejects requests whose `Host` header it does not recognise, which is
what happens behind nginx or Traefik.
