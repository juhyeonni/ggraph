---
stage: implement
bolt: 001-graph-ui
created: 2026-07-21T02:04:52Z
---

## Implementation Walkthrough: graph-ui

### Summary

Walking skeleton implemented per the approved plan: WXT + TypeScript (strict) + Preact
scaffold with pnpm, Biome, and Vitest; MV3 manifest restricted to github.com /
api.github.com host permissions plus `storage`; a content script that detects commits
pages from the URL, finds commit rows via the isolated selectors module, and draws a
deterministic dummy DAG on an absolutely positioned canvas rail through the real
pipeline shape (dummy layout module → canvas draw module). SPA navigation is handled
via WXT's `wxt:locationchange` event with a bounded retry poll for late-rendering
content; extension reload cleanup goes through `ctx.onInvalidated`. `pnpm build`,
`biome check`, and `tsc --noEmit` are all green; `pnpm test` and `pnpm bench` run.

### Structure Overview

- `entrypoints/commits.content.ts` — content script: attach/detach lifecycle, retry
  poll, rail canvas creation and positioning, host-page safety try/catch
- `entrypoints/popup/` — minimal Preact popup proving the JSX toolchain end to end
- `lib/github/selectors.ts` — the single module holding the commits-URL regex and all
  GitHub DOM selectors; every function returns null/empty on mismatch, never throws
- `lib/layout/dummy-layout.ts` — pure deterministic dummy layout (fixed lane pattern,
  occasional merge edges), sized to the real row count
- `lib/draw/draw.ts` — Canvas 2D rendering of nodes/lane edges with HiDPI scaling
- `types/graph.ts` — shared `GraphRow` / `GraphLayout` types
- `wxt.config.ts`, `tsconfig.json`, `biome.json`, `package.json` — toolchain config
- `benchmarks/layout-bench.mjs` — untouched; wired to `pnpm bench`

### Completed Work

- [x] `package.json` — scripts: dev, build, postinstall (wxt prepare), test, bench, lint, typecheck
- [x] `wxt.config.ts` — manifest permissions/host_permissions, esbuild automatic JSX for Preact
- [x] `tsconfig.json` — extends WXT-generated config, strict, Preact JSX import source
- [x] `biome.json` — 2-space, 100 cols, double quotes, semicolons, trailing commas, recommended preset + `noConsole` error
- [x] `.gitignore` — node_modules, .output, .wxt
- [x] `types/graph.ts`
- [x] `lib/github/selectors.ts`
- [x] `lib/layout/dummy-layout.ts`
- [x] `lib/draw/draw.ts`
- [x] `entrypoints/commits.content.ts`
- [x] `entrypoints/popup/index.html`, `entrypoints/popup/main.tsx`
- [x] Verified: `pnpm build` (17.86 kB total output, correct MV3 manifest), `biome check` clean, `tsc --noEmit` clean, `pnpm test` exits 0 with no tests, `pnpm bench` runs the untouched benchmark

### Key Decisions

- Commit-row detection tries GitHub's current React markup first
  (`data-testid="commit-row-item"`), then falls back to the legacy
  `li.js-commits-list-item` selector; both live only in the selectors module.
- The rail is an absolutely positioned canvas appended to `document.body`, placed and
  row-aligned from `getBoundingClientRect` measurements at attach time. This keeps the
  extension out of GitHub's DOM tree (no layout interference) and keeps `lib/layout/`
  pure — row Y positions come from the content script, not the layout module.
- Because GitHub renders the commit list client-side, `wxt:locationchange` can fire
  before rows exist; the content script re-tries attachment on a bounded poll
  (250ms interval, 20 attempts) and stops silently if rows never appear (covers the
  empty-repo and selector-failure cases with the same path).
- Non-commits pages, file-history pages, and narrow viewports (< 768px) all take the
  same early-return path: no injection, no error.
- Duplicate-rail prevention is a fixed element id: every sync removes the existing
  rail before attaching, and `ctx.onInvalidated` removes it on extension reload.

### Deviations from Plan

- `@wxt-dev/module-preact` does not exist on npm (only react/vue/svelte/solid
  modules). Replaced with esbuild's built-in automatic JSX transform pointed at
  `preact` in `wxt.config.ts` — zero extra dependencies; the popup builds and runs.
  Per-component HMR is lost (dev mode does a full reload), acceptable for a one-line
  popup; `@preact/preset-vite` is the upgrade path if richer Preact DX is wanted later.
- Dropped the planned `findAnchorContainer` selector: rail position derives entirely
  from the commit-row rects, so a separate container query added nothing.
- No `vitest.config.ts`: no test files exist yet (Stage 3), `vitest run
  --passWithNoTests` works configless, and the Stage 3 selector tests can opt into
  happy-dom with a per-file environment pragma. Config file will be added only if
  Stage 3 actually needs one.
- Refs containing `/` (e.g. `feature/x`) parse as ref + file path and are skipped like
  file-history pages; correctly resolving them requires the repo's ref list, which
  arrives with bolt 002's API data. Marked inline in the selectors module.

### Dependencies Added

- Runtime: `preact` 10.29.7
- Dev: `wxt` 0.20.27, `typescript` 7.0.2, `@biomejs/biome` 2.5.4, `vitest` 4.1.10,
  `happy-dom` 20.11.0
- Dev (orchestrator-mandated, for `.specsmd/aidlc/scripts/*.cjs`): `fs-extra` 11.3.6,
  `js-yaml` 5.2.1 — verified resolvable via `require()` from repo root

### Developer Notes

- Load path for manual testing: `pnpm build`, then load `.output/chrome-mv3/` unpacked
  in Chrome.
- `pnpm.onlyBuiltDependencies: ["esbuild"]` in package.json approves esbuild's
  postinstall under pnpm 10's build-script blocking.
- Biome excludes `benchmarks/` (file must stay byte-identical), `.wxt/`, `.output/`,
  `memory-bank/`, and `.specsmd/`.
- TypeScript resolved to 7.0.2 (the native compiler); `tsc --noEmit` passes against
  the WXT-generated config. If a future WXT/TS incompatibility appears, pinning
  `typescript@^5` is the fallback.
- The rail is positioned once per attach; it does not track live layout shifts
  (window resize, list mutation). Real alignment/scroll behavior is story 006's scope.
