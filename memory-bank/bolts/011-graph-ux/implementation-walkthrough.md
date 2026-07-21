---
stage: implement
bolt: 011-graph-ux
created: '2026-07-21T06:37:34Z'
---

## Implementation Walkthrough: graph-ux

### Summary

Added first-parent edge tagging to the layout core, a new pure module that
computes the relationship highlight set (first-parent chain + merge edges)
and classifies rows as merge/branch-point, a new pure parser for GitHub's
generated merge-commit message format, and fade rendering in `drawGraph` for
everything outside an active highlight. No DOM wiring and no tooltip — those
are bolt 012.

### Structure Overview

Three additive layers, each following an existing pattern in the codebase:
- Layout core (`lib/layout/`): the additive edge field lives where lane
  assignment already happens; the new highlight module sits alongside
  `compute-layout.ts` as a second pure module, consuming a `GraphLayout` the
  same way `compute-layout.test.ts`'s fixtures already model DAGs.
- Data parsing (`lib/github/`): the new merge-message parser follows
  `degrade.ts`'s "pure logic extracted for testability" shape — a single
  function, no throwing, `null` for anything unrecognized.
- Rendering (`lib/draw/`): the highlight set is read inside the two loops
  `drawGraph` already runs (once over edges, once over rows); a faded color
  table is precomputed once per module load, so the hot loop only does a
  membership check per element.

### Completed Work

- [x] `types/graph.ts` - `GraphEdge` gains `isFirstParent: boolean`.
- [x] `lib/layout/compute-layout.ts` - sets `isFirstParent` from the
      existing `p === 0` check in the per-parent loop; no other behavior
      changed.
- [x] `lib/layout/compute-layout.test.ts` - extended the single-merge and
      octopus-merge fixtures with assertions that exactly one outgoing edge
      per row is tagged `isFirstParent`, matching `parents[0]`.
- [x] `lib/layout/relationship.ts` - `classifyRow` (parent/child counts,
      merge/branch-point flags) and `computeRelationshipHighlight`
      (first-parent chain walk in both directions, plus a merge row's extra
      parent edges without continuing the walk past them).
- [x] `lib/layout/relationship.test.ts` - fixtures for a linear chain, a
      merge focused on itself, a branch point fan-out, a first-parent chain
      crossing a merge (proving the walk does not wander into the merge's
      extra parent's own ancestry), and a dangling-edge focused row.
- [x] `lib/github/merge-message.ts` - `parseMergeSource`, recognizing the PR
      merge format and the plain local-branch merge format; returns `null`
      for anything else without throwing.
- [x] `lib/github/merge-message.test.ts` - PR merge, nested-slash branch
      name, local branch merge, non-merge message, empty string, trailing
      text after the first line, and a leading-zero PR number.
- [x] `lib/draw/draw.ts` - `DrawOptions` gains an optional `highlight`;
      a faded lane-color table is derived once at module load; the existing
      single edge loop and single row loop each select the full or faded
      palette per element based on highlight membership. The focused-node
      ring is unchanged.

### Key Decisions

- **`RelationshipHighlight` shape (`rows: Set<number>`, `edges:
  Set<GraphEdge>`)**: rows are tracked by index (there's no reason to hold a
  row object), edges by direct object reference into the same `GraphLayout`
  the caller already has — this lets `drawGraph` do a plain `.has()` check
  inside its existing loops without adding an index-tracking pass.
- **`MergeSource` shape follows story 004 / requirements.md FR-5 exactly**:
  `{ branch: string, prNumber: number | null }`, where `branch` is the full
  `owner/branch` string for PR merges (not split into separate owner/branch
  fields) — this matches the authoritative story and FR text, which differs
  slightly from the bolt dispatch's paraphrase.
- **Highlight walk keeps a `visited` set separate from the `rows` highlight
  set**: a merge's extra (non-first-parent) parent's endpoint row is added
  to `rows` for rendering but deliberately not marked `visited` — so if that
  same row is independently reached later as a legitimate chain/fan-out
  member, it still gets fully walked. Without this, a row that happened to
  be both "a merge's dead-end extra parent" and "a real branch-point child"
  could get stuck half-processed.
- **Fade uses precomputed `rgba(...)` strings, not `ctx.globalAlpha`**: this
  avoids any canvas state save/restore bookkeeping and keeps the loop body
  identical in shape to before — a config-only palette swap.
- **No new draw.ts test file**: `drawGraph` only touches
  `HTMLCanvasElement`/`CanvasRenderingContext2D`, which this repo has no test
  harness for. Pure pieces (the highlight-membership predicates) are
  exercised indirectly through `relationship.test.ts`'s coverage of the
  `RelationshipHighlight` shape drawGraph consumes; pixel-level fade
  verification is manual/deferred to bolt 012's end-to-end wiring.

### Deviations from Plan

None. Implementation matches `implementation-plan.md`.

### Dependencies Added

None.

### Developer Notes

- `computeRelationshipHighlight` and `classifyRow` both do plain linear
  scans over `layout.edges` per call/per visited row — consistent with the
  existing `hit-test.ts`/`draw.ts` precedent that this is fine at the
  ~200-commit default depth. Marked with a `ponytail:` comment in
  `relationship.ts` noting where to add indexing if `commitDepth` ever grows
  much larger.
- `drawGraph`'s no-highlight path is a strict "always highlighted" fallback
  (`highlight === undefined || ...`), so passing no `highlight` field at all
  (as `entrypoints/commits.content.ts` still does today) renders byte-
  identical output to before this bolt — that file was intentionally left
  untouched since wiring a real highlight in is bolt 012's job.
