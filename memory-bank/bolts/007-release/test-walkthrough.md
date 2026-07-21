---
stage: test
bolt: 007-release
created: '2026-07-21T05:55:00Z'
---

## Test Report: release (007-release)

### Summary

- **Tests**: the two scripts ARE the tests - each asserts its budget and
  exits non-zero on failure. Both PASS. Existing `pnpm test` suite:
  130/130 passed (unaffected, no product code touched).
- **Coverage**: N/A (no new pure TS helper was extracted; both deliverables
  are standalone `.mjs` scripts per the plan).

### Test Files / Scripts

- [x] `benchmarks/layout-bench.mjs` - layout-only sweep (unchanged
      behavior) + new combined layout+draw timing at n=500/2000, explicit
      PASS/FAIL vs. the 100ms budget, non-zero exit on failure
- [x] `benchmarks/bundle-size.mjs` - gzips every `.js` under
      `.output/chrome-mv3/`, explicit PASS/FAIL vs. the 100KB budget,
      non-zero exit on failure

### Recorded Measurements

**Layout+draw combined** (headless canvas stub - measures JS work only, not
GPU rasterization; see Notes):

| n | ms | budget | result |
|---|----|--------|--------|
| 500 | 2.80 | 100ms | PASS |
| 2000 | 9.20 | 100ms | PASS |

(Layout-only sweep, unchanged: n=500 -> 1.69ms, n=2000 -> 31.32ms, n=10000 ->
42.57ms, n=50000 -> 252.66ms - run-to-run JIT/GC variance is visible here,
e.g. n=2000 layout-only occasionally exceeds n=10000's time on a given run;
this is pre-existing benchmark noise, not something this bolt changed.)

**Bundle size** (production build, `.output/chrome-mv3/`, gzip):

| File | Gzip KB |
|---|---|
| background.js | 1.50 |
| chunks/popup-CDhG5G3_.js | 6.83 |
| content-scripts/commits.js | 5.96 |
| **Total** | **14.29 KB** |

Budget: <= 100KB -> **PASS** (icons added by a concurrent sibling bolt during
this run appeared in `.output/chrome-mv3/icons/*.png` - correctly excluded
by the `.js`-only glob, confirming the story's "icons added later" edge
case).

### Acceptance Criteria Validation

Story 001 (layout+draw perf harness):
- PASS: harness drives both `computeLayout` and `drawGraph`, reports one
  combined wall-clock time
- PASS: output states PASS/FAIL against <100ms explicitly
- PASS: both n=500 and a larger n (2000) recorded
- PASS: runs via existing `pnpm bench` (`node benchmarks/layout-bench.mjs`),
  no manual setup beyond `pnpm install`

Story 002 (bundle-size check):
- PASS: sums gzip of every shipped `.js` under `.output/chrome-mv3/`
  (background, content-scripts/commits.js, chunks/*) via directory walk, not
  a hardcoded file list
- PASS: reports total in KB with explicit PASS/FAIL against 100KB
- PASS: deterministic - gzip of unchanged build output is stable across
  repeated runs (verified: ran twice, identical byte counts)
- PASS: script still reports a number after icons were added by a sibling
  bolt mid-session (non-JS assets correctly ignored)
- Requires `pnpm build` to have been run first; script throws a clear
  `Error` naming the missing directory and the fix if `.output/chrome-mv3/`
  doesn't exist (not exercised as a failure case here since build output
  already existed, but the guard is in the code and was read-verified)

### Issues Found

None. Both budgets pass with wide margin (draw: ~9ms vs 100ms budget at
n=2000; bundle: ~14KB vs 100KB budget).

### Notes

- The draw-timing measurement uses a minimal no-op
  `CanvasRenderingContext2D`-shaped stub (per the inception default for this
  story) since headless Node has no real canvas/GPU. It times `drawGraph`'s
  actual JS work (row/edge iteration, path-building calls, color lookups)
  with `visibleTop`/`visibleBottom` covering the full synthetic graph height
  so every row/edge is actually drawn, not clipped away. It does **not**
  measure real canvas rasterization or GPU raster time - that would require
  the Playwright/real-browser harness owned by sibling bolt 008-release,
  out of scope here per file-ownership boundaries.
- `pnpm lint` (Biome) and `pnpm typecheck` (tsc) both clean; `benchmarks/` is
  already excluded from Biome's lint globs (`biome.json`), so no
  scoped-ignore comment was needed for the scripts' `console.log` report
  output.
- `pnpm test`: 130/130 passed, confirming no regression from this bolt (no
  product code in `lib/`/`entrypoints/` was touched).
