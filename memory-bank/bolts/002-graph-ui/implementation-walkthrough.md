---
stage: implement
bolt: 002-graph-ui
created: 2026-07-21T02:29:45Z
---

## Implementation Walkthrough: 002-graph-ui

### Summary

The dummy pipeline from bolt 001 is now the real one. The content script parses
owner/repo/ref from the URL, reads the parsed-commit cache in
`chrome.storage.local` (rendering stale data immediately when present), fetches
up to 200 commits from the unauthenticated REST API when the cache is missing or
expired, computes the true DAG layout in the pure `lib/layout/` core, and draws
it on the canvas rail — theme-aware, HiDPI-crisp, viewport-clipped, and redrawn
on scroll via requestAnimationFrame. The benchmark now imports the real layout
module. All gates green: build, lint, typecheck, tests (12/12), bench
(500 commits in 1.74ms against the <10ms budget).

### Structure Overview

- `lib/layout/compute-layout.ts` — pure `computeLayout(commits): GraphLayout`;
  gitk-style lane reservation with explicit, lazily resolved edge objects;
  type-only imports, zero runtime deps
- `lib/github/fetch-commits.ts` — `Commit` type, `DEFAULT_DEPTH`, paginated
  `fetchCommits` returning a typed ok/error union (`not-found`, `rate-limited`
  with reset epoch, `unknown`); manual `unknown`-narrowing parser, no `any`
- `lib/github/cache.ts` — one storage key per repo+ref entry; TTL freshness
  check (`isFresh`), LRU eviction by `lastAccessed` over a 20-entry cap,
  corrupt-entry discard, quota-failure evict-and-retry
- `lib/github/selectors.ts` — gained `getPageTheme()` (GitHub's
  `data-color-mode` attribute, `matchMedia` fallback for auto, never throws)
- `lib/draw/draw.ts` — edge-list renderer: visible-band clear+clip, light/dark
  lane palettes, dangling-edge stubs, resize-aware HiDPI canvas sizing
- `entrypoints/commits.content.ts` — async cache-first attach flow with a
  generation token guarding every await; per-render scroll listener with rAF
  throttle; debounced window-resize re-sync
- `types/graph.ts` — new `LayoutCommit` / `GraphRow` / `GraphEdge` /
  `GraphLayout` shapes
- `benchmarks/layout-bench.mjs` — inline algorithm deleted; imports the real
  module (Node's native type stripping; `genCommits` and the bench loop
  untouched)

### Completed Work

- [x] `types/graph.ts` — replaced implicit next-row edge shape with explicit `GraphEdge` list
- [x] `lib/layout/compute-layout.ts` — real layout core (new)
- [x] `lib/layout/dummy-layout.ts` + `dummy-layout.test.ts` — deleted (superseded)
- [x] `lib/github/fetch-commits.ts` — typed paginated fetch (new)
- [x] `lib/github/cache.ts` — storage cache with TTL + LRU (new)
- [x] `lib/github/selectors.ts` — `getPageTheme()` added
- [x] `lib/draw/draw.ts` — rewritten for edge lists, clipping, themes
- [x] `entrypoints/commits.content.ts` — rewritten for the real async pipeline
- [x] `benchmarks/layout-bench.mjs` — rewired to the real module
- [x] Verified: `pnpm build` (22.04 kB total, content script 9.95 kB),
  `pnpm lint` clean, `pnpm typecheck` clean, `pnpm test` 12/12 passing,
  `pnpm bench` 500 commits = 1.74ms (<10ms budget; 50k commits = ~144ms)

### Key Decisions

- Fetch and cache both run in the content script — host_permissions already
  cover CORS and `chrome.storage.local` is directly reachable there; a
  background worker would only add message plumbing.
- Edge resolution uses a `Map<parentSha, GraphEdge[]>` of waiting edges rather
  than a per-lane pending slot: multiple children can await the same parent, so
  the map resolves all of them the moment the parent's row appears, and the
  criss-cross lane sweep stays a pure lane-freeing concern.
- Stale-then-update: `getCacheEntry` returns entries regardless of age and the
  caller decides via `isFresh` — a stale entry renders immediately, then the
  fresh fetch re-renders over it.
- A generation counter incremented on every `start()` (SPA nav, resize) is
  checked after each await, so a slow cache read or fetch from an abandoned
  page can never paint onto the current one.
- Scroll redraws clear and repaint only the visible band (plus a 40px buffer)
  under a canvas clip; pixels outside the band keep their last-drawn state and
  are refreshed as they scroll into view, which also makes live theme switches
  converge without a theme listener.
- Rows beyond the DOM's visible list (layout knows 200 commits, GitHub shows
  ~35 rows) and parents outside the fetched window share one path: no
  resolvable y-coordinate means the edge draws as a short dangling stub.
- Rate-limit errors also cover HTTP 429 (GitHub secondary limits), not just
  403 — one extra comparison, same typed error.

### Deviations from Plan

- `chrome.storage.local` is accessed through `import { browser } from "wxt/browser"`
  instead of the bare `chrome` global: no `@types/chrome` resolves in this
  project (pnpm, no hoisted types), so the bare global does not typecheck.
  `wxt/browser` is a typed re-export of `globalThis.chrome` — identical at
  runtime, zero added dependencies, and mockable in Stage 3 by assigning
  `globalThis.chrome` before import.
- Resize handling registers once at `main()` level via `ctx.addEventListener`
  (debounced, re-runs the full sync) instead of inside the render closure — a
  window widened past the 768px minimum must attach a rail that was never
  rendered, so the listener cannot live inside a render that never happened.
- `isCommitsPage` remains exported and tested but the content script now calls
  `parseCommitsPath` directly (it needs owner/repo/ref anyway) and applies the
  same filePath check inline, avoiding a double parse.
- The benchmark header comment was updated (three lines) to state it now runs
  the real module — beyond a strict "import swap only" reading, but leaving a
  comment describing a deleted inline algorithm would have been wrong.

### Dependencies Added

None (runtime or dev).

### Developer Notes

- `pnpm bench` requires Node >= 23.6 (native type stripping to import the `.ts`
  layout module from the `.mjs` benchmark). This machine runs v24.15.0. The
  layout core's imports must stay type-only for this to keep working.
- Stage 3 test seams: `fetchCommits` mocks `globalThis.fetch`; cache tests
  assign a ~10-line in-memory `chrome.storage.local` double to
  `globalThis.chrome` before importing `cache.ts` (the `wxt/browser` shim reads
  the global at module load); `computeLayout` needs no mocks.
- Fetch failure with an empty cache is a silent no-rail today by design; typed
  errors (`not-found`, `rate-limited` + reset epoch) are surfaced from
  `fetchCommits` ready for bolt 003's degradation UI.
- The rail's y-alignment still measures real row rects per render (bolt 001
  approach), so date-group headers and variable row heights are handled by
  construction; there is still no MutationObserver on the commit list — GitHub
  re-rendering the list without a URL change would leave a stale rail until the
  next navigation/resize (bolt 003 territory if it bites).
- Canvas height for 200 commits spans the full list (~15k px logical), but
  memory is bounded by the rail's narrow width; only the visible band is ever
  cleared/painted per frame.
