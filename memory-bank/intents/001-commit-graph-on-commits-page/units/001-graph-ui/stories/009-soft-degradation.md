---
id: 009-soft-degradation
unit: 001-graph-ui
intent: 001-commit-graph-on-commits-page
status: draft
priority: must
created: 2026-07-21T01:45:00Z
assigned_bolt: 003-graph-ui
implemented: false
---

# Story: 009-soft-degradation

## User Story

**As a** developer whose rate limit ran out (or whose GitHub UI changed)
**I want** the extension to degrade quietly and helpfully
**So that** it never gets in the way of using GitHub

## Acceptance Criteria

- [ ] **Given** the rate limit is exhausted, **When** the commits page opens, **Then** the cached graph (even stale) renders with a small inline notice including the reset time
- [ ] **Given** no cache and a failed fetch, **When** the rail would render, **Then** exactly one concise inline notice appears (no console spam, no broken layout)
- [ ] **Given** any uncaught error in extension code paths, **When** it occurs, **Then** it is contained (wrapped entry points) and the GitHub page remains fully functional
- [ ] **Given** the injection point is missing (DOM changed), **When** the content script runs, **Then** it exits as a silent no-op

## Technical Notes

- One error-boundary wrapper for all entry points (content script init, event handlers, async chains)
- Rate-limit reset time from `x-ratelimit-reset` header, formatted relative ("resets in 23 min")
- Logging per standards: `[ggraph]` wrapper, error-level only in production

## Dependencies

### Requires
- 002-commits-page-detection, 003-fetch-commits, 004-response-cache

### Enables
- None (hardens everything)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Network offline | Cached render or single notice |
| api.github.com 5xx | Same as rate limit path, generic message |
| Notice would overlap GitHub UI | Notice renders inside the rail area only |

## Out of Scope

- Sign-in prompts (intent 002 will add "sign in for higher limits" hint)
