---
id: 011-graph-ux
unit: 001-graph-ux
intent: 004-graph-ux
type: simple-construction-bolt
status: complete
stories:
  - 001-relationship-reachability
  - 002-fade-highlight-render
  - 004-merge-branch-parsing
created: '2026-07-21T07:40:00Z'
started: '2026-07-21T06:26:00Z'
completed: '2026-07-21T06:39:58Z'
current_stage: null
stages_completed: []
requires_bolts:
  - 003-graph-ui
enables_bolts:
  - 012-graph-ux
requires_units:
  - 001-graph-ui
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 1
---

## Bolt: 011-graph-ux

### Objective

Pure core + render (relationship highlight, GitHub Issue #6): compute the
first-parent + merge reachable set for a focused commit, classify rows as
merge/branch points, parse GitHub's merge-source branch/PR from commit
messages, and extend `drawGraph` to fade everything outside the highlighted
set.

### Stories Included

- [ ] **001-relationship-reachability**: First-parent + merge reachable-set computation (pure) - Priority: Must
- [ ] **002-fade-highlight-render**: Fade/highlight rendering in draw.ts - Priority: Must
- [ ] **004-merge-branch-parsing**: Merge-source-branch + PR# parsing (pure) - Priority: Must

### Expected Outputs

- `types/graph.ts` / `lib/layout/compute-layout.ts`: `GraphEdge.isFirstParent`
- New `lib/layout/relationship.ts`: `computeRelationshipHighlight`,
  `classifyRow`, unit-tested like `compute-layout.test.ts`
- New `lib/github/merge-message.ts`: `parseMergeSource`, unit-tested
- `lib/draw/draw.ts`: fade rendering, regression-safe when no focus is active

### Dependencies

#### Bolt Dependencies (within intent)

- None (first bolt of this intent)

#### Unit Dependencies (cross-unit)

- **001-graph-ui** (Required, intent 001): Completed — this bolt extends
  its layout/draw modules; intent 001 is fully complete so this dependency
  is already satisfied

#### Enables (other bolts waiting on this)

- 012-graph-ux
