---
id: 004-e2e-interaction-smoke
unit: 001-release
intent: 003-release-hardening
status: complete
priority: must
created: '2026-07-21T06:35:00Z'
assigned_bolt: 008-release
implemented: true
---

# Story: 004-e2e-interaction-smoke

## User Story

**As a** maintainer preparing the v1.0.0 release
**I want** the E2E suite to exercise one real interaction with the rendered graph
**So that** the extension is proven not just to render, but to actually work, before shipping

## Acceptance Criteria

- [ ] **Given** the graph canvas has rendered (story 003), **When** the test hovers a commit node, **Then** the tooltip (`lib/ui/tooltip.ts`) appears with expected content (message/author/date), matching intent 001's hover behavior
- [ ] **Given** the tooltip check passes, **When** the test clicks a commit node instead, **Then** navigation to the commit occurs (or is asserted via the expected URL/event), matching intent 001's click behavior
- [ ] **Given** either interaction throws an unhandled error, **When** it happens, **Then** the test fails with that error surfaced, not swallowed
- [ ] **Given** the interaction runs against the host GitHub page, **When** it completes, **Then** the host page itself shows no console errors attributable to the extension (host-page-safety, per roadmap Success Criteria)

## Technical Notes

- Reuses the same loaded-extension session from story 003 rather than
  reloading the extension per test, for speed.
- Only one interaction path (hover **or** click) needs a full assertion per
  Acceptance Criteria — testing both is encouraged but the minimum bar is
  one working interaction, matching this story's "basic interaction" scope
  from FR-4.
- Checking the host page's own console for extension-attributable errors
  doubles as a lightweight host-page-safety check from the roadmap's
  Success Criteria table.

## Dependencies

### Requires
- 003-e2e-extension-load (graph must be rendered first)

### Enables
- 010-release-checklist (cites E2E pass/fail)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Tooltip position/content differs slightly between fixture and real page | Assert on content (author/date/message present), not exact pixel position |
| Click triggers a real navigation away from the commits page | Test asserts the navigation intent (URL change or equivalent) without needing to fully load the destination page |
| Hover/click race with the graph still being drawn | Test waits for a stable "rendered" signal (e.g. canvas present + a settled frame) before interacting, not a fixed sleep |

## Out of Scope

- Extension loading itself (003), memory measurement (005)
- Exhaustive interaction coverage (load-more, settings panel) — this is a smoke test, not a full E2E regression suite
