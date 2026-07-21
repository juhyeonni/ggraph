---
id: 008-release
unit: 001-release
intent: 003-release-hardening
type: simple-construction-bolt
status: complete
stories:
  - 003-e2e-extension-load
  - 004-e2e-interaction-smoke
  - 005-memory-heap-budget
created: '2026-07-21T06:50:00Z'
started: '2026-07-21T05:36:33Z'
completed: '2026-07-21T05:56:34Z'
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
  max_dependencies: 3
  testing_scope: 3
---

## Bolt: 008-release

### Objective

Playwright E2E smoke test + memory budget (milestone **v1.0.0**): load the
built extension in a real Chromium instance, prove the graph renders and one
interaction works against a commits page, and measure JS heap growth for the
≤50MB budget — the roadmap's required (not optional) E2E coverage for this
release.

### Stories Included

- [ ] **003-e2e-extension-load**: Playwright loads the built extension and the graph renders - Priority: Must
- [ ] **004-e2e-interaction-smoke**: E2E covers one hover/click interaction - Priority: Must
- [ ] **005-memory-heap-budget**: Measure extra JS heap on a ≥500-commit graph - Priority: Must

### Expected Outputs

- `@playwright/test` added as a new devDependency (the one new dependency
  this intent introduces)
- A Playwright suite loading `.output/chrome-mv3` unpacked via a persistent
  Chromium context, navigating to a commits page (real or local fixture —
  Construction's call, see requirements.md Open Questions)
- Assertions that the injected graph canvas renders and a hover/click
  interaction succeeds without throwing
- A recorded JS-heap-delta measurement (`page.metrics()` or equivalent)
  against the ≤50MB budget
- A documented `pnpm test:e2e` (or similar) command, runnable locally (no CI
  wiring, per requirements.md Scope)

### Dependencies

#### Bolt Dependencies (within intent)

- None (parallelizable with 007-release and 009-release — no shared
  artifacts between them)

#### Unit Dependencies (cross-unit)

- **001-graph-ui** (Required, intent 001): Completed — this bolt loads and
  exercises its full rendering pipeline
- **001-auth** (Required, intent 002): Completed — the loaded extension
  includes intent 002's auth surface, though this bolt's interaction smoke
  test does not require exercising sign-in itself; intents 001/002 are both
  fully complete so this dependency is already satisfied

#### Enables (other bolts waiting on this)

- 010-release
