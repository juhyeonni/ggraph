---
intent: 004-graph-ux
created: '2026-07-21T07:10:00Z'
completed: '2026-07-21T07:50:00Z'
status: complete
---

# Inception Log: graph-ux

## Overview

**Intent**: Relationship-focused graph interactions (GitHub Issue #6) —
bidirectional first-parent/merge highlight with fade, and a minimal
relationship-badge tooltip on merge/branch-point commits only, replacing the
current redundant metadata tooltip.
**Type**: enhancement (extends intent 001's rendering pipeline)
**Created**: 2026-07-21

## Artifacts Created

| Artifact | Status | File |
|----------|--------|------|
| Requirements | ✅ | requirements.md |
| System Context | ✅ | system-context.md |
| Units | ✅ | units.md, units/001-graph-ux/unit-brief.md |
| Stories | ✅ | units/001-graph-ux/stories/001–005 |
| Bolt Plan | ✅ | memory-bank/bolts/011–012-graph-ux/bolt.md |

## Summary

| Metric | Count |
|--------|-------|
| Functional Requirements | 7 |
| Non-Functional Requirements | 3 |
| Units | 1 |
| Stories | 5 |
| Bolts Planned | 2 |

## Units Breakdown

| Unit | Stories | Bolts | Priority |
|------|---------|-------|----------|
| 001-graph-ux | 5 | 2 | Must |

## Decision Log

| Date | Decision | Rationale | Approved |
|------|----------|-----------|----------|
| 2026-07-21 | Design taken as already-decided from GitHub Issue #6 consultation — inception grounds requirements in it rather than re-opening it | User explicitly fixed the design before requesting inception | Yes |
| 2026-07-21 | `GraphEdge` gains an additive `isFirstParent` field in the layout core rather than exposing raw sha/parents to the draw/content layers | Keeps `lib/layout/` pure and index-based, consistent with its existing row/edge design; no re-threading of sha strings downstream | Yes |
| 2026-07-21 | Reachable-set + row classification live in a new pure `lib/layout/relationship.ts`, separate from `compute-layout.ts` | Keeps the lane-assignment algorithm untouched (no regression risk) while adding a clearly-scoped, independently-testable module | Yes |
| 2026-07-21 | Branch-point upward fan-out highlights the union of every first-parent child's line | Excluding a valid first-parent descendant would look like a bug; the commit DAG is small enough (bounded by commitDepth) for the inclusive default to be cheap | Yes |
| 2026-07-21 | Branch/PR label renders in the tooltip badge only, no on-canvas text | `draw.ts` has no existing text-rendering path; adding one is scope beyond the "minimal relationship badge" the issue asked for | Yes |
| 2026-07-21 | Merge-source-branch parsing lives in `lib/github/merge-message.ts`, mirroring `lib/github/degrade.ts`'s pure-logic-extraction pattern | Consistent file organization; keeps it independently unit-testable | Yes |
| 2026-07-21 | Row-hover wiring reuses the existing `safe()` wrapper and `rowEls`/`indexBySha` already collected in `render()` | Preserves intent 001's silent-failure contract; no new selectors needed | Yes |
| 2026-07-21 | Single unit (001-graph-ux), 2 bolts (pure-core+render, then wiring+tooltip), sequential | Small, cohesive rendering/interaction feature; bolt 012 wires bolt 011's pure output into the DOM, so it cannot start first | Yes |
| 2026-07-21 | Bolts numbered 011–012 (global sequence continues from intent 003's 010) | memory-bank.yaml requires a global bolt sequence, not per-unit | Yes |
| 2026-07-21 | First bolt's true code dependency is 003-graph-ui (not 010-release) | 003-graph-ui is the bolt that implemented the layout/draw/hit-test/tooltip surface this intent extends; 010-release is unrelated release-hardening work that merely happens to be numerically last | Yes |
| 2026-07-21 | Ref decoration badges (branch/tag heads) excluded | Explicitly out of scope per the decided design — separate future effort | Yes |

## Scope Changes

| Date | Change | Reason | Impact |
|------|--------|--------|--------|

## Ready for Construction

**Checklist**:
- [x] All requirements documented
- [x] System context defined
- [x] Units decomposed
- [x] Stories created for all units
- [x] Bolts planned
- [x] Human review complete

## Next Steps

1. Begin Construction Phase
2. Start with Unit: 001-graph-ux (bolt 011-graph-ux)
3. Execute: `/specsmd-construction-agent --unit="001-graph-ux"`

## Dependencies

Requires intent 001 (`commit-graph-on-commits-page`) complete — verified:
all three of its bolts (001–003-graph-ui) are status `complete`. No
dependency on intent 002 (auth) or intent 003 (release-hardening) — this
intent only touches rendering/interaction, not fetch/auth/release surfaces.
