---
id: 003-fetch-commits
unit: 001-graph-ui
intent: 001-commit-graph-on-commits-page
status: draft
priority: must
created: 2026-07-21T01:45:00Z
assigned_bolt: 002-graph-ui
implemented: false
---

# Story: 003-fetch-commits

## User Story

**As a** developer viewing a public repo's commits page
**I want** the extension to fetch recent commits (with parent SHAs) for the viewed ref
**So that** the graph reflects the real DAG without any configuration

## Acceptance Criteria

- [ ] **Given** a public repo commits page for ref R, **When** the rail attaches, **Then** `GET /repos/{o}/{r}/commits?sha=R&per_page=100` is fetched (paginated) up to depth 200 by default
- [ ] **Given** the response, **When** parsed, **Then** each commit yields sha, parents[], message (first line), author name, and date, typed strictly (no `any`)
- [ ] **Given** no ref in the URL, **When** fetching, **Then** the API default (repository default branch) is used
- [ ] **Given** a 200-commit depth, **When** fetched fresh, **Then** at most 2 API requests are made

## Technical Notes

- Fetch from the content script or background worker (decide in construction; host_permissions cover CORS either way)
- Depth constant in one place (settings UI comes in intent 002 era)

## Dependencies

### Requires
- 001-extension-scaffold

### Enables
- 004-response-cache, 005-layout-core (real input), 009-soft-degradation

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Repo with < 200 commits | Stop at last page, no extra requests |
| 404 (repo gone/private) | Typed error surfaced to degradation handler |
| 403 rate limit | Typed error carrying reset time from headers |

## Out of Scope

- Caching (004), auth (intent 002)
