---
id: 008-load-more
unit: 001-graph-ui
intent: 001-commit-graph-on-commits-page
status: complete
priority: should
created: '2026-07-21T01:45:00Z'
assigned_bolt: 003-graph-ui
implemented: true
---

# Story: 008-load-more

## User Story

**As a** developer digging into older history
**I want** the graph to extend when more commits load
**So that** exploration isn't capped at the initial depth

## Acceptance Criteria

- [ ] **Given** the initial graph, **When** I trigger load-more (GitHub's pagination or a rail control), **Then** the next pages fetch (cache-aware) and the graph extends downward
- [ ] **Given** already-cached older pages, **When** load-more triggers, **Then** no duplicate API requests are made
- [ ] **Given** the extension of the graph, **When** new rows append, **Then** existing rows keep their positions (no visual reshuffle except downward growth)
- [ ] **Given** dangling parent edges at the old bottom, **When** their commits arrive, **Then** edges connect correctly

## Technical Notes

- Incremental layout: recompute from the last stable lane state rather than full relayout if cheap; full relayout acceptable if < 10ms (measure first — it likely is)
- Interplay with GitHub's own "Older" pagination navigation needs a construction-time decision (SPA nav = new page context)

## Dependencies

### Requires
- 004-response-cache, 005-layout-core, 006-canvas-render

### Enables
- None

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| End of history reached | Load-more control disappears/disables |
| Rate limit hit mid-extension | Existing graph stays; degradation notice (009) |

## Out of Scope

- Infinite scroll auto-loading (explicit trigger only for v1)
