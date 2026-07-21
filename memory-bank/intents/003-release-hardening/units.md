---
intent: 003-release-hardening
phase: inception
status: units-decomposed
updated: 2026-07-21T06:30:00Z
---

# Release Hardening - Unit Decomposition

## Units Overview

This intent decomposes into **1 unit of work**, consistent with intents 001
(`001-graph-ui`) and 002 (`001-auth`), which were each a single frontend unit
under this project's `frontend-app` project type. A split into
"verification" vs. "packaging" units was considered and rejected: the two
halves share one purpose (prove v1.0.0 is ready to ship), the packaging
artifacts (README, store listing, checklist) directly consume the
verification artifacts' recorded numbers, and the whole intent is small
enough (9 stories, 4 bolts) that a second unit would add coordination
overhead without a real independence boundary — the perf/E2E/audit/docs work
is all read-only-or-additive tooling around the same frozen codebase, not a
separately deployable piece.

### Unit 1: 001-release

**Description**: Verifies the roadmap's v1.0.0 performance/bundle/memory
budgets with recorded measurements, adds the required Playwright E2E smoke
test, audits the privacy/security claim against the actual code, and
produces every release artifact buildable without a Chrome Web Store
account: manifest release-readiness, store listing content, README/user
docs, and a release checklist that ties it all together and flags the
maintainer-only steps.

**Requirement-to-Unit Mapping** (all FRs → this unit):

- FR-1 Performance verification harness (layout + draw) → `001-release`
- FR-2 Bundle size budget verification → `001-release`
- FR-3 Memory budget verification → `001-release`
- FR-4 End-to-end smoke test (Playwright) → `001-release`
- FR-5 Privacy & security audit vs. code → `001-release`
- FR-6 Manifest release-readiness → `001-release`
- FR-7 Chrome Web Store listing assets & metadata → `001-release`
- FR-8 README & user documentation → `001-release`
- FR-9 Release checklist → `001-release`

**Stories**: 10 (see unit brief)

**Deliverables**:

- Extended perf harness (`benchmarks/`) with a recorded layout+draw number
  for ≥500 commits
- Bundle-size script with a recorded gzip figure
- Playwright E2E suite (new devDependency) with a recorded memory-heap
  delta
- Privacy/security audit document
- `wxt.config.ts` manifest fields at release-ready shape (version, icons)
- Chrome Web Store listing content document (copy, shot-list, icon spec)
- `README.md`
- Release checklist document

**Dependencies**:

- Depends on: `001-graph-ui` (intent 001) and `001-auth` (intent 002) — both
  complete; this unit verifies/documents their output, it does not extend
  their functionality
- Depended by: none (last intent on the roadmap before v1.0.0 exit)

**Estimated Complexity**: M

## Unit Dependency Graph

```text
[001-graph-ui] (intent 001, complete) ──┐
                                          ├──► [001-release] (this intent)
[001-auth] (intent 002, complete) ───────┘
```

## Execution Order

1. `001-release`, bolt 007-release — performance + bundle verification
   (Node-only, no browser infra)
2. `001-release`, bolt 008-release — Playwright E2E smoke + memory budget
   (needs a browser + the built extension)
3. `001-release`, bolt 009-release — privacy/security audit + manifest
   release-readiness (docs + config, no test infra)
4. `001-release`, bolt 010-release — store listing, README, release
   checklist (consumes the recorded outputs of 007/008/009)

Bolts 007, 008, and 009 have no dependency on each other — all three only
require intents 001/002 complete (bolt `006-auth`) and can run in parallel.
Bolt 010 is sequential and blocked until 007, 008, and 009 all complete,
since the checklist/listing/README content directly cites their recorded
results.
