---
stage: plan
bolt: 001-graph-ui
created: 2026-07-21T01:55:00Z
---

## Implementation Plan: graph-ui

### Objective

Stand up the full toolchain and page lifecycle as a walking skeleton (v0.1.0):
WXT + TypeScript + Preact scaffold, MV3 manifest scoped to github.com /
api.github.com + `storage`, commits-page detection with SPA-safe attach/detach,
and a dummy DAG drawn through the real pipeline shape (layout module → canvas
draw). No real data, no real layout algorithm — those are later bolts.

### Deliverables

- `wxt.config.ts` + `package.json` (pnpm, Biome, Vitest, `@wxt-dev/module-preact`)
  producing a loadable unpacked MV3 extension via `pnpm build`
- `entrypoints/commits.content.ts` — content script: detect commits page,
  attach/detach rail on SPA navigation, draw dummy DAG
- `entrypoints/popup/` — trivial Preact popup proving the Preact toolchain wires up
- `lib/github/selectors.ts` — sole home for URL parsing + all GitHub DOM selectors
- `lib/layout/dummy-layout.ts` — pure, hardcoded/deterministic dummy `GraphLayout` generator
- `lib/draw/draw.ts` — canvas 2D draw function consuming a `GraphLayout`
- `types/graph.ts` — shared `GraphLayout`/`GraphRow` types
- `pnpm bench` script wired to existing `benchmarks/layout-bench.mjs` (unmodified)
- Biome config, `tsconfig.json` (strict), Vitest config; `pnpm test` / `biome check` / `tsc --noEmit` all pass

### Dependencies

- **Runtime**: `preact`
- **Dev**: `wxt`, `@wxt-dev/module-preact`, `typescript`, `@biomejs/biome`, `vitest`, `happy-dom` (DOM env for selector tests)
- **Dev, orchestrator-mandated**: `fs-extra`, `js-yaml` — not used by extension code; required so `.specsmd/aidlc/scripts/*.cjs` (`status-integrity.cjs`, `bolt-complete.cjs`, `artifact-validator.cjs`) can resolve them from repo-root `node_modules`
- No `@types/chrome` needed — WXT ships its own `browser`/webextension typings

### Technical Approach

**Layout on disk**
```
entrypoints/
  commits.content.ts
  popup/
    index.html
    main.tsx
lib/
  layout/dummy-layout.ts (+ .test.ts)
  github/selectors.ts (+ .test.ts)
  draw/draw.ts
types/graph.ts
wxt.config.ts, package.json, tsconfig.json, biome.json
```
`ui/` (toolbar/settings components) is not created yet — the popup is one
inline Preact line, no shared component exists to extract. Add `ui/` when a
real component appears (story 007 toolbar).

No `entrypoints/background.ts` — nothing needs a service worker yet (`storage`
permission is declared for the manifest now but first *used* by the response
cache in bolt 002). Adding an empty background entrypoint today is scaffolding
for later; skip it.

**WXT config**: `manifest.host_permissions = ["https://github.com/*", "https://api.github.com/*"]`,
`manifest.permissions = ["storage"]`, `modules: ["@wxt-dev/module-preact"]` (official
module — wires JSX/tsconfig instead of hand-rolling Vite/Preact config). Content
script `matches: ["https://github.com/*"]` (host permission is already the real
scope boundary; MV3 match-pattern path wildcards can't precisely express
`owner/repo/commits` anyway, so exact page detection happens in JS via
`selectors.ts`, not in the manifest).

**Commits-page detection** (`lib/github/selectors.ts`, the one module holding
every GitHub-specific string/selector):
- `parseCommitsPath(pathname)` → `{ owner, repo, ref?, path? } | null` via one regex against `location.pathname`, ref/owner/repo from the URL only (no DOM).
- `isCommitsPage(pathname)` → true only when `path` is absent (see file-history decision below).
- `findCommitRowEls()` → flat array of real commit-row elements across all date-group sections in document order (headers naturally excluded since only rows are selected); returns `[]` (never throws) if GitHub's markup doesn't match.
- `findAnchorContainer()` → element to position the rail against.
All DOM queries return empty/null on any mismatch — never throw. The content
script wraps every call in try/catch as a second layer of defense (NFR-3).

