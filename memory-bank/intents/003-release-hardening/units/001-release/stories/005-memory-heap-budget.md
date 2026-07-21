---
id: 005-memory-heap-budget
unit: 001-release
intent: 003-release-hardening
status: complete
priority: must
created: '2026-07-21T06:35:00Z'
assigned_bolt: 008-release
implemented: true
---

# Story: 005-memory-heap-budget

## User Story

**As a** maintainer preparing the v1.0.0 release
**I want** a measured JS heap delta for rendering a ≥500-commit graph
**So that** the roadmap's "≤50MB extra heap" budget is verified, not assumed

## Acceptance Criteria

- [ ] **Given** the E2E session from stories 003/004, **When** the test captures `page.metrics().JSHeapUsedSize` (or the extension's own service-worker/content-script equivalent) before the content script renders a graph, **Then** a baseline heap value is recorded
- [ ] **Given** the baseline, **When** a ≥500-commit graph has fully rendered, **Then** a second heap measurement is taken and the delta (after − before) is computed
- [ ] **Given** the computed delta, **When** the test reports it, **Then** it states pass/fail against ≤50MB explicitly and the number is recorded in the repo (test output/report), not just asserted in prose
- [ ] **Given** the measurement is repeated (e.g. 2-3 runs), **When** compared, **Then** results are in a consistent range (not wildly divergent, which would indicate a measurement bug rather than real variance)

## Technical Notes

- `page.metrics()` is Playwright's built-in Chromium metrics API — no new
  dependency beyond `@playwright/test` (already added in story 003).
- Measuring the content script's own heap (vs. the full page's) may need
  `chrome.system.memory` or a CDP session scoped to the content-script
  execution context if `page.metrics()` proves too coarse (it measures the
  page/tab, which includes GitHub's own JS) — Construction should try
  `page.metrics()` first since it's the simplest option, and only reach for
  a scoped CDP session if the coarse number proves unusable (e.g. too noisy
  to see the extension's contribution).
- GC before each measurement if the API allows it, to reduce noise from
  unrelated allocations.

## Dependencies

### Requires
- 003-e2e-extension-load, 004-e2e-interaction-smoke (same harness/session)

### Enables
- 010-release-checklist (cites this story's recorded delta)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| `page.metrics()` heap includes GitHub's own page JS, not just the extension | Before/after delta isolates the extension's contribution even if the absolute numbers are noisy; document this caveat in the test's own notes |
| Heap delta is close to but under budget (e.g. 45MB) | Recorded and passed, but flagged in the release checklist as worth re-checking after future changes |
| Heap delta exceeds 50MB | Test fails explicitly; this is a real finding requiring investigation (e.g. a leak or an oversized in-memory graph structure), not silently downgraded to a warning |

## Out of Scope

- Layout+draw timing (001), bundle size (002) — separate budgets
- Long-running memory-leak detection across multiple graph loads (this story is a single-render snapshot, not a leak-detection suite)
