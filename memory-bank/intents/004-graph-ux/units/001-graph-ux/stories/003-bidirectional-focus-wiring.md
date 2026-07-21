---
id: 003-bidirectional-focus-wiring
unit: 001-graph-ux
intent: 004-graph-ux
status: complete
priority: must
created: '2026-07-21T07:27:00Z'
assigned_bolt: 012-graph-ux
implemented: true
---

# Story: 003-bidirectional-focus-wiring

## User Story

**As a** developer scanning a repo's commit list
**I want** hovering a commit either on GitHub's own row OR on the graph canvas to highlight the same relationship
**So that** I don't have to hunt for the tiny canvas node just to see how a commit relates to the rest

## Acceptance Criteria

- [ ] **Given** I hover a GitHub commit row (`rowEls`, from `findCommitRowEls`), **When** the row has a matching entry in `indexBySha`, **Then** the graph rail highlights that commit's relationship set (stories 001+002) exactly as hovering its canvas node would
- [ ] **Given** I hover a canvas node, **When** as today, **Then** it drives the same shared focus state (no regression to existing canvas hover/click/tooltip behavior)
- [ ] **Given** I move the mouse off whichever surface is currently focused (canvas or row) without immediately re-entering the other, **When** the leave event fires, **Then** focus clears and full color is restored
- [ ] **Given** GitHub's row markup doesn't match the expected selector (already-defensive `findCommitRowEls`/`getRowSha` contract), **When** row-hover listeners are attached, **Then** the extension falls back to canvas-only focus — no thrown error reaches the host page
- [ ] **Given** the focused row hasn't changed, **When** the mouse moves within the same row/node, **Then** no recompute/redraw happens (reuses the existing `if (hit?.row !== highlight)`-style guard)

## Technical Notes

- Extends `render()` in `entrypoints/commits.content.ts`: attach
  `mouseenter`/`mouseleave` per element in `rowEls`, looking up
  `indexBySha.get(getRowSha(el))` — both already computed/available in
  `render()`.
- Wrap new row-hover handlers in the existing `safe()` wrapper, same as
  `onMove`/`onLeave`/`onClick`.
- Single shared focus-state variable (rename/generalize today's
  `highlight`) drives both `draw()`'s highlight set and the tooltip
  decision (story 005) — one source of truth, not two parallel hover state
  machines.
- See requirements.md Open Questions for the resolved default on hand-off
  between the two hover sources within the same animation frame.

## Dependencies

### Requires
- 001-relationship-reachability
- 002-fade-highlight-render

### Enables
- 005-relationship-badge-tooltip (badge visibility follows the same shared focus state)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| A GitHub row's sha has no match in `indexBySha` (e.g. partially loaded page) | That row simply doesn't set focus — no crash, silent no-op |
| Rapid mouse movement across many rows | Redraw only fires on an actual focused-row change, not per pixel-move |
| Extension torn down mid-hover (SPA navigation) | Existing `cleanupDraw`/`ctx.onInvalidated` teardown removes the new row listeners same as canvas listeners |

## Out of Scope

- The tooltip content itself (005) — this story only wires the shared focus state