**SPA attach/detach**: use WXT's built-in `wxt:locationchange` window event
(`ctx.addEventListener(window, "wxt:locationchange", ...)`) instead of hand-wiring
GitHub's `turbo:load` + a manual `MutationObserver` fallback — WXT already
detects SPA navigation (history API + DOM heuristics) and exposes one event,
which is less code than reimplementing the same thing for Turbo specifically.
Content script `main(ctx)`:
1. Run `syncRail()` once immediately (initial load).
2. `ctx.addEventListener(window, "wxt:locationchange", syncRail)`.
3. `ctx.onInvalidated(syncRail's detach)` — removes this instance's rail when
   a newer content-script instance takes over on extension reload, preventing
   the duplicate-canvas edge case.

`syncRail()`: detach existing rail if present (idempotency guard via a marker
id, e.g. `#ggraph-rail`) → if `!isCommitsPage(pathname)` or no rows found or
`window.innerWidth` below a fixed breakpoint (narrow-viewport edge case),
stop (no injection) → else build/position a `<canvas id="ggraph-rail">` sized
to span the found rows, call `computeDummyLayout(rows.length)` then
`drawGraph(ctx, layout, rowTops)`.
`# ponytail: narrow-viewport breakpoint is a hardcoded window.innerWidth check, not a ResizeObserver/CSS container query — add if collapse needs to react live to resizing rather than only at attach time.`

**Dummy pipeline shape** (`types/graph.ts` → `lib/layout/dummy-layout.ts` → `lib/draw/draw.ts`):
- `GraphRow { lane: number; edges: number[] }`, `GraphLayout { rows: GraphRow[]; laneCount: number }`.
- `computeDummyLayout(rowCount: number): GraphLayout` — pure, deterministic (e.g. fixed zigzag lane pattern), no DOM/network, capped/padded to `rowCount` so it lines up with however many real rows were found. This is a placeholder, not the real lane-assignment algorithm (that's story 005, out of scope here).
- `drawGraph(ctx, layout, rowTops, rowHeight)` — draws nodes/edges at `(lane * laneWidth, rowTops[i])`. Real row `y` positions come from `findCommitRowEls()` measurements, not from the layout core, so `lib/layout/` stays pure per coding standards.

**File-history URLs (`/commits/{ref}/{path}`) — decision**: treat as **not** a
commits page (`isCommitsPage` returns false → no injection, same as any other
non-matching page). One-line justification: the file-history commit list is
API/DOM-filtered to commits touching that path, so adjacent rows are not
adjacent in the parent-child DAG (parents are frequently filtered out) —
drawing merge topology over it would be structurally misleading, not just
incomplete, so silent no-op is the simplest *safe* behavior and matches the
project's existing bias toward silent no-op under uncertainty (NFR-3).

**Testing**: `lib/layout/dummy-layout.test.ts` (pure, node env) asserts row
count and lane bounds. `lib/github/selectors.test.ts` (happy-dom env) sets
`document.body.innerHTML` to a fake commit-list fixture and asserts
`parseCommitsPath`/`isCommitsPage`/`findCommitRowEls` behavior, including the
file-history no-op case and the "selectors fail" no-op case.

### Acceptance Criteria

- [ ] `pnpm dev` / `pnpm build` produce a loadable unpacked MV3 extension with only github.com + api.github.com host permissions and `storage`
- [ ] Loaded unpacked in Chrome, any `github.com/{owner}/{repo}/commits[/{ref}]` page shows a canvas rail with a hardcoded dummy DAG
- [ ] Rail rows align to real commit rows, spanning across date-group headers
- [ ] Navigating away via GitHub SPA navigation detaches the rail cleanly (no orphan canvas, no leaked listeners)
- [ ] Navigating back to a commits page re-attaches exactly once (no duplicates)
- [ ] Non-commits GitHub pages get no canvas injected
- [ ] `/commits/{ref}/{path}` file-history pages get no canvas injected (decision above)
- [ ] Empty repo (no commit rows found) → no rail, no error
- [ ] Very narrow viewport → rail hides/collapses instead of rendering broken
- [ ] GitHub DOM/selector mismatch → nothing injected, no error reaches the host page
- [ ] Extension reloaded while a commits page is open → no duplicate canvas
- [ ] `pnpm test`, `biome check`, `tsc --noEmit` all pass
- [ ] `pnpm bench` still runs `benchmarks/layout-bench.mjs` unmodified
