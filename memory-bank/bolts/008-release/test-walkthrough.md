---
stage: test
bolt: 008-release
created: '2026-07-21T05:40:20Z'
---

## Test Report: release (Playwright E2E + memory budget)

### Summary

- **Tests**: 3/3 Playwright E2E tests passed; 130/130 existing Vitest tests
  still passed (unaffected)
- **Command**: `pnpm test:e2e` (runs `wxt build && playwright test`) — ran
  successfully in this sandbox; headed Chromium extension loading was **not**
  blocked here, so live execution is included below rather than
  MANUAL-PENDING
- **Coverage**: all three assigned stories (003, 004, 005) fully exercised

### Test Files

- [x] `e2e/extension.spec.ts` — one `describe.serial` block, three tests:
  - `003: loads the built extension and renders the graph rail`
  - `004: hover shows the tooltip, click navigates to the commit`
  - `005: JS heap delta for a >=500-commit graph stays within the 50MB budget`

### Acceptance Criteria Validation

**003-e2e-extension-load**
- ✅ Playwright launches a persistent Chromium context with the unpacked
  `.output/chrome-mv3` extension loaded (`--disable-extensions-except`/
  `--load-extension`)
- ✅ Navigating to the routed commits fixture (`https://github.com/testowner/smoke-repo/commits/main`)
  causes `#ggraph-rail` to appear within a 5s bounded wait
- ✅ Runs via a documented command (`pnpm test:e2e`), no manual interaction
- ✅ Failure message (if the canvas doesn't appear) names the expected
  selector and points at `lib/github/selectors.ts`/the fixture HTML, not a
  bare timeout

**004-e2e-interaction-smoke**
- ✅ Hovering the first commit node shows `#ggraph-tooltip` with the
  fixture's known message ("Fixture commit 0") and author ("Fixture Author")
- ✅ Clicking the node navigates to a `/commit/{sha}` URL (asserted via
  `page.waitForURL` + pathname check)
- ✅ Both interactions run inside the test body directly — any thrown error
  fails the test with that error, nothing is swallowed
- ✅ Host-page-safety: collected `console` (error-level) and `pageerror`
  events across the whole session are asserted to contain nothing
  `"[ggraph]"`-prefixed (the project's sanctioned error-log prefix) —
  zero found

**005-memory-heap-budget**
- ✅ Baseline (`JSHeapUsedSize` via a CDP `Performance.getMetrics` session)
  captured immediately after navigation resolves, before the 600-commit
  graph has rendered
- ✅ Second measurement taken once `#ggraph-rail` is visible and a frame has
  settled; delta computed
- ✅ Delta reported pass/fail against ≤50MB and recorded in
  `e2e/results/heap-budget.json` (committed, not just asserted in prose)
- ✅ Repeated 3× per run; results are in a consistent range (see numbers
  below) — no wild divergence

### Recorded Measurement (`e2e/results/heap-budget.json`, latest run)

| Sample | Before (MB) | After (MB) | Delta (MB) | Budget | Pass |
|---|---|---|---|---|---|
| 1 | 1.10 | 2.23 | 1.13 | ≤50 | ✅ |
| 2 | 1.31 | 1.88 | 0.57 | ≤50 | ✅ |
| 3 | 1.31 | 1.88 | 0.57 | ≤50 | ✅ |

600 commits rendered; all deltas well under budget (largest sample ~2% of
the 50MB allowance) and consistent across repeats (samples 2–3 nearly
identical; sample 1 slightly higher, consistent with one-time JIT/first-paint
warmup rather than a leak). Note the documented caveat: this measures the
full page's JS heap (fixture HTML + extension), not an extension-isolated
number — the before/after delta is what isolates the extension's own
contribution, per story 005's technical notes.

### Full Verification Pipeline (this run)

- `pnpm build` — ✅ builds `.output/chrome-mv3` (38.58 kB total)
- `pnpm test:e2e` — ✅ 3/3 Playwright tests passed (~8s wall clock)
- `pnpm lint` (Biome) — ✅ clean, including all new `e2e/*` files
- `pnpm typecheck` (`tsc --noEmit`) — ✅ clean
- `pnpm test` (Vitest) — ✅ 130/130 passed, 12 test files — confirms `e2e/**`
  is correctly excluded from Vitest's own run (no file-count regression)

### Issues Found

None. One config gap found and fixed during Stage 2: Biome's `files.includes`
didn't exclude Playwright's own run-artifact directories
(`test-results/`, `playwright-report/`), which briefly failed `pnpm lint` on
a generated `.last-run.json`/report file with a formatting nit. Fixed by
excluding them the same way `.output`/`.wxt` already are, and gitignoring
both directories.

### Notes

- `pnpm exec playwright install chromium` was run once in this environment
  before testing (documented in `implementation-walkthrough.md`'s Developer
  Notes) — required once per machine, not wired into `postinstall`.
- Environment caveat from the task brief did not materialize here: headed
  Chromium launched fine and the MV3 unpacked extension loaded and ran
  correctly, including its background service worker (used to override
  `commitDepth` for the heap test). No MANUAL-PENDING items remain for this
  bolt's stories.
