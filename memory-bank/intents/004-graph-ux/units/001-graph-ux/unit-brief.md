---
unit: 001-graph-ux
intent: 004-graph-ux
unit_type: frontend
default_bolt_type: simple-construction-bolt
phase: inception
status: complete
created: '2026-07-21T07:20:00Z'
updated: '2026-07-21T07:35:00Z'
---

# Unit Brief: graph-ux

## Purpose

Replace the current graph tooltip's redundant metadata (message/author/date/
sha — already visible in GitHub's own commit row) with relationship-focused
interaction: hovering/focusing any commit highlights its first-parent chain
and merge edges while fading everything else, and only structurally
interesting commits (merge points, branch points) get a minimal relationship
badge tooltip.

## Scope

### In Scope
- Tagging first-parent edges in the pure layout core
- Pure reachable-set computation (first-parent chain up/down + merge edges)
  for a focused row
- Pure row classification (merge / branch-point) shared by highlighting and
  tooltip logic
- Fade/de-emphasis rendering in `lib/draw/draw.ts`
- Bidirectional focus wiring: canvas node hover AND GitHub's own commit-row
  hover drive the same highlight
- Pure merge-source-branch + PR# parsing from merge commit messages
- Relationship-badge tooltip (parent/child count, merge source + PR,
  branch/merge-point marker) replacing the old metadata tooltip

### Out of Scope
- Ref decoration badges (branch/tag heads) — separate future effort per the
  decided design
- On-canvas text rendering of the branch/PR label (tooltip-only, see
  requirements.md Open Questions)
- Any change to data fetching, caching, or auth (intents 001/002 untouched)
- Any change to layout's lane/row assignment algorithm itself (only an
  additive edge field)

---

## Assigned Requirements

| FR | Requirement | Priority |
|----|-------------|----------|
| FR-1 | First-parent edge tagging (layout core) | Must |
| FR-2 | Relationship reachable-set computation (pure) | Must |
| FR-3 | Merge/branch-point row classification (pure) | Must |
| FR-4 | Fade/de-emphasis rendering | Must |
| FR-5 | Merge-source-branch + PR parsing (pure) | Must |
| FR-6 | Bidirectional focus wiring | Must |
| FR-7 | Relationship-badge tooltip (replaces metadata tooltip) | Must |

---

## Domain Concepts

### Key Entities
| Entity | Description | Attributes |
|--------|-------------|------------|
| RelationshipHighlight | The row/edge set to render at full color for a given focus | rows (row indices), edges (edge refs) |
| RowClassification | Structural role of one row | parentCount, childCount, isMerge, isBranchPoint |
| MergeSource | Parsed merge-commit provenance | branch, prNumber (nullable) |
| RelationshipBadge | Tooltip content shown only on interesting rows | parentCount, childCount, mergeSource (optional), marker ("merge-point" \| "branch-point") |

### Key Operations
| Operation | Description | Inputs | Outputs |
|-----------|-------------|--------|---------|
| computeRelationshipHighlight | Walk first-parent chain up/down + collect merge edges | GraphLayout, focusedRow | RelationshipHighlight |
| classifyRow | Parent/child counts → merge/branch-point flags | GraphLayout, row | RowClassification |
| parseMergeSource | Extract branch + PR# from a merge commit message | message | MergeSource \| null |
| drawGraph (extended) | Draw with highlight-aware fade | canvas, layout, rowCenters, options (+ highlight set) | canvas painted |
| render (extended) | Wire GitHub row elements to the shared focus state | rowEls, indexBySha, focus setter | event listeners attached |
| tooltip (redesigned) | Show badge only for interesting rows | RowClassification, MergeSource? | tooltip shown/hidden |

---

## Story Summary

| Metric | Count |
|--------|-------|
| Total Stories | 5 |
| Must Have | 5 |
| Should Have | 0 |
| Could Have | 0 |

### Stories

| Story ID | Title | Priority | Status |
|----------|-------|----------|--------|
| 001-relationship-reachability | First-parent + merge reachable-set computation (pure) | Must | Planned |
| 002-fade-highlight-render | Fade/highlight rendering in draw.ts | Must | Planned |
| 003-bidirectional-focus-wiring | Canvas + GitHub row hover drive the same highlight | Must | Planned |
| 004-merge-branch-parsing | Merge-source-branch + PR# parsing (pure) | Must | Planned |
| 005-relationship-badge-tooltip | Relationship-badge tooltip replaces metadata tooltip | Must | Planned |

