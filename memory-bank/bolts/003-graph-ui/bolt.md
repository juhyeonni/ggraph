---
id: 003-graph-ui
unit: 001-graph-ui
intent: 001-commit-graph-on-commits-page
type: simple-construction-bolt
status: complete
stories:
  - 007-hover-click
  - 008-load-more
  - 009-soft-degradation
created: '2026-07-21T01:50:00Z'
started: '2026-07-21T02:52:00Z'
completed: '2026-07-21T03:03:09Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-07-21T02:56:01Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-07-21T03:05:00Z'
    artifact: implementation-walkthrough.md
requires_bolts:
  - 002-graph-ui
enables_bolts: []
requires_units: []
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 3
  testing_scope: 2
---

## Bolt: 003-graph-ui

### Objective

Interactivity & hardening (milestone **v0.3.0**): hit-testing with hover
tooltip and click-to-commit, incremental load-more, and soft degradation on
every failure path (rate limit, API errors, DOM changes).

### Stories Included

- [ ] **007-hover-click**: Hover tooltip & click navigation - Priority: Must
- [ ] **008-load-more**: Incremental load-more - Priority: Should
- [ ] **009-soft-degradation**: Rate-limit & failure degradation - Priority: Must

### Expected Outputs

- Hit-testing (pure, unit-tested) + tooltip + navigation
- Cache-aware load-more with downward-only growth
- Error-boundary wrapper on all entry points; inline notices; host page never breaks

### Dependencies

#### Bolt Dependencies (within intent)

- **002-graph-ui** (Required): Planned

#### Unit Dependencies (cross-unit)

- None

#### Enables (other bolts waiting on this)

- None (intent complete)
