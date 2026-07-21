---
stage: implement
bolt: 008-release
created: '2026-07-21T05:40:20Z'
---

## Implementation Walkthrough: release (Playwright E2E + memory budget)

### Summary

Added a Playwright E2E suite that loads the real built extension in a
persistent Chromium context, drives a local HTML fixture routed under a
`https://github.com/*` URL (so the manifest's content-script match pattern
fires), asserts the graph rail renders and one hover/click interaction
works, and measures JS heap growth on a 600-commit graph against the ≤50MB
budget. `@playwright/test` is the one new devDependency. Vitest and
Playwright are kept fully separate.

### Structure Overview

Three fixture helper modules under `e2e/fixtures/` generate a deterministic
synthetic commit DAG, the API JSON shape, and the commits-page HTML shape,
and provide `page.route()` handlers that fulfill both the commits-page
navigation and the GitHub REST API paginated response from those fixtures
entirely offline. One spec file (`e2e/extension.spec.ts`) launches a single
persistent extension context in `beforeAll` and runs all three stories'
assertions serially against that shared session, matching each story's
"reuse the same session" technical note. A root-level `playwright.config.ts`
and a new `vitest.config.ts` keep the two test runners' file globs from
overlapping.

### Completed Work

- [x] `package.json` — added `@playwright/test` devDependency and a
      `test:e2e` script (additive only; no existing script/dependency
      changed)
- [x] `pnpm-lock.yaml` — updated for the new dependency
- [x] `playwright.config.ts` — single project rooted at `e2e/`, `workers: 1`
      so the whole suite shares one browser session
- [x] `vitest.config.ts` — new file; excludes `e2e/**` so Vitest's own
      default include globs never pick up Playwright's `*.spec.ts` files
- [x] `biome.json` — added `test-results`/`playwright-report` to the
      excluded-paths list (Playwright's own run-artifact directories,
      analogous to the existing `.output`/`.wxt` exclusions)
- [x] `.gitignore` — added `test-results/` and `playwright-report/`
- [x] `e2e/fixtures/gen-commits.ts` — deterministic synthetic commit DAG
      generator (own copy, independent of the sibling bolt's benchmark
      script) producing both the GitHub API JSON shape and fixture row HTML
- [x] `e2e/fixtures/commits-page.ts` — builds the full HTML fixture page
      reproducing the commits-page DOM shape the content script's selectors
      need
- [x] `e2e/fixtures/routes.ts` — `page.route()` handlers for the commits
      page, the commit-click destination, and the paginated commits API
- [x] `e2e/fixtures/heap.ts` — CDP-session-based JS heap reader (Playwright
      has no Puppeteer-style `page.metrics()`)
- [x] `e2e/extension.spec.ts` — the three-test suite covering stories
      003/004/005
- [x] `e2e/results/heap-budget.json` — committed measured heap-delta
      evidence (see test-walkthrough.md for the numbers)

### Key Decisions

- **Route interception over a raw local file fixture**: Chrome enforces the
  content script's `https://github.com/*` manifest match pattern on the
  page's actual URL, so a `file://` fixture would never get the extension
  injected. `page.route()` fulfills a real `https://github.com/...` URL with
  local fixture content instead — deterministic and offline, while still
  satisfying the manifest match.
- **One spec file, `describe.serial`, manual context lifecycle** instead of
  Playwright's built-in `test`/`context` fixtures: the three stories
  explicitly reuse one session, and a single `beforeAll`/`afterAll` pair is
  the smallest way to share one `launchPersistentContext` across all three
  tests without introducing a custom fixture file.
- **Distinct fake repo names per concern** (`smoke-repo` for 003/004,
  `heap-repo` for 005): avoids `lib/github/cache.ts`'s 10-minute
  `chrome.storage` cache silently serving one test's fixture data to
  another.
- **`commitDepth` override via the extension's own background service
  worker** (`context.serviceWorkers()`, writing directly to
  `chrome.storage.local`'s `ggraph:settings` key): the only reachable path
  to `chrome.storage` from outside the extension's own execution contexts —
  `page.evaluate` runs in the host page's isolated world, which cannot see
  `chrome.*`.
- **`test:e2e` always runs `wxt build` first**: the simplest fix for the
  "stale build" edge case in story 003 — no separate staleness-detection
  code needed.
- **Heap "before" reading taken right after navigation resolves, not via a
  separate blank-page baseline**: matches the story's literal "before the
  content script renders a graph" wording and isolates first-load noise; a
  small artificial delay in the fixture API route guarantees this ordering
  never races an occasionally-instant fetch.

### Deviations from Plan

None — matches `implementation-plan.md`.

### Dependencies Added

- [x] `@playwright/test` (`^1.61.1`) — the one new devDependency this
      intent introduces; Chromium browser binary installed via
      `pnpm exec playwright install chromium` (one-time, not wired into any
      script, so `pnpm install` never forces a browser download)

### Developer Notes

- Run `pnpm exec playwright install chromium` once per machine before
  `pnpm test:e2e` — not automated into `postinstall` deliberately, per the
  unit brief's "adds install/runtime weight only to devDependencies" framing.
- The heap-budget test rewrites `e2e/results/heap-budget.json` on every run;
  it's committed as evidence but will naturally change on rerun — that's
  expected, not a bug.
- `test-results/`/`playwright-report/` are Playwright's own run-artifact
  directories (traces/screenshots on failure, `.last-run.json`); gitignored
  and excluded from Biome's scan, same treatment as `.output`/`.wxt`.
