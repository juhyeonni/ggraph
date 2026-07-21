---
intent: 003-release-hardening
created: '2026-07-21T06:00:00Z'
completed: '2026-07-21T07:00:00Z'
status: complete
---

# Inception Log: release-hardening

## Overview

**Intent**: Release-harden and ship v1.0.0 on the Chrome Web Store —
measured (not assumed) performance/bundle/memory budgets, a required
Playwright E2E smoke test, a privacy/security audit of the "no data leaves
the browser" claim, Chrome Web Store listing content, README/user docs,
manifest release-readiness, and a release checklist (roadmap v1.0.0).
**Type**: green-field tooling/docs around a frozen feature set (extends
neither `lib/` nor `entrypoints/` behavior; verifies and documents intents
001+002's output)
**Created**: 2026-07-21

## Artifacts Created

| Artifact | Status | File |
|----------|--------|------|
| Requirements | ✅ | requirements.md |
| System Context | ✅ | system-context.md |
| Units | ✅ | units.md, units/001-release/unit-brief.md |
| Stories | ✅ | units/001-release/stories/001–010 |
| Bolt Plan | ✅ | memory-bank/bolts/007–010-release/bolt.md |

## Summary

| Metric | Count |
|--------|-------|
| Functional Requirements | 9 |
| Non-Functional Requirements | 5 |
| Units | 1 |
| Stories | 10 |
| Bolts Planned | 4 |

## Units Breakdown

| Unit | Stories | Bolts | Priority |
|------|---------|-------|----------|
| 001-release | 10 | 4 | Must |

## Decision Log

| Date | Decision | Rationale | Approved |
|------|----------|-----------|----------|
| 2026-07-21 | Single unit (001-release), not split into verification/packaging units | Both halves serve one purpose (prove v1.0.0 ready to ship); packaging directly consumes verification's recorded numbers; intent is small (10 stories) — a second unit would add coordination overhead with no real independence boundary | Yes |
| 2026-07-21 | Extend `benchmarks/layout-bench.mjs` for the layout+draw budget rather than a new harness | Existing script already generates a realistic DAG and measures timing/heap with no framework; smaller diff | Yes |
| 2026-07-21 | Bundle-size check uses Node's built-in `zlib`, no new dependency | Gzip size measurement doesn't need a library | Yes |
| 2026-07-21 | `@playwright/test` added as the one new devDependency | Roadmap explicitly requires Playwright E2E for this release intent; `coding-standards.md` already names it as the project's E2E tool (optional elsewhere, required here) | Yes |
| 2026-07-21 | E2E target (real commits page vs. local fixture) left as an open question with a documented default (fixture preferred) | Avoids flakiness from live rate-limits/DOM drift; Construction may still choose a real low-traffic repo | Yes |
| 2026-07-21 | Memory budget measured via the same Playwright harness as the E2E test (`page.metrics()`), not a separate tool | Reuses the one browser session already needed for FR-4; avoids inventing a second measurement approach | Yes |
| 2026-07-21 | Chrome Web Store developer-account signup, listing submission/review, and the real intent-002 OAuth `client_id` are maintainer-only, out of engineering scope | External boundaries this intent cannot resolve; explicitly flagged in requirements.md Scope/Assumptions and in the 010-release-checklist story | Yes |
| 2026-07-21 | 4 bolts: 007/008/009 parallelizable (all depend only on 006-auth), 010 sequential and blocked on all three | 007/008/009 have no shared artifacts and each stay within the 2-4 stories/bolt guideline; 010 synthesizes their recorded outputs so it must come last | Yes |
| 2026-07-21 | Bolts numbered 007–010 (global sequence continues from intent 002's 004–006) | memory-bank.yaml requires a global bolt sequence, not per-unit | Yes |

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
2. Start with Unit: 001-release (bolts 007-release, 008-release, and
   009-release can run in parallel; 010-release last)
3. Execute: `/specsmd-construction-agent --unit="001-release"`

## Dependencies

Requires intent 001 (`commit-graph-on-commits-page`) and intent 002
(`github-sign-in`) complete — verified: all bolts across both intents
(001–006) are `status: complete`. No other open intent dependencies. This is
the final planned intent before the v1.0.0 roadmap exit; the only remaining
step after Construction finishes is the maintainer-only Chrome Web Store
submission itself.
