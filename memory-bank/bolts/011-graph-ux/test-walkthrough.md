---
stage: test
bolt: 011-graph-ux
created: '2026-07-21T06:37:34Z'
---

## Test Report: graph-ux

### Summary

- **Tests**: 147/147 passed (130 pre-existing + 17 new: 10 in
  `relationship.test.ts`, 7 in `merge-message.test.ts`;
  `compute-layout.test.ts` gained assertions inside existing tests rather
  than new `it` blocks, so its count is unchanged).
- **Build**: `pnpm build` succeeds (686ms, 38.9 kB total output).
- **Lint**: `pnpm lint` (Biome) clean, 0 findings.
- **Typecheck**: `pnpm typecheck` (`tsc --noEmit`) clean, 0 errors.

### Test Files

- [x] `lib/layout/compute-layout.test.ts` - extended (not new): asserts
      exactly one outgoing edge per row is `isFirstParent`, matching
      `parents[0]`, in both the single-merge and octopus-merge fixtures; all
      pre-existing assertions in this file are untouched and still pass.
- [x] `lib/layout/relationship.test.ts` - new. `classifyRow`: normal row
      (neither), 2-parent row (`isMerge`, no children), 2-child row
      (`isBranchPoint`, no merge), and a row that is both simultaneously.
      `computeRelationshipHighlight`: linear chain (full highlight both
      directions), clean termination focused at root/head, a merge focused
      on itself (both parent edges included, walk does not continue into
      the extra parent's own history), a branch point (union of both
      children's lines, not just one), a first-parent chain crossing a
      merge partway down (proves the merge's extra parent's row lights up
      but its own ancestor does not), and a dangling first-parent edge
      (walk stops, no throw).
- [x] `lib/github/merge-message.test.ts` - new. Exact GitHub PR-merge
      format, a branch name containing extra `/`, a plain local
      `Merge branch 'foo'`, a non-merge message (`null`), an empty string
      (`null`, no throw), trailing text after the recognized line ignored,
      and a leading-zero PR number parsed as a plain integer.

### Acceptance Criteria Validation

**001-relationship-reachability**
- ✅ Every `GraphEdge` carries `isFirstParent`, true for exactly the
  `parents[0]` edge per row - `compute-layout.test.ts` assertions.
- ✅ No-merge focused chain highlights every row/edge in both directions -
  `relationship.test.ts` "linear history" test.
- ✅ A merge on the chain has both parent edges included even though only
  one is `isFirstParent` - "merge that is itself the focused row" test.
- ✅ A branch point's fan-out includes every child's line (union) -
  "branch point" test.
- ✅ Root/head focus terminates without error or infinite loop -
  "stops cleanly" test; dangling-edge test covers the depth-window boundary
  from the story's edge-case table.
- ✅ `classifyRow`: `isMerge` for `parentCount > 1`, `isBranchPoint` for
  `childCount > 1`, independently and simultaneously - all four
  `classifyRow` tests.

**002-fade-highlight-render**
- ✅ No active focus renders unchanged - by construction: `isEdgeHighlighted`/
  `isRowHighlighted` both short-circuit to `true` when `options.highlight`
  is `undefined`, so the color lookup resolves to the exact same
  `LANE_COLORS` value as before this bolt (no new branch is reachable
  without a `highlight` being passed, and nothing in this bolt starts
  passing one). MANUAL-PENDING: pixel-level confirmation — no canvas test
  harness in this repo; covered by bolt 012's E2E once wiring passes a real
  highlight through `entrypoints/commits.content.ts`.
- ✅ Active focus renders highlighted rows/edges at full color, everything
  else faded - code path exists and is type-checked; the highlight
  membership predicates it reads (`RelationshipHighlight.rows`/`.edges`)
  are exhaustively covered by `relationship.test.ts`. MANUAL-PENDING:
  pixel-level rendering, same reason as above.
- ✅ Focused-node ring (`highlightRow`) still renders - code path untouched,
  only the `color` variable it reads now comes from a palette selection
  instead of being hardcoded to `colors`.
- ✅ No second full-graph pass, no per-frame allocation growth - verified by
  inspection: the same single edge loop and single row loop from before
  this bolt, with one added ternary each; `FADED_LANE_COLORS` is computed
  once at module load, not per draw call.

**004-merge-branch-parsing**
- ✅ `"Merge pull request #79 from juhyeonni/dev"` → `{ branch:
  "juhyeonni/dev", prNumber: 79 }` - exact test.
- ✅ Nested-slash branch name preserved in full - `someorg/feature/nested-
  thing` test.
- ✅ `"Merge branch 'foo'"` → `{ branch: "foo", prNumber: null }` - exact
  test.
- ✅ Non-matching / empty input → `null`, never throws - both covered.

### Issues Found

None. All existing 130 tests remained green throughout (no regression to
`compute-layout.test.ts`'s pre-existing assertions from the additive
`isFirstParent` field).

### Notes

- `pnpm test:e2e` was intentionally not run per the bolt's scope (no DOM
  wiring in this bolt, so there's nothing new for Playwright to exercise
  yet); the existing E2E suite was not touched and should be unaffected.
- The one deliberate MANUAL-PENDING item — pixel-level fade rendering — is
  expected to close out visually once bolt 012 wires a live
  `RelationshipHighlight` through `entrypoints/commits.content.ts` and its
  E2E suite can drive real hover interactions against it.
