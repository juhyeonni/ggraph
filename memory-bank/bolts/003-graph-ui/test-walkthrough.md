---
stage: test
bolt: 003-graph-ui
created: 2026-07-21T03:02:42Z
---

## Test Report: graph-ui

### Summary

- **Tests**: 54/54 passed (6 files: layout 10, fetch 9, cache 11, selectors 16, hit-test 5, relative-time 3)
- **Gate**: `biome check` exit 0, `tsc --noEmit` exit 0, `pnpm build` exit 0 (content script 14.13 kB), `pnpm bench` 1.61ms / 500 commits
- **New this bolt**: hit-test 5, relative-time 3, getRowSha 4 (added to the selectors suite)
- **Coverage**: not measured (no coverage tooling added, per scope)

### Test Files

- [x] `lib/draw/hit-test.test.ts` — node under pointer within radius, miss → null,
  empty list, closest-wins between two near nodes, on-radius boundary inclusion.
- [x] `lib/util/relative-time.test.ts` — minute rounding under an hour, switch to
  hours at ≥60 min, "now" for past/present reset.
- [x] `lib/github/selectors.test.ts` — extended with `getRowSha`: extracts sha
  from a commit link, ignores non-commit links, null when absent, never throws.
- [x] `lib/layout`, `lib/github/fetch-commits`, `lib/github/cache` — carried over
  from bolt 002, still green.

### Acceptance Criteria Validation

**Hover & click (007)**
- ✅ Hit-testing pure and unit-tested (nearest-within-radius, closest wins)
- ✅ `getRowSha` maps rows to commits so tooltip/highlight have per-node data (unit-tested)
- MANUAL-PENDING Tooltip contents + within-a-frame highlight on real hover
- MANUAL-PENDING Click opens `/commit/{sha}`; cmd/ctrl/middle → new tab
- MANUAL-PENDING Pointer-leave/miss clears highlight and tooltip; tooltip edge-flip
- MANUAL-PENDING No task > 50ms under rapid mousemove (pure hit-test makes this structural)

**Load-more (008)**
- ✅ SHA alignment makes paginated pages render correctly against the cached fetch (no duplicate request)
- MANUAL-PENDING Older/Newer navigation re-renders the correct page graph in-browser
- MANUAL-PENDING Parent edges connect within the window; downward-only growth

**Soft degradation (009)**
- ✅ Rate-limit reset time formatting is pure and unit-tested
- ✅ Every handler + async chain wrapped in `safe()`; errors funnel to the one `[ggraph]` logger
- ✅ `not-found` → silent no-op; selector/DOM mismatch → silent no-op (unit-tested never-throws)
- MANUAL-PENDING Rate-limited with cache ⇒ stale graph + notice; no cache ⇒ exactly one notice, no broken layout

### Issues Found

- None. All new tests passed on first run; the build and lint gates were green
  after formatting. (The pre-existing renderer defect discovered while tracing
  bolt 002's fixtures was fixed and regression-pinned under bolt 002's test
  report; it is not re-listed here.)

### Notes

- The interactive and visual criteria (tooltip rendering, click navigation,
  hover latency, notice placement, multi-page rendering) are MANUAL-PENDING —
  they need a real browser. The pure logic beneath each (hit-test, sha mapping,
  reset formatting, error containment) is fully unit-covered, so the manual pass
  is confirming wiring and pixels, not correctness of the algorithms.
- A single load-unpacked smoke pass now covers all MANUAL-PENDING items across
  bolts 001–003: load `.output/chrome-mv3/`, open a busy repo's commits page
  (rail + aligned nodes), hover (tooltip + highlight), click (navigates),
  page Older (graph follows), and — to see degradation — exhaust the 60 req/hr
  unauthenticated limit or block api.github.com (cached/stale graph + one notice).
