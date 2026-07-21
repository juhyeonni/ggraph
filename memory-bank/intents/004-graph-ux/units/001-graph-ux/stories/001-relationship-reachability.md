---
id: 001-relationship-reachability
unit: 001-graph-ux
intent: 004-graph-ux
status: complete
priority: must
created: '2026-07-21T07:25:00Z'
assigned_bolt: 011-graph-ux
implemented: true
---

# Story: 001-relationship-reachability

## User Story

**As a** developer viewing a commit graph
**I want** focusing any commit to compute exactly which commits/edges are structurally related to it
**So that** the extension knows what to highlight before it draws anything

## Acceptance Criteria

- [ ] **Given** a `GraphLayout` from `computeLayout`, **When** inspected, **Then** every `GraphEdge` carries `isFirstParent: boolean`, true for exactly one outgoing edge per row (the `parents[0]` edge) and false for the rest
- [ ] **Given** a focused row with no merges in its ancestry, **When** `computeRelationshipHighlight` runs, **Then** the result includes every row/edge along the unbroken first-parent chain in both directions (toward ancestors and toward descendants)
- [ ] **Given** a focused row whose chain passes through a merge commit, **When** computed, **Then** both of that merge commit's parent edges are included in the result, even though only one is `isFirstParent`
- [ ] **Given** a focused row whose chain passes through a branch point (more than one child shares this row as their first parent), **When** computed, **Then** every one of those children's first-parent lines is included (union, not just one arbitrarily chosen line)
- [ ] **Given** the focused row is the root (no parents) or the head (no children), **When** computed, **Then** the walk in that direction simply stops — no error, no infinite loop
- [ ] **Given** the row/edge classification helper, **When** run on a row with 2 parents, **Then** `isMerge: true`; **when** run on a row referenced as a parent by 2 different rows, **Then** `isBranchPoint: true`

## Technical Notes

- New pure module, e.g. `lib/layout/relationship.ts`, alongside
  `lib/layout/compute-layout.ts` — no DOM/network/`chrome.*` imports (keeps
  `lib/layout/` pure per coding-standards.md).
- `isFirstParent` is set in `compute-layout.ts`'s existing per-parent loop
  (`p === 0` is already computed there — just needs to be stored on the
  edge object).
- Row classification (`isMerge`/`isBranchPoint`) is a small pure counting
  function over `layout.edges`, shared by this story's highlight algorithm
  and story 005's tooltip decision — define it once here so both consume
  the same source of truth.
- See requirements.md Open Questions for the resolved default on
  branch-point fan-out direction.

## Dependencies

### Requires
- None (first story in this unit)

### Enables
- 002-fade-highlight-render (consumes the highlight set to know what to fade)
- 005-relationship-badge-tooltip (consumes row classification)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Focused row has a parent SHA not present in the fetched depth window (dangling edge, `toRow: null`) | Ancestor walk in that direction stops at the dangling edge; no crash |
| A merge commit's own row is the focused row | Its own edges (all parents) are included directly, no need to "walk into" itself first |
| Duplicate/malformed input | Not this module's concern — operates on the already-deduped `GraphLayout` (dedup already happens in `computeLayout`) |

## Out of Scope

- Rendering the highlight (002), wiring it to hover events (003), the tooltip itself (005)
