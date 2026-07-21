---
id: 002-commits-page-detection
unit: 001-graph-ui
intent: 001-commit-graph-on-commits-page
status: draft
priority: must
created: 2026-07-21T01:45:00Z
assigned_bolt: 001-graph-ui
implemented: false
---

# Story: 002-commits-page-detection

## User Story

**As a** developer browsing GitHub
**I want** the graph rail to appear exactly on commits pages and survive GitHub's SPA navigation
**So that** the graph is reliably there when relevant and never elsewhere

## Acceptance Criteria

- [ ] **Given** any `github.com/{owner}/{repo}/commits` or `/commits/{ref}` URL, **When** the page loads, **Then** the rail attaches next to the commit list with rows aligned to commit rows (across date-group headers)
- [ ] **Given** I navigate away via GitHub SPA (Turbo) navigation, **When** the commits page unloads, **Then** the rail detaches cleanly (no orphan canvas, no listeners leaked)
- [ ] **Given** I navigate back to a commits page via SPA, **When** the content settles, **Then** the rail re-attaches exactly once (no duplicates)
- [ ] **Given** GitHub's DOM structure changed and selectors fail, **When** the content script runs, **Then** nothing is injected and no error reaches the host page

## Technical Notes

- ALL GitHub selectors live in one module (`lib/github/selectors.ts` or similar)
- Listen to Turbo navigation events (`turbo:load` / fallback MutationObserver)
- Owner/repo/ref parsed from URL only

## Dependencies

### Requires
- 001-extension-scaffold

### Enables
- 006-canvas-render (row alignment), 009-soft-degradation

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| `/commits/{ref}/{path}` (file history) | Treated as commits page for that ref+path or cleanly skipped (decide in construction; must not break) |
| Empty repo (no commits) | No rail, no error |
| Very narrow viewport | Rail hides or collapses gracefully |

## Out of Scope

- Drawing real graph content (005/006)
