---
id: 004-authenticated-fetch
unit: 001-auth
intent: 002-github-sign-in
status: complete
priority: must
created: '2026-07-21T04:35:00Z'
assigned_bolt: 005-auth
implemented: true
---

# Story: 004-authenticated-fetch

## User Story

**As a** developer who signed in
**I want** commit fetches to use my authenticated session
**So that** I can see private repos and get the 5,000 req/hr rate limit

## Acceptance Criteria

- [ ] **Given** a stored token, **When** `fetchCommits` is called, **Then** the request includes `Authorization: Bearer {token}` (extends `lib/github/fetch-commits.ts` — token passed as a parameter, not read from storage inside the pure fetch function)
- [ ] **Given** a private repo and a signed-in user with access, **When** the commits page loads, **Then** the graph renders exactly as it would for a public repo
- [ ] **Given** a signed-in user without access to a private repo, **When** fetched, **Then** a 404 is returned and surfaced (same shape as intent 001's `not-found` case)
- [ ] **Given** a signed-out user on a private repo, **When** fetched, **Then** the resulting 404 is distinguishable enough for story 009 to show a "sign in to view" notice instead of the generic one
- [ ] **Given** an authenticated request, **When** rate-limited, **Then** the error carries the same `resetAt` shape as intent 001, now against the 5,000/hr budget

## Technical Notes

- Extends `FetchCommitsResult`/`fetchCommits` in
  `lib/github/fetch-commits.ts` with an optional `token` parameter — keeps
  the function pure and testable, matching how `ref`/`depth` already work.
- No change to the function's behavior when `token` is omitted
  (unauthenticated path from intent 001 must be untouched).

## Dependencies

### Requires
- 003-token-storage
- 003-fetch-commits (intent 001 — the function being extended)

### Enables
- 005-etag-conditional-requests, 009-auth-aware-degradation

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Token present but revoked server-side | 401 returned, handled by 009 (token cleared, re-sign-in prompt) |
| Token present but repo is public | Works identically to unauthenticated fetch, just with higher rate limit |
| `depth` requires more pages than `per_page=100` allows | Same pagination behavior as intent 001, now authenticated |

## Out of Scope

- ETag/conditional requests (005), 401 degradation messaging (009)
