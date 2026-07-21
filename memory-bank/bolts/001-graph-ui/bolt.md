---
id: 001-graph-ui
unit: 001-graph-ui
intent: 001-commit-graph-on-commits-page
type: simple-construction-bolt
status: planned
stories:
  - 001-extension-scaffold
  - 002-commits-page-detection
created: 2026-07-21T01:50:00Z
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts: []
enables_bolts: [002-graph-ui]
requires_units: []
blocks: false

complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 2
---

## Bolt: 001-graph-ui

### Objective

Walking skeleton (milestone **v0.1.0**): prove the full toolchain and page
lifecycle — WXT + TS + Preact scaffold, commits-page detection with SPA-safe
attach/detach, and a dummy DAG drawn through the real pipeline shape
(layout module → canvas draw).

### Stories Included

- [ ] **001-extension-scaffold**: Extension scaffold & dummy pipeline - Priority: Must
- [ ] **002-commits-page-detection**: Commits page detection & SPA lifecycle - Priority: Must

### Expected Outputs

- Loadable unpacked MV3 extension (pnpm dev/build, Biome, Vitest, bench wiring)
- Dummy graph rail visible on real commits pages; selectors isolated in one module

### Dependencies

#### Bolt Dependencies (within intent)

- None (first bolt)

#### Unit Dependencies (cross-unit)

- None

#### Enables (other bolts waiting on this)

- 002-graph-ui
