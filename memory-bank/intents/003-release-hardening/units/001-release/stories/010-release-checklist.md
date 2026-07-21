---
id: 010-release-checklist
unit: 001-release
intent: 003-release-hardening
status: complete
priority: should
created: '2026-07-21T06:35:00Z'
assigned_bolt: 010-release
implemented: true
---

# Story: 010-release-checklist

## User Story

**As a** maintainer about to publish v1.0.0
**I want** one ordered checklist covering every remaining step
**So that** nothing is missed and it's unambiguous which steps are mine to do versus already automated/verified

## Acceptance Criteria

- [ ] **Given** stories 001-003's recorded results, **When** the checklist is written, **Then** it cites the actual layout+draw time, gzip bundle size, and memory-heap delta with pass/fail against their budgets (not restated targets without numbers)
- [ ] **Given** story 003/004's E2E suite, **When** the checklist is written, **Then** it states the E2E suite's pass/fail status and how to re-run it
- [ ] **Given** story 006's privacy audit, **When** the checklist is written, **Then** it links to/summarizes the audit's conclusion
- [ ] **Given** stories 007/008's manifest and listing work, **When** the checklist is written, **Then** it confirms both are complete and ready
- [ ] **Given** maintainer-only actions (real OAuth `client_id` from intent 002, Chrome Web Store developer account, listing submission/upload, review wait), **When** listed, **Then** each is labeled unambiguously as a maintainer action, distinct from the engineering-complete items above it

## Technical Notes

- Single markdown document (e.g. `RELEASE_CHECKLIST.md` at repo root, or
  under `memory-bank/operations/` if that better matches this repo's
  convention for release-facing docs — Construction's call).
- This story is intentionally the last one in the last bolt: it's a
  synthesis of every other story's output, not new verification work of its
  own.

## Dependencies

### Requires
- 001-layout-draw-perf-harness, 002-bundle-size-check, 003-e2e-extension-load, 004-e2e-interaction-smoke, 005-memory-heap-budget, 006-privacy-security-audit, 007-manifest-release-readiness, 008-store-listing-assets, 009-readme-user-docs (synthesizes all of them)

### Enables
- None (this is the final artifact; "enables" the actual human release decision, not another story)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| One of the earlier stories' budgets fails (e.g. bundle exceeds 100KB) | Checklist surfaces it as a blocking item, not glossed over — v1.0.0 shouldn't ship with a known-failing budget silently noted |
| Maintainer already has an OAuth App / CWS account from prior work | Checklist item is simply checked off faster; the item still exists in the list for anyone reproducing the release process later |
| Checklist becomes stale after a future patch release | Out of scope for this story to maintain long-term; it documents the v1.0.0 state, not a living template (a future intent could generalize it if needed) |

## Out of Scope

- Actually performing the maintainer-only steps (developer account, submission, real client_id)
- Ongoing release-process tooling for future versions (v1.0.0-specific only)
