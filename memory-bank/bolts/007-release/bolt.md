---
id: 007-release
unit: 001-release
intent: 003-release-hardening
type: simple-construction-bolt
status: complete
stories:
  - 001-layout-draw-perf-harness
  - 002-bundle-size-check
created: '2026-07-21T06:50:00Z'
started: '2026-07-21T05:36:33Z'
completed: '2026-07-21T05:56:33Z'
current_stage: null
stages_completed: []
requires_bolts:
  - 006-auth
enables_bolts:
  - 010-release
requires_units:
  - 001-graph-ui
  - 001-auth
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 1
---

## Bolt: 007-release

### Objective

Performance + bundle-size verification (milestone **v1.0.0**): extend the
existing layout benchmark to measure combined layout+draw time on a
≥500-commit graph, and add a gzip bundle-size script — producing the two
recorded numbers the roadmap's exit criteria require, in place of the
current unmeasured claims.

### Stories Included

- [ ] **001-layout-draw-perf-harness**: Measure layout + draw time for ≥500 commits - Priority: Must
- [ ] **002-bundle-size-check**: Verify shipped JS gzip size ≤100KB - Priority: Must

### Expected Outputs

- `benchmarks/layout-bench.mjs` extended with a layout+draw combined
  measurement, recorded result committed to the repo
- A new gzip bundle-size script (Node `zlib`, no new dependency) with a
  recorded total against the ≤100KB budget
- New `pnpm` scripts documenting how to re-run both, alongside the existing
  `bench`/`test`/`lint`/`typecheck` scripts

### Dependencies

#### Bolt Dependencies (within intent)

- None (first bolt of intent 003; depends only on intents 001/002 being
  complete)

#### Unit Dependencies (cross-unit)

- **001-graph-ui** (Required, intent 001): Completed — this bolt exercises
  its `lib/layout/`, `lib/draw/`, and build output
- **001-auth** (Required, intent 002): Completed — this bolt's build-output
  measurements include the auth-related code intent 002 added; intents
  001/002 are both fully complete so this dependency is already satisfied

#### Enables (other bolts waiting on this)

- 010-release
