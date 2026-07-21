---
stage: test
bolt: 012-graph-ux
created: '2026-07-21T07:05:00Z'
---

## Test Report: graph-ux (bolt 012)

### Summary

- **Unit tests**: 154/154 passed (147 pre-existing + 7 new)
- **E2E tests**: 5/5 passed (3 pre-existing, 2 new; test 004's assertions
  updated for the redesigned tooltip content)
- **Build/lint/typecheck**: all clean

### Test Files

- [x] `lib/ui/tooltip.test.ts` (new) — unit tests for the two new pure
  helpers: `buildRelationshipBadge` (marker precedence when a row is both a
  merge and a branch point; `mergeSource` dropped for non-merge rows) and
  `formatRelationshipBadge` (all four message shapes: branch-point-only,
  merge with no parseable source, merge with branch+PR, merge with branch
  but no PR, merge that's also a branch point).
- [x] `e2e/extension.spec.ts` (extended) — `003` unchanged (rail renders);
  `004` updated to assert the new badge content (`merge`, `2 parents`, `from
  acme/feature-0`, `PR #100`) instead of the removed message/author text,
  click-navigation assertion unchanged; `005` unchanged (heap budget, still
  passes with the highlight/badge wiring active); new `006` (ordinary-commit
  hover shows no badge, after first proving the badge does render on the
  merge row); new `007` (hovering the GitHub row element directly — not the
  canvas — produces the identical badge content as canvas-hover, and leaving
  the row clears it).
- [x] `e2e/fixtures/gen-commits.ts` (small fixture change) — merge commits'
  own message now uses GitHub's generated PR-merge format
  (`Merge pull request #N from acme/feature-N`) instead of the generic
  `Fixture commit N` text, so the E2E exercises the parsed-branch/PR badge
  path end-to-end, not only the unparseable fallback.

### Acceptance Criteria Validation

**Story 003 — bidirectional-focus-wiring**

- ✅ Hovering a GitHub row with a matching `indexBySha` entry highlights the
  same relationship set as hovering its canvas node — both paths call the
  identical `focus()` function (one source of truth, not two state
  machines); `e2e` test `007` confirms the row-hover path produces the exact
  same badge content as the canvas-hover path in test `004` for the same
  commit.
- ✅ Canvas hover continues to drive the shared focus state with no
  regression — `e2e` test `004` (hover → badge → click → navigate, zero
  page/console errors).
- ✅ Leaving the currently-focused surface clears focus and restores full
  color — `e2e` test `007` (row `mouseleave` → badge hides). Canvas
  `mouseleave` calls the identical `scheduleClear()` function (same code
  path, different event registration) — not re-asserted with a second,
  redundant E2E case; see Notes.
- ✅ A GitHub DOM mismatch degrades to canvas-only focus, no thrown error —
  the row-hover binding loop skips any element with no `indexBySha` match
  (`idx === undefined → continue`), and every row/canvas handler is wrapped
  in the pre-existing `safe()` wrapper; `e2e` tests assert zero
  `[ggraph]`-prefixed console errors and zero unhandled page errors
  throughout.
- ✅ No recompute/redraw when the focused row is unchanged — `focus()`
  only calls `draw()` `if (row !== focusedRow)`, reusing the exact guard
  shape from the pre-existing implementation.

**Story 005 — relationship-badge-tooltip**

- ✅ Ordinary commit hover shows no tooltip, old metadata content fully
  removed (not hidden behind a flag) — `TooltipContent` and its
  message/author/date/sha rendering no longer exist in `lib/ui/tooltip.ts`;
  `e2e` test `006` confirms no badge on an ordinary row.
- ✅ Merge commit hover shows parent count + merge-source branch/PR (when
  parseable) + "merge point" marker — `lib/ui/tooltip.test.ts` (unit) +
  `e2e` test `004`/`007` (integration, parsed branch+PR end-to-end).
- ✅ Non-merge branch-point hover shows child count + "branch point" marker,
  no branch/PR line — `lib/ui/tooltip.test.ts`.
- ✅ A commit that is both a merge and a branch point shows both counts,
  classified primarily as a merge point — `lib/ui/tooltip.test.ts`.
- ✅ An unparseable merge message still shows parent count + marker, no
  broken/empty tooltip — `lib/ui/tooltip.test.ts` (`formatRelationshipBadge`
  with `mergeSource: null`).

### Issues Found

None outstanding. One authoring mistake caught and fixed during this stage:
an initial extra assertion in `e2e` test `006` tried to simulate "leave the
canvas to empty space" by moving the mouse past the canvas's right edge —
that x/y actually lands on the commit row itself, which is a valid hand-off
(not a "leave to nothing"), so the badge correctly stayed visible and the
assertion failed. Removed rather than chasing exact blank-space pixel
coordinates in a minimal fixture page; the equivalent clear-on-leave
behavior is already proven for the row surface in test `007`, and the canvas
`mouseleave` binding is the same `scheduleClear()` call.

### Notes

- **Performance NFR** ("highlight recompute + redraw <50ms per hover"): not
  directly measured with a timing harness in this bolt. `computeRelationshipHighlight`
  and `classifyRow` are bounded linear scans over `layout.edges` (same
  complexity class as the pre-existing `hitTest`/`drawGraph` scans already
  covered by the 500-commit `<100ms` layout/draw budget), and are only
  invoked on an actual focus change, not per mousemove tick. Recommend a
  follow-up perf-trace pass if this ever needs a hard number, but no code
  path here does anything unbounded.
- **MANUAL-PENDING**: actual visual appearance (fade opacity contrast, ring
  highlight, badge placement/readability against GitHub's real light/dark
  themes) has not been eyeballed in a live browser against a real GitHub
  page in this session — only asserted via the DOM/tooltip-text/canvas-
  presence checks above. Recommended before shipping: load the built
  extension on a real repo's commits page and confirm the fade/highlight and
  badge look right in both themes.
