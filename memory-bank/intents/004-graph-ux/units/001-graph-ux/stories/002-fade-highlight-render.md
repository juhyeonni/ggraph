---
id: 002-fade-highlight-render
unit: 001-graph-ux
intent: 004-graph-ux
status: complete
priority: must
created: '2026-07-21T07:26:00Z'
assigned_bolt: 011-graph-ux
implemented: true
---

# Story: 002-fade-highlight-render

## User Story

**As a** developer focusing a commit
**I want** the rest of the graph to visually recede
**So that** the highlighted relationship stands out without reading a tooltip

## Acceptance Criteria

- [ ] **Given** no active focus, **When** `drawGraph` runs, **Then** output is unchanged from today — every lane/node/edge at full `LANE_COLORS` saturation (regression-safety: identical to current behavior)
- [ ] **Given** an active focus (a `RelationshipHighlight` passed via `DrawOptions`), **When** `drawGraph` runs, **Then** every row/edge in the highlighted set renders at full color and every row/edge NOT in it renders at a visibly reduced-alpha ("faded") variant of its lane color
- [ ] **Given** an active focus, **When** the exact focused node is drawn, **Then** its existing ring indicator (`highlightRow`) still renders exactly as before — this story adds fading, it does not remove the existing focus ring
- [ ] **Given** a fade is applied, **When** compared against the perf budget, **Then** drawing cost stays within intent 001's <100ms/500-commit budget (no per-frame allocation growth — reuse the existing single-pass loop over `layout.edges`/`layout.rows`)

## Technical Notes

- Extends `DrawOptions` (`lib/draw/draw.ts`) with the highlight set from
  story 001; when absent/empty, behavior must be identical to
  pre-intent-004 code (guards the regression-safety criterion above).
- Fade = reduced alpha on the same lane color (e.g. a "faded" color table
  derived once from `LANE_COLORS`, not per-draw-call string parsing) —
  avoid adding per-frame string/color computation to the existing hot loop.
- Reuse the existing single loop over `edges`/`rows` in `drawGraph`; do not
  add a second full-graph pass just to compute fade.

## Dependencies

### Requires
- 001-relationship-reachability (needs the highlight set shape to render against)

### Enables
- 003-bidirectional-focus-wiring (wiring will pass real highlight sets into this render path)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Highlight set references a row currently scrolled out of the visible clip region | Skipped same as today's existing `top`/`bottom` clip check — no wasted work |
| Focused row itself has no incoming/outgoing edges (isolated single commit, e.g. sole root) | Only the node itself highlights; nothing else needs to fade differently than "everything else" |
| Theme switches (light/dark) mid-session | Faded variant recomputed from the active theme's `LANE_COLORS`, same as full-color lookup already does |

## Out of Scope

- Computing which rows/edges are highlighted (001, already done), hover wiring (003)