---

## Dependencies

### Depends On
| Unit | Reason |
|------|--------|
| 001-graph-ui (intent 001) | Extends `lib/layout/compute-layout.ts`, `lib/draw/draw.ts`, `lib/draw/hit-test.ts`, `entrypoints/commits.content.ts`, `lib/ui/tooltip.ts`, `lib/github/selectors.ts`; intent 001 must be complete (it is) |

### Depended By
| Unit | Reason |
|------|--------|
| — | None yet |

### External Dependencies
| System | Purpose | Risk |
|--------|---------|------|
| GitHub commits page DOM (`lib/github/selectors.ts` row elements) | Row-hover as a second focus source | Medium — relies on GitHub's current row markup; already defensive (`findCommitRowEls` returns `[]` on mismatch, silent by contract) |

---

## Technical Context

### Suggested Technology
Per `standards/tech-stack.md`: pure TypeScript, no new dependency. New pure
modules (`lib/layout/relationship.ts`, `lib/github/merge-message.ts`) follow
the same pattern as `lib/github/degrade.ts` — pure branch logic extracted
from DOM/canvas wiring so it's directly unit-testable, at the same rigor as
`lib/layout/compute-layout.ts`'s existing tests.

**Resolved technical questions** (see requirements.md Open Questions for
full defaults):
- Branch-point fan-out when walking upward: highlight the union of every
  first-parent child's line (inclusive default).
- Branch/PR label renders in the tooltip badge only — no new canvas
  text-rendering path.
- Hand-off between the two hover sources (row ↔ canvas) is treated as a
  same-frame hand-off, not a clear-then-flash.

### Integration Points
| Integration | Type | Protocol |
|-------------|------|----------|
| `lib/layout/compute-layout.ts` → `types/graph.ts` | Internal | `GraphEdge.isFirstParent` field |
| `entrypoints/commits.content.ts` → `lib/draw/draw.ts` | Internal | `DrawOptions` gains a highlight set |
| `entrypoints/commits.content.ts` → `lib/github/selectors.ts` | Internal | Reuses already-collected `rowEls` for a second hover source |
| `entrypoints/commits.content.ts` → `lib/ui/tooltip.ts` | Internal | New `RelationshipBadge` content shape; old `TooltipContent` shape removed |

### Data Storage
| Data | Type | Volume | Retention |
|------|------|--------|-----------|
| — | — | — | No new persisted data; this unit is rendering/interaction only |

---

## Constraints

- `lib/layout/` must remain pure — no DOM, network, or `chrome.*` in
  `relationship.ts`.
- No new host permissions, no new network calls.
- Must not regress intent 001's <100ms/500-commit layout+draw budget or
  intent 002's authenticated fetch path.
- Ref decoration badges (branch/tag heads) explicitly out of scope.

---

## Success Criteria

### Functional
- [ ] Focusing a canvas node OR hovering a GitHub commit row highlights the
      same first-parent + merge-edge set and fades the rest
- [ ] Leaving focus restores full color
- [ ] Merge commits show both parent lines highlighted; the merged-in
      line's branch/PR is parseable when GitHub-generated
- [ ] Ordinary commits show no tooltip; merge/branch-point commits show the
      relationship badge only

### Non-Functional
- [ ] Highlight recompute + redraw stays under the existing per-hover
      budget (recompute only on row change)
- [ ] `lib/layout/relationship.ts` has zero DOM/network/`chrome.*` imports
- [ ] No regression to intent 001/002 performance budgets

### Quality
- [ ] Reachable-set, row classification, and merge-message parsing are
      unit-tested (mocked-DAG fixtures, mirroring `compute-layout.test.ts`)
- [ ] All acceptance criteria met
- [ ] Biome + tsc clean

---

## Bolt Suggestions

| Bolt | Type | Stories | Objective |
|------|------|---------|-----------|
| 011-graph-ux | simple | 001, 002, 004 | Pure core + render: reachable-set, row classification, merge-branch parsing, fade rendering |
| 012-graph-ux | simple | 003, 005 | Wiring + tooltip: bidirectional focus wiring, relationship-badge tooltip |

---

## Notes

Biggest risks are the upward fan-out semantics at branch points and the
row-hover DOM binding's fragility against GitHub markup changes — both
mitigated with documented defaults (requirements.md Open Questions) and the
existing silent-failure contract (`findCommitRowEls`, `safe()`).
