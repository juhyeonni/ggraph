---
id: 007-hover-click
unit: 001-graph-ui
intent: 001-commit-graph-on-commits-page
status: draft
priority: must
created: 2026-07-21T01:45:00Z
assigned_bolt: 003-graph-ui
implemented: false
---

# Story: 007-hover-click

## User Story

**As a** developer exploring the graph
**I want** to hover nodes for commit details and click to open the commit
**So that** the graph is a navigation surface, not just a picture

## Acceptance Criteria

- [ ] **Given** the rendered rail, **When** the pointer moves over a node (with a comfortable hit radius), **Then** the node highlights and a tooltip shows message (first line), author, date, and short SHA within one frame
- [ ] **Given** a highlighted node, **When** clicked, **Then** the commit page (`/commit/{sha}`) opens (same tab; cmd/ctrl-click → new tab)
- [ ] **Given** the pointer leaves the rail, **When** hit-testing misses, **Then** highlight and tooltip disappear
- [ ] **Given** rapid pointer movement, **When** hit-testing runs per mousemove, **Then** no long tasks appear (> 50ms)

## Technical Notes

- Hit-testing math in `lib/draw/` (pure function against GraphLayout coordinates) — unit-test it
- Tooltip is one absolutely-positioned DOM element (Preact or plain), reused across hovers
- Row-bucketed lookup keeps hit-testing O(1) per event

## Dependencies

### Requires
- 006-canvas-render

### Enables
- None

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Two nodes near each other | Closest node wins; no flicker |
| Tooltip near viewport edge | Flips placement, stays fully visible |
| Touch devices | Tap = click; no hover state stuck |

## Out of Scope

- Pan/zoom, load-more (008)
