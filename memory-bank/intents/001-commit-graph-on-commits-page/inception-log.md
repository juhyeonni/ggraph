---
intent: 001-commit-graph-on-commits-page
created: 2026-07-21T01:00:51Z
completed: 2026-07-21T02:05:00Z
status: complete
---

# Inception Log: commit-graph-on-commits-page

## Overview

**Intent**: Interactive branch-integration graph rendered inline on GitHub's commits page (roadmap v0.1.0–v0.3.0).
**Type**: green-field
**Created**: 2026-07-21

## Artifacts Created

| Artifact | Status | File |
|----------|--------|------|
| Requirements | ✅ | requirements.md |
| System Context | ✅ | system-context.md |
| Units | ✅ | units.md, units/001-graph-ui/unit-brief.md |
| Stories | ✅ | units/001-graph-ui/stories/001–009 |
| Bolt Plan | ✅ | memory-bank/bolts/001–003-graph-ui/bolt.md |

## Summary

| Metric | Count |
|--------|-------|
| Functional Requirements | 8 |
| Non-Functional Requirements | 5 |
| Units | 1 |
| Stories | 9 |
| Bolts Planned | 3 |

## Units Breakdown

| Unit | Stories | Bolts | Priority |
|------|---------|-------|----------|
| 001-graph-ui | 9 | 3 | Must |

## Decision Log

| Date | Decision | Rationale | Approved |
|------|----------|-----------|----------|
| 2026-07-21 | Surface: inline on commits page | Value where users already look; minimal scope | Yes |
| 2026-07-21 | Data: unauthenticated REST (parents verified) | Zero-config; 1–3 req/render | Yes |
| 2026-07-21 | Render: Canvas 2D, layout in Rust/WASM | Bundle/memory/speed constraints | Yes |
| 2026-07-21 | Drop Rust/WASM → pure TS layout (supersedes above) | Measured: 500 commits = 1.3ms / 0.15MB in V8; WASM adds 50–250KB + boundary copies for no gain. Layout isolated in `lib/layout/` as future WASM seam | Yes |
| 2026-07-21 | Placement: rail alongside GitHub's own commit list | Integrate rather than duplicate the list | Yes |
| 2026-07-21 | Branch scope: current ref history only | Merge topology visible via parent lanes; fits 60 req/hr | Yes |
| 2026-07-21 | Ref labels (branches/tags) excluded from v1 | Extra API calls not worth unauthenticated budget | Yes |
| 2026-07-21 | Single unit (001-graph-ui), 3 bolts mapped to milestones v0.1.0–v0.3.0 | frontend-app project type; solo project, bolts give the sequencing | Yes |

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
- [x] Human review complete (Checkpoint 3, 2026-07-21)

## Next Steps

1. Begin Construction Phase
2. Start with Unit: 001-graph-ui (bolt 001-graph-ui)
3. Execute: `/specsmd-construction-agent --unit="001-graph-ui"`

## Dependencies

None — first intent.
