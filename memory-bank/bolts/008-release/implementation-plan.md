---
stage: plan
bolt: 008-release
created: '2026-07-21T05:40:20Z'
---

## Implementation Plan: release (Playwright E2E + memory budget)

### Objective

Add the roadmap-required Playwright E2E smoke test: load the real built
extension in Chromium, prove the graph rail renders on a commits page, prove
one hover/click interaction works, and measure JS heap growth on a
≥500-commit graph against the ≤50MB budget.

### Deliverables

- `@playwright/test` (devDependency, additive to `package.json`)
- `playwright.config.ts` — single project, `testDir: "e2e"`, `workers: 1`
  (tests share one persistent extension context, must run serially)
- `vitest.config.ts` (new — none exists today) — sets `test.exclude` to the
  Vitest defaults **plus** `e2e/**`, since Vitest's default `include` pattern
  (`**/*.{test,spec}.*`) would otherwise also pick up Playwright's
  `*.spec.ts` files
- `e2e/fixtures/gen-commits.ts` — synthetic commit DAG generator (own copy,
  independent of `benchmarks/layout-bench.mjs` which is 007's file) producing
  both the GitHub REST API JSON shape and matching HTML row markup
- `e2e/fixtures/commits-page.ts` — builds a full HTML page string
  reproducing the commits-page DOM shape (`data-testid="commit-row-item"`
  rows containing `a[href="/commit/{sha}"]`)
- `e2e/extension.spec.ts` — one file, `test.describe.serial`, three tests
  (003 load, 004 interaction, 005 heap budget) sharing one
  `launchPersistentContext` opened in `beforeAll`
- `e2e/results/heap-budget.json` — committed output of the 005 measurement
- `package.json` script: `"test:e2e": "wxt build && playwright test"`
  (always rebuilds first — the simplest fix for the "stale build" edge case
  in story 003, no separate staleness-check code needed)

### Dependencies

- `@playwright/test` — the one new devDependency this intent introduces
  (named explicitly by `coding-standards.md` and `requirements.md`)
- Existing build output `.output/chrome-mv3` (produced by `wxt build`, which
  `test:e2e` runs first)
- Chromium browbrowser binary via `pnpm exec playwright install chromium`
  (one-time, documented, not wired into any script — avoids forcing a
  browser download on every `pnpm install`)

### Technical Approach

**Extension loading**: `chromium.launchPersistentContext(userDataDir, { headless: false, args: ["--disable-extensions-except=<abs .output/chrome-mv3>", "--load-extension=<same path>"] })`.
MV3 unpacked-extension loading needs a persistent context; a fresh temp
`userDataDir` per run keeps `chrome.storage.local` empty (no stale
cache/token/settings bleeding between runs). `headless: false` is used
because headless extension loading is inconsistent across Chromium
versions; this is the standard Playwright+MV3 pattern. If the sandbox has no
window/display server, this launch call is expected to be the first failure
point (see Environment Caveat below).

**Local fixture over live GitHub** (per `requirements.md` Open Questions,
resolved default): rather than hitting `github.com` for real, `page.route()`
intercepts two things so the extension believes it's on a real page while
everything stays offline and deterministic:
1. The commits-page navigation itself
   (`https://github.com/{owner}/{repo}/commits*`) is fulfilled with our own
   HTML string reproducing the DOM shape the content script's selectors need
   (`lib/github/selectors.ts`'s `COMMIT_ROW_SELECTORS`/`COMMIT_HREF_RE`).
2. `https://api.github.com/repos/{owner}/{repo}/commits*` is fulfilled with
   fixture commit JSON (paginated the same way the real API is — `page`
   query param, 100-per-page slices, matching `lib/github/fetch-commits.ts`'s
   own pagination loop).

Routing (not a raw local file/`file://` URL) is required because the
content script's `matches: ["https://github.com/*"]` manifest pattern is
enforced by Chrome itself — the page's actual URL must be `https://github.com/...`
for the extension to inject at all, even though the response body is local.

Distinct fake repo names are used per test concern
(`testowner/smoke-repo` for 003/004, `testowner/heap-repo` for 005) so the
10-minute `chrome.storage` cache (`lib/github/cache.ts`) from one test never
serves stale/wrong-sized data to another.

**Interaction (004)**: locate the first commit row's `getBoundingClientRect()`
(already present in the DOM, no need to reimplement lane-math) and the
rail canvas's own rect, then `page.mouse.move` to that point. Assert
`#ggraph-tooltip` becomes visible with the fixture's known message/author/date
substrings. Then click and assert the page navigates to `/commit/{sha}`
(fixture also routes that commit URL so the resulting real navigation stays
offline). Console/page-error listeners are attached from context creation;
asserted empty (or free of `"[ggraph]"`-prefixed errors, the project's
sanctioned log prefix per `coding-standards.md`) at the end of the test —
doubles as the host-page-safety check.

**Heap budget (005)**: navigate once to the `heap-repo` fixture (≥500
commits — `commitDepth` is bumped past the 200 default by writing
`{"commitDepth": 600}` directly to `chrome.storage.local` via the
extension's own background service worker, reached through
`context.serviceWorkers()`/`context.waitForEvent("serviceworker")`, before
navigating). Heap is read via a CDP session
(`context.newCDPSession(page)` → `Performance.enable` +
`Performance.getMetrics()` → `JSHeapUsedSize`), since Playwright (unlike
Puppeteer) has no built-in `page.metrics()`. "Before" is measured immediately
after `page.goto()` resolves (the content script's async fetch chain hasn't
completed render yet — the fixture API route adds a small artificial delay
to make this ordering reliable, not racy); "after" is measured once
`#ggraph-rail` appears and one `requestAnimationFrame` has settled. Best-effort
GC (`HeapProfiler.collectGarbage` CDP command, swallowed if unsupported)
runs before each reading to cut noise. The cycle repeats 3× (fresh navigation
each time, same page/context) to satisfy the "results in a consistent range"
acceptance criterion; all three `{before, after, delta}` samples are written
to `e2e/results/heap-budget.json` (the committed, non-prose record) and each
delta is asserted `≤ 50MB`.

### Environment Caveat

Per the task brief, headed-Chromium/extension-context launch may not work in
this sandbox (no display server). Plan: attempt the real run once;
if `launchPersistentContext` (or the earlier `playwright install chromium`)
fails, do not retry in a loop — write the complete, correct test/config,
get `pnpm lint`/`pnpm typecheck` green, and record the run as
MANUAL-PENDING in `test-walkthrough.md` with the exact command
(`pnpm test:e2e`) and the exact error hit.

### Acceptance Criteria

- [ ] `pnpm build` produces `.output/chrome-mv3` and `test:e2e` runs it first
- [ ] Playwright loads the unpacked extension via a persistent context
- [ ] Graph rail canvas (`#ggraph-rail`) appears on the routed commits fixture
      within a bounded wait, with a descriptive failure message on timeout
- [ ] Hover over a node shows `#ggraph-tooltip` with matching content
- [ ] Click on a node navigates to `/commit/{sha}`
- [ ] No unhandled/`[ggraph]`-prefixed console errors during the interaction
- [ ] Heap delta (before render → after ≥500-commit render) is measured 3×,
      recorded in `e2e/results/heap-budget.json`, and asserted ≤50MB
- [ ] `pnpm test` (vitest, 130 existing tests) still passes; `e2e/` is
      excluded from Vitest's own run
- [ ] `pnpm lint` / `pnpm typecheck` clean, including the new `e2e/` files
- [ ] `package.json` changes are additive only (no existing dep/script
      removed or altered)
