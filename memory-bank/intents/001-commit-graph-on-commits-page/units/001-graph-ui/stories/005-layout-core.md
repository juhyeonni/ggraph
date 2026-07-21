---
id: 005-layout-core
unit: 001-graph-ui
intent: 001-commit-graph-on-commits-page
status: complete
priority: must
created: '2026-07-21T01:45:00Z'
assigned_bolt: 002-graph-ui
implemented: true
---

# Story: 005-layout-core

## User Story

**As a** developer reading the graph
**I want** the DAG layout (order, lanes, merge edges) computed correctly from commit parents
**So that** the drawn topology faithfully shows how branches merged

## Acceptance Criteria

- [ ] **Given** a commit list (newest-first with parents), **When** `computeLayout` runs, **Then** it returns per-commit lane (x), row (y), and edge segments, plus total lane count
- [ ] **Given** fixture repos (linear, single merge, criss-cross merges, octopus merge), **When** laid out, **Then** topology matches `git log --graph` reference output captured in test fixtures
- [ ] **Given** the module, **When** inspected, **Then** it imports nothing from DOM/network/chrome.* and has zero runtime dependencies
- [ ] **Given** `benchmarks/layout-bench.mjs`, **When** run against the real module, **Then** 500 commits lay out in < 10ms

## Technical Notes

- Lives in `lib/layout/`; this module is the future WASM seam — keep its public interface narrow (`computeLayout(commits): GraphLayout`)
- Wire the existing benchmark to import this module instead of its inline copy
- Lane compaction: reuse freed lanes to keep the rail narrow

## Dependencies

### Requires
- 001-extension-scaffold (types)

### Enables
- 006-canvas-render, 007-hover-click, 008-load-more (incremental API)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Parent SHA outside fetched window | Edge drawn to bottom edge marker (dangling parent) |
| Octopus merge (3+ parents) | All parent edges routed |
| Orphan/root commit mid-list | Lane closes cleanly |
| Duplicate SHAs in input | Deduplicated defensively |

## Out of Scope

- Drawing (006), incremental re-layout internals beyond a clean API surface (008)
