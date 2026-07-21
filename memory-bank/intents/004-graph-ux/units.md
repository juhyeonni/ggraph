---
intent: 004-graph-ux
phase: inception
status: units-decomposed
updated: 2026-07-21T07:20:00Z
---

# Graph Relationship Highlight & Tooltips - Unit Decomposition

## Units Overview

This intent decomposes into 1 unit of work:

### Unit 1: 001-graph-ux

**Description**: Adds relationship-aware highlighting and a tooltip redesign
to the existing graph rendering pipeline — first-parent/merge reachable-set
computation, merge/branch-point row classification, fade rendering,
bidirectional hover wiring, merge-branch message parsing, and the
relationship-badge tooltip. Single frontend unit (`frontend-app` project
type, feature-based decomposition), consistent with intents 001/002's
single-unit shape — this is one cohesive rendering/interaction feature with
a single owner surface (the canvas rail + its tooltip).

**Requirement-to-Unit Mapping** (all FRs → this unit):

- FR-1 First-parent edge tagging (layout core) → `001-graph-ux`
- FR-2 Relationship reachable-set computation (pure) → `001-graph-ux`
- FR-3 Merge/branch-point row classification (pure) → `001-graph-ux`
- FR-4 Fade/de-emphasis rendering → `001-graph-ux`
- FR-5 Merge-source-branch + PR parsing (pure) → `001-graph-ux`
- FR-6 Bidirectional focus wiring → `001-graph-ux`
- FR-7 Relationship-badge tooltip (replaces metadata tooltip) → `001-graph-ux`

**Stories**: 5 (see unit brief)

**Deliverables**:

- Extended `lib/layout/compute-layout.ts` + `types/graph.ts`
  (`GraphEdge.isFirstParent`)
- New pure module `lib/layout/relationship.ts` (reachable-set computation +
  row classification)
- New pure module `lib/github/merge-message.ts` (merge-source branch/PR
  parsing)
- Extended `lib/draw/draw.ts` (fade/de-emphasis rendering)
- Extended `entrypoints/commits.content.ts` (bidirectional hover wiring)
- Redesigned `lib/ui/tooltip.ts` (relationship badge; old metadata content
  removed)

**Dependencies**:

- Depends on: `001-graph-ui` (intent 001) — extends its layout/draw/
  content-script/tooltip/selectors surface; intent 001 must be complete
  (it is)
- Depended by: none yet

**Estimated Complexity**: M

## Unit Dependency Graph

```text
[001-graph-ui] (intent 001, complete) ──► [001-graph-ux] (this intent)
```

## Execution Order

1. `001-graph-ux`, bolt `011-graph-ux` — pure core + render: reachable-set
   computation, row classification, merge-branch parsing, fade rendering
2. `001-graph-ux`, bolt `012-graph-ux` — wiring + tooltip: bidirectional
   hover wiring, relationship-badge tooltip

Both bolts are sequential — bolt `012-graph-ux` wires bolt `011-graph-ux`'s
pure output into the DOM/tooltip, so it cannot start first. Not
parallelizable within this intent.
