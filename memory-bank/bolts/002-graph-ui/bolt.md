---
id: 002-graph-ui
unit: 001-graph-ui
intent: 001-commit-graph-on-commits-page
type: simple-construction-bolt
status: planned
stories:
  - 003-fetch-commits
  - 004-response-cache
  - 005-layout-core
  - 006-canvas-render
created: 2026-07-21T01:50:00Z
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts: [001-graph-ui]
enables_bolts: [003-graph-ui]
requires_units: []
blocks: true

complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

## Bolt: 002-graph-ui

### Objective

Real data, real layout (milestone **v0.2.0**): fetch commits with parents from
the REST API, cache in chrome.storage, compute the DAG layout in the pure
`lib/layout/` core (fixture-verified against `git log --graph`), and render the
real graph aligned to GitHub's commit rows.

### Stories Included

- [ ] **003-fetch-commits**: Fetch commits via REST - Priority: Must
- [ ] **004-response-cache**: Response cache in chrome.storage - Priority: Must
- [ ] **005-layout-core**: Pure layout core - Priority: Must
- [ ] **006-canvas-render**: Canvas rail rendering - Priority: Must

### Expected Outputs

- `lib/github/` fetch + cache modules (typed, tested)
- `lib/layout/` pure core with fixture tests + benchmark wired to real module
- `lib/draw/` renderer: aligned, HiDPI-crisp, theme-aware static graph

### Dependencies

#### Bolt Dependencies (within intent)

- **001-graph-ui** (Required): Planned

#### Unit Dependencies (cross-unit)

- None

#### Enables (other bolts waiting on this)

- 003-graph-ui
