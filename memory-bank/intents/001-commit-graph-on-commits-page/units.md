---
intent: 001-commit-graph-on-commits-page
phase: inception
status: units-decomposed
updated: 2026-07-21T01:45:00Z
---

# Commit Graph on Commits Page - Unit Decomposition

## Units Overview

This intent decomposes into 1 unit of work:

### Unit 1: 001-graph-ui

**Description**: The entire user-facing feature — extension scaffold, commits-page
detection/injection, data fetch + cache, pure-TS layout core, canvas rendering,
and interactions. Single frontend unit per project type (`frontend-app`,
feature-based decomposition); name shortened from the `{intent}-ui` pattern for
path sanity.

**Requirement-to-Unit Mapping** (all FRs → this unit):

- FR-1 Commits page detection & graph rail injection → `001-graph-ui`
- FR-2 Commit data fetch (unauthenticated REST) → `001-graph-ui`
- FR-3 Response caching → `001-graph-ui`
- FR-4 Graph layout core → `001-graph-ui`
- FR-5 Canvas rendering → `001-graph-ui`
- FR-6 Hover & click interactions → `001-graph-ui`
- FR-7 Incremental load-more → `001-graph-ui`
- FR-8 Soft degradation → `001-graph-ui`

**Stories**: 9 (see unit brief)

**Deliverables**:

- Working WXT extension (loadable unpacked) with the graph rail on commits pages
- `lib/layout/` pure module with fixture tests
- `lib/github/` data access + cache, `lib/draw/` canvas renderer

**Dependencies**:

- Depends on: none (first unit)
- Depended by: intent 002 (github-sign-in) will extend `lib/github/`

**Estimated Complexity**: L

## Unit Dependency Graph

```text
[001-graph-ui]   (single unit — no cross-unit dependencies)
```

## Execution Order

1. 001-graph-ui, bolt 001 — walking skeleton (milestone v0.1.0)
2. 001-graph-ui, bolt 002 — real data + layout + render (milestone v0.2.0)
3. 001-graph-ui, bolt 003 — interactivity + degradation (milestone v0.3.0)
