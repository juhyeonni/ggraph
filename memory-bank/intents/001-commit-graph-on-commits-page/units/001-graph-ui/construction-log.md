---
unit: 001-graph-ui
intent: 001-commit-graph-on-commits-page
created: 2026-07-21T01:54:02Z
last_updated: 2026-07-21T01:54:02Z
---

# Construction Log: graph-ui

## Original Plan

**From Inception**: 3 bolts planned
**Planned Date**: 2026-07-21

| Bolt ID | Stories | Type |
|---------|---------|------|
| 001-graph-ui | 001, 002 | simple-construction-bolt |
| 002-graph-ui | 003, 004, 005, 006 | simple-construction-bolt |
| 003-graph-ui | 007, 008, 009 | simple-construction-bolt |

## Replanning History

| Date | Action | Change | Reason | Approved |
|------|--------|--------|--------|----------|

## Current Bolt Structure

| Bolt ID | Stories | Status | Changed |
|---------|---------|--------|---------|
| 001-graph-ui | 001, 002 | ✅ completed | - |
| 002-graph-ui | 003, 004, 005, 006 | ✅ completed | - |
| 003-graph-ui | 007, 008, 009 | ✅ completed | - |

## Execution History

| Date | Bolt | Event | Details |
|------|------|-------|---------|
| 2026-07-21T01:54:02Z | 001-graph-ui | started | Stage 1: plan |
| 2026-07-21T01:58:47Z | 001-graph-ui | stage-complete | plan → implement |
| 2026-07-21T02:06:06Z | 001-graph-ui | stage-complete | implement → test |
| 2026-07-21T02:10:01Z | 001-graph-ui | completed | All 3 stages done (17/17 tests; build/lint/typecheck green) |
| 2026-07-21T02:10:30Z | 002-graph-ui | started | Stage 1: plan |
| 2026-07-21T02:22:36Z | 002-graph-ui | stage-complete | plan → implement |
| 2026-07-21T02:30:52Z | 002-graph-ui | stage-complete | implement → test |
| 2026-07-21T02:51:49Z | 002-graph-ui | completed | All 3 stages done (42/42 tests; build/lint/typecheck/bench green) |
| 2026-07-21T02:52:00Z | 003-graph-ui | started | Stage 1: plan (executed in main Opus session — Sonnet subagent rate-limited until 13:20 JST) |
| 2026-07-21T02:56:01Z | 003-graph-ui | stage-complete | plan → implement |
| 2026-07-21T03:05:00Z | 003-graph-ui | stage-complete | implement → test |
| 2026-07-21T03:03:09Z | 003-graph-ui | completed | All 3 stages done (54/54 tests; build/lint/typecheck/bench green); unit + intent → complete |
| 2026-07-21T03:08:03Z | 001-graph-ui | verified | Live-GitHub selector check (react/react commits): all assumptions hold |

## Execution Summary

| Metric | Value |
|--------|-------|
| Original bolts planned | 3 |
| Current bolt count | 3 |
| Bolts completed | 3 |
| Bolts in progress | 0 |
| Bolts remaining | 0 |
| Replanning events | 0 |

## Notes

Inception verified READY by verification agent (2026-07-21). Deferred-to-construction
decisions to record here as they are made: (a) `/commits/{ref}/{path}` file-history
handling, (b) fetch in content script vs background worker, (c) load-more interplay
with GitHub's own "Older" pagination.

Decisions made:
- (a) File-history URLs (`/commits/{ref}/{path}`): NOT a commits page → silent no-op.
  Path-filtered lists break parent-child adjacency; drawing topology would mislead.
  (bolt 001, plan stage)
- Bolt 001: `@wxt-dev/module-preact` doesn't exist on npm → Preact wired via esbuild
  automatic JSX (`jsxImportSource: preact`), zero extra deps.
- Bolt 001 MANUAL-PENDING: live-Chrome smoke (dummy rail visible, SPA attach/detach,
  narrow viewport, extension reload). Selector strings are best-knowledge, unverified
  against live github.com; failure mode is the designed silent no-op.

Live selector verification (2026-07-21, react/react commits page, via browser):
- `[data-testid="commit-row-item"]` → 35 rows found (primary selector correct;
  legacy `li.js-commits-list-item` fallback correctly unused).
- `getRowSha`: all 35 rows expose a `/commit/{sha}` link; 35 unique 40-char shas
  extracted by the regex. Reliable.
- `getPageTheme`: `data-color-mode="auto"` present → falls through to matchMedia
  (handled).
- Rail geometry: 351px of left gutter before the first row (ample for the rail);
  ~47px gaps between some rows are date-group headers — alignment uses each row's
  measured center, so it spans them. `commit-group` testid wrappers do NOT exist
  on the live page, but `findCommitRowEls` flat-queries rows so grouping is moot
  (the selectors test fixture's grouping is cosmetic, not load-bearing).
Remaining MANUAL: only the in-browser visual/interaction pass (load unpacked →
tooltip/click/scroll/theme/notice), which needs the extension runtime.

## Notes (final)

Construction of unit 001-graph-ui is complete and committed (branch `feat/graph-ui`).
All 3 bolts, 9 stories, unit, and intent are `complete`; status-integrity check
passes with 0 inconsistencies. Executed under a Sonnet session limit for bolt 003,
so bolts 001–002 were built by Sonnet subagents and bolt 003 was built directly in
the main Opus session (including fixing the merge-in renderer defect the bolt-002
Stage-3 subagent surfaced before it was rate-limited). Next DLC phase: Operations
(build/deploy/verify) — deploy requires the maintainer.
