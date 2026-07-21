---
id: 004-response-cache
unit: 001-graph-ui
intent: 001-commit-graph-on-commits-page
status: draft
priority: must
created: 2026-07-21T01:45:00Z
assigned_bolt: 002-graph-ui
implemented: false
---

# Story: 004-response-cache

## User Story

**As a** developer revisiting repos
**I want** commit data cached locally with a TTL
**So that** repeat visits render instantly and rarely spend the 60 req/hr budget

## Acceptance Criteria

- [ ] **Given** a fresh fetch for repo+ref, **When** it succeeds, **Then** the parsed pages are stored in `chrome.storage.local` keyed by repo+ref with a fetch timestamp
- [ ] **Given** a cached repo+ref within TTL, **When** the commits page opens, **Then** the graph renders from cache with zero API requests
- [ ] **Given** the cache exceeds its size cap, **When** a new entry is written, **Then** the least-recently-used entries are evicted
- [ ] **Given** an expired entry, **When** the page opens, **Then** a fresh fetch replaces it (stale data may render first, then update)

## Technical Notes

- Store parsed commits (not raw responses) to keep entries small
- TTL constant in one place; suggested default ~10 min (tune in construction)
- Keep etag per entry for future authenticated conditional requests (intent 002)

## Dependencies

### Requires
- 003-fetch-commits

### Enables
- 009-soft-degradation (serving stale on failure), 008-load-more

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| chrome.storage quota exceeded | Evict aggressively; never crash |
| Corrupt/legacy cache entry shape | Discard entry, refetch |
| Same repo+ref open in two tabs | Last write wins; no corruption |

## Out of Scope

- ETag conditional revalidation (needs auth to be useful — intent 002)
