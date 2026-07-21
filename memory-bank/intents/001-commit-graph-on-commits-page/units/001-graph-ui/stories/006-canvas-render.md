---
id: 006-canvas-render
unit: 001-graph-ui
intent: 001-commit-graph-on-commits-page
status: complete
priority: must
created: '2026-07-21T01:45:00Z'
assigned_bolt: 002-graph-ui
implemented: true
---

# Story: 006-canvas-render

## User Story

**As a** developer viewing the commits page
**I want** the computed graph drawn as a crisp rail aligned with GitHub's commit rows
**So that** each node visually belongs to its commit entry

## Acceptance Criteria

- [ ] **Given** a GraphLayout and the commit list DOM, **When** rendered, **Then** each node's y-position aligns with its commit row, including across date-group headers
- [ ] **Given** a 500-commit graph, **When** rendered, **Then** draw completes within the layout+draw < 100ms budget and creates zero per-commit DOM nodes
- [ ] **Given** a HiDPI display, **When** rendered, **Then** lines/nodes are crisp (devicePixelRatio-aware canvas sizing)
- [ ] **Given** GitHub light or dark theme, **When** rendered, **Then** colors are readable in both (derive from page theme attribute)

## Technical Notes

- `lib/draw/`; only visible rows drawn (viewport clipping) to keep scroll cheap
- Lane colors: small fixed palette cycled by lane index
- Redraw on scroll via rAF; no work when nothing changed

## Dependencies

### Requires
- 002-commits-page-detection (alignment anchors), 005-layout-core

### Enables
- 007-hover-click

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Window resize / zoom | Rail re-measures and redraws correctly |
| Commit rows taller than expected (long messages) | Alignment follows actual row positions, not fixed row height |
| Theme switched live | Colors update on next draw |

## Out of Scope

- Tooltips/interactions (007)
