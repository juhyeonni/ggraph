---
id: 012-graph-ux
unit: 001-graph-ux
intent: 004-graph-ux
type: simple-construction-bolt
status: complete
stories:
  - 003-bidirectional-focus-wiring
  - 005-relationship-badge-tooltip
created: '2026-07-21T07:40:00Z'
started: '2026-07-21T06:40:00Z'
completed: '2026-07-21T06:59:03Z'
current_stage: null
stages_completed: []
requires_bolts:
  - 011-graph-ux
enables_bolts: []
requires_units: []
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

## Bolt: 012-graph-ux

### Objective

Wiring + tooltip (relationship highlight, GitHub Issue #6): wire canvas-node
hover AND GitHub's own commit-row hover to the same shared focus state
driving bolt 011's highlight/fade, and redesign the tooltip to show a
minimal relationship badge only on merge/branch-point commits, fully
removing the old metadata tooltip.

### Stories Included

- [ ] **003-bidirectional-focus-wiring**: Canvas + GitHub row hover drive the same highlight - Priority: Must
- [ ] **005-relationship-badge-tooltip**: Relationship-badge tooltip replaces metadata tooltip - Priority: Must

### Expected Outputs

- `entrypoints/commits.content.ts`: shared focus state fed by both canvas
  `hitTest` and new row-hover listeners on `rowEls`, wrapped in the existing
  `safe()` silent-failure pattern
- `lib/ui/tooltip.ts`: `RelationshipBadge` content shape replacing
  `TooltipContent`; old message/author/date/sha rendering removed
- Verification that hovering a GitHub row highlights the graph rail exactly
  as hovering its canvas node would

### Dependencies

#### Bolt Dependencies (within intent)

- **011-graph-ux** (Required): Planned

#### Unit Dependencies (cross-unit)

- None (reuses 011-graph-ux's cross-unit dependency on 001-graph-ui)

#### Enables (other bolts waiting on this)

- None (intent complete after this bolt)
