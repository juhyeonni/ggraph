---
stage: plan
bolt: 011-graph-ux
created: '2026-07-21T06:33:44Z'
---

## Implementation Plan: graph-ux

### Objective

Pure core + render for relationship highlighting (GitHub Issue #6, stories
001/002/004 of unit 001-graph-ux): tag first-parent edges in the layout core,
compute the first-parent-chain + merge-edge reachable set for a focused row,
classify rows as merge/branch-point, parse GitHub's generated merge-commit
message format, and fade everything outside the highlighted set in
`drawGraph`. No DOM wiring and no tooltip — that is bolt 012.

### Deliverables

- `types/graph.ts` — additive `isFirstParent: boolean` on `GraphEdge`.
- `lib/layout/compute-layout.ts` — set `isFirstParent` from the existing
  `p === 0` check already computed in the per-parent loop.
- `lib/layout/compute-layout.test.ts` — extend the merge and octopus-merge
  fixtures with `isFirstParent` assertions; all existing assertions stay
  green (purely additive field, no lane/row behavior change).
- New `lib/layout/relationship.ts` — `classifyRow(layout, row)` and
  `computeRelationshipHighlight(layout, focusedRow)`, pure, no DOM/network.
- New `lib/layout/relationship.test.ts` — DAG fixtures: linear chain, single
  merge, branch point (diamond), first-parent chain crossing a merge.
- New `lib/github/merge-message.ts` — `parseMergeSource(message)`, pure,
  mirrors `lib/github/degrade.ts`'s "pure logic extracted for testability"
  pattern.
- New `lib/github/merge-message.test.ts` — PR-merge, nested-branch PR-merge,
  local branch merge, non-merge message, empty string.
- `lib/draw/draw.ts` — `DrawOptions` gains an optional `highlight?:
  RelationshipHighlight`; a faded color table derived once from
  `LANE_COLORS` at module load (not per-draw-call string parsing); the
  existing single edge loop and single row loop each pick full vs. faded
  palette per element, no second pass added.

### Dependencies

- None beyond what's already in the repo (intent 001's `types/graph.ts`,
  `lib/layout/compute-layout.ts`, `lib/draw/draw.ts`, and the
  `lib/github/degrade.ts` pattern to mirror). No new package.

### Technical Approach

**`GraphEdge.isFirstParent`**: the per-parent loop in `computeLayout` already
computes `p === 0` to decide lane reuse vs. `findOrAllocLane`; store that same
boolean on the edge object being constructed. Purely additive — no change to
lane assignment, dedup, or dangling-edge handling.

**`lib/layout/relationship.ts` API**:
- `RowClassification = { parentCount, childCount, isMerge, isBranchPoint }`.
  `classifyRow(layout, row)` counts edges by `fromRow`/`toRow` in a single
  linear scan (mirrors the existing "linear scan is fine at this depth"
  precedent in `hit-test.ts`/`draw.ts`); `isMerge = parentCount > 1`,
  `isBranchPoint = childCount > 1`. Shared source of truth for both this
  story's highlight walk and story 005's tooltip decision.
- `RelationshipHighlight = { rows: ReadonlySet<number>, edges:
  ReadonlySet<GraphEdge> }` — rows by index, edges by object reference (both
  sourced from the same `GraphLayout` the caller passes in, so reference
  equality is safe and `drawGraph` can test membership with `.has()` inside
  its existing loops without an extra indexing pass).
- `computeRelationshipHighlight(layout, focusedRow)`:
  1. A `visit(row)` helper adds the row to the highlight set; the first time
     a row is visited it is also checked with `classifyRow` — if `isMerge`,
     every one of its outgoing edges is added to the highlight-edge set, and
     the *non-first-parent* edges' endpoints are added to the highlight-row
     set directly (covers "a merge commit's own row is focused → its edges
     are included directly" and "chain passes through a merge → both parent
     edges included, without continuing the walk past the extra one").
  2. Downward walk (toward ancestors): follow the single `isFirstParent`
     outgoing edge row-by-row until none remains or `toRow` is `null`
     (dangling stops cleanly).
  3. Upward walk (toward descendants): BFS over incoming `isFirstParent`
     edges; a row with more than one such incoming edge naturally fans out
     to every one of those children (branch-point union), each continuing
     its own upward search.
  4. A `visited` set (separate from the highlight-row set) gates re-walking,
     so a row only-shallowly-marked as a merge's extra endpoint can still be
     fully walked later if it's independently reached as a real chain
     member — avoids under-counting branch fan-out beyond a merge's extra
     parent.

**`lib/github/merge-message.ts`**: two regexes against the message's first
line only (defensive against any trailing text) —
`/^Merge pull request #(\d+) from (.+)$/` → `{ branch, prNumber }` (branch
capture is greedy to end-of-line, so nested `/`-containing branch names
survive intact), and `/^Merge branch '([^']+)'/` → `{ branch, prNumber:
null }`. Anything else (or empty input) returns `null`; the function never
throws.

**`lib/draw/draw.ts` fade**: `FADED_LANE_COLORS` is computed once at module
load by converting each `LANE_COLORS` hex string to an `rgba(...)` string at
a fixed reduced alpha — no per-frame allocation or string parsing. Inside the
existing edge loop and row loop, `const isHighlighted = options.highlight ===
undefined || options.highlight.<rows|edges>.has(...)` picks the palette; when
`options.highlight` is `undefined` this is always `true`, so the color lookup
resolves to the exact same `LANE_COLORS` value as today — byte-identical
output for the no-focus path. The existing `highlightRow` ring is untouched
(same code path, now just reading `color` from whichever palette was
selected for that node).

### Acceptance Criteria

- [ ] Every `GraphEdge` carries `isFirstParent`, true for exactly the
      `parents[0]` edge of each row, false for the rest (001).
- [ ] A linear focused chain (no merges) highlights every row/edge in both
      directions; walk stops cleanly at root/head with no error (001).
- [ ] A merge commit on the chain has both parent edges highlighted even
      though only one is `isFirstParent`, without the walk continuing past
      the extra parent's endpoint (001).
- [ ] A branch point's fan-out highlights the union of every first-parent
      child's line, not just one (001).
- [ ] `classifyRow` reports `isMerge` for `parentCount > 1` and
      `isBranchPoint` for `childCount > 1`, independently (001).
- [ ] No active focus → `drawGraph` output is unchanged from today (002).
- [ ] Active focus → highlighted rows/edges render at full lane color,
      everything else at reduced alpha; the focused-node ring still renders
      (002).
- [ ] No second full-graph pass added; no per-frame allocation growth (002).
- [ ] `"Merge pull request #79 from juhyeonni/dev"` → `{ branch:
      "juhyeonni/dev", prNumber: 79 }`; nested-slash branch names survive
      intact (004).
- [ ] `"Merge branch 'foo'"` → `{ branch: "foo", prNumber: null }` (004).
- [ ] Any non-matching message (including empty string) → `null`, never
      throws (004).
- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` clean; all existing tests
      plus new tests green.
