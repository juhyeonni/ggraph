---
id: 005-etag-conditional-requests
unit: 001-auth
intent: 002-github-sign-in
status: complete
priority: must
created: '2026-07-21T04:35:00Z'
assigned_bolt: 005-auth
implemented: true
---

# Story: 005-etag-conditional-requests

## User Story

**As a** developer who signed in
**I want** repeat visits to reuse cached data via conditional requests
**So that** revalidation doesn't cost against my rate limit

## Acceptance Criteria

- [ ] **Given** an authenticated request and an existing cache entry with an `etag` (the field already reserved on `CacheEntry` in `lib/github/cache.ts`), **When** fetching, **Then** the request includes `If-None-Match: {etag}`
- [ ] **Given** the server responds `304 Not Modified`, **When** handled, **Then** the cached commits are reused and `fetchedAt`/`lastAccessed` are refreshed
- [ ] **Given** a `304` response, **When** counted, **Then** it is treated as exempt from the authenticated rate limit (per GitHub's documented behavior and the roadmap decision)
- [ ] **Given** an unauthenticated request, **When** fetching, **Then** no `If-None-Match` header is ever sent (304 exemption does not apply unauthenticated — verified in intent 001)
- [ ] **Given** a `200` response with a new body, **When** received, **Then** the entry's `etag` is updated to the new value

## Technical Notes

- Wires up the `etag?` field already present on `CacheEntry` but unused —
  no schema migration needed, just start populating and reading it.
- Only send `If-None-Match` when both a token and a cached `etag` are
  available; otherwise behave exactly like intent 001.

## Dependencies

### Requires
- 004-authenticated-fetch
- 004-response-cache (intent 001 — the cache module being extended)

### Enables
- 009-auth-aware-degradation

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Cache entry exists but has no `etag` yet (pre-existing intent-001 entries) | Falls back to a normal conditional-free fetch, populates `etag` on response |
| `304` received but local cache entry was evicted since the request started | Treated as a fresh fetch on the next attempt; no crash on missing entry |
| Sign-out happens between request and response | Response is discarded/ignored rather than written into the cache under stale auth assumptions |

## Out of Scope

- Non-authenticated caching behavior (unchanged, intent 001)
