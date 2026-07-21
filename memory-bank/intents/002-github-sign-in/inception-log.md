---
intent: 002-github-sign-in
created: 2026-07-21T04:00:00Z
completed: 2026-07-21T04:45:00Z
status: complete
---

# Inception Log: github-sign-in

## Overview

**Intent**: Optional "Sign in with GitHub" via OAuth Device Flow — private
repos, 5,000 req/hr, ETag conditional requests, settings panel (roadmap
v0.4.0).
**Type**: green-field (extends intent 001's `lib/github/` surface)
**Created**: 2026-07-21

## Artifacts Created

| Artifact | Status | File |
|----------|--------|------|
| Requirements | ✅ | requirements.md |
| System Context | ✅ | system-context.md |
| Units | ✅ | units.md, units/001-auth/unit-brief.md |
| Stories | ✅ | units/001-auth/stories/001–009 |
| Bolt Plan | ✅ | memory-bank/bolts/004–006-auth/bolt.md |

## Summary

| Metric | Count |
|--------|-------|
| Functional Requirements | 7 |
| Non-Functional Requirements | 5 |
| Units | 1 |
| Stories | 9 |
| Bolts Planned | 3 |

## Units Breakdown

| Unit | Stories | Bolts | Priority |
|------|---------|-------|----------|
| 001-auth | 9 | 3 | Must |

## Decision Log

| Date | Decision | Rationale | Approved |
|------|----------|-----------|----------|
| 2026-07-21 | Auth: OAuth Device Flow, client_id only | No backend, no client_secret; matches roadmap decision | Yes |
| 2026-07-21 | Rejected: PAT pasting in main flow | Bad UX, security surface; deferred to v1.1+ "advanced" as a hidden option only | Yes |
| 2026-07-21 | Rejected: OAuth web flow | Requires a backend to hold client_secret; extension has none | Yes |
| 2026-07-21 | client_id treated as build-time config, not resolved in this intent | Real value requires maintainer OAuth App registration — external boundary, out of engineering scope | Yes |
| 2026-07-21 | ETag wired onto the already-reserved `CacheEntry.etag` field | No schema migration; intent 001 already anticipated this extension point | Yes |
| 2026-07-21 | Device-flow polling defaults to background service worker | Content script can be torn down by SPA navigation during the ~30-60s user-authorization wait; documented as open question, Construction may revisit | Yes |
| 2026-07-21 | Single unit (001-auth), 3 bolts, all sequential | Small, cohesive frontend feature; each bolt's output is a prerequisite for the next (token → authenticated fetch → UI/degradation) | Yes |
| 2026-07-21 | Bolts numbered 004–006 (global sequence continues from intent 001's 001–003) | memory-bank.yaml requires a global bolt sequence, not per-unit | Yes |

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
2. Start with Unit: 001-auth (bolt 004-auth)
3. Execute: `/specsmd-construction-agent --unit="001-auth"`

## Dependencies

Requires intent 001 (`commit-graph-on-commits-page`) complete — verified:
all three of its bolts (001–003-graph-ui) are status `complete`. No other
open intent dependencies.
