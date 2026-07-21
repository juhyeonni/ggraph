---
id: 001-layout-draw-perf-harness
unit: 001-release
intent: 003-release-hardening
status: complete
priority: must
created: '2026-07-21T06:35:00Z'
assigned_bolt: 007-release
implemented: true
---

# Story: 001-layout-draw-perf-harness

## User Story

**As a** maintainer preparing the v1.0.0 release
**I want** a script that measures real layout+draw time on a ≥500-commit graph
**So that** the roadmap's "<100ms after data arrives" budget is verified, not assumed

## Acceptance Criteria

- [ ] **Given** a synthetic DAG of ≥500 commits (reusing `genCommits` from `benchmarks/layout-bench.mjs`), **When** the harness runs, **Then** it drives both `computeLayout` (`lib/layout/compute-layout.ts`) and the draw stage (`lib/draw/draw.ts`) and reports one combined wall-clock time
- [ ] **Given** the harness has run, **When** its output is inspected, **Then** it states pass/fail against the <100ms target explicitly (not left to the reader to compute)
- [ ] **Given** the harness runs at n=500 and at least one larger n (e.g. 2000, matching the existing benchmark's sweep), **When** compared, **Then** both results are recorded, not just the n=500 case
- [ ] **Given** the harness is run via `pnpm bench` or a new documented script, **When** invoked, **Then** it requires no manual setup beyond `pnpm install`

## Technical Notes

- Extend `benchmarks/layout-bench.mjs` rather than writing a new tool — it
  already generates a realistic merge-shaped DAG and measures
  `process.memoryUsage()`/`performance.now()` with no framework.
- The draw stage (`lib/draw/draw.ts`) expects a canvas 2D context; in a
  headless Node benchmark this likely means a lightweight canvas stub/mock
  timed the same way the real draw call is timed in the extension, or
  running this specific measurement inside the Playwright harness (story
  003/004's bolt) against the real browser canvas — Construction's call,
  document whichever approach is chosen and why.
- Record the actual measured numbers in the script's own output and in the
  bolt's test-walkthrough (not just "should be under 100ms" prose).

## Dependencies

### Requires
- None (first story in this unit; intents 001/002 already complete)

### Enables
- 010-release-checklist (cites this story's recorded number)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Harness run on a slow/loaded CI-like machine | Result still recorded with pass/fail; if it fails the <100ms target, this is a real finding to investigate, not silently ignored |
| Draw stage requires a real `CanvasRenderingContext2D` unavailable in plain Node | Use a minimal mock/stub sufficient to time the draw call's actual work, or move this measurement into the Playwright-driven E2E harness where a real canvas exists |
| Existing `benchmarks/layout-bench.mjs` sweep (500/2000/10000/50000) | Keep sweeping layout-only at all four sizes; only need layout+draw combined at 500 (and ideally one larger size) for the release budget |

## Out of Scope

- Bundle size (002), memory heap budget (005) — separate budgets, separate stories
- Automated 60fps scroll assertion (best-effort manual check only, per requirements.md NFR table)
