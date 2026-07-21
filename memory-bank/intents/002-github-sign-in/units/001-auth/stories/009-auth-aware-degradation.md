---
id: 009-auth-aware-degradation
unit: 001-auth
intent: 002-github-sign-in
status: complete
priority: should
created: '2026-07-21T04:35:00Z'
assigned_bolt: 006-auth
implemented: true
---

# Story: 009-auth-aware-degradation

## User Story

**As a** developer whose token was revoked, or who hits a private repo signed out
**I want** messaging that tells me what's actually wrong
**So that** I know whether to sign in, sign in again, or just wait

## Acceptance Criteria

- [ ] **Given** an authenticated request returns 401, **When** handled, **Then** the stored token is cleared and a "sign in again" notice is shown (extends `degrade()` in `entrypoints/commits.content.ts`), not the generic failure notice from intent 001
- [ ] **Given** a signed-out user views a private repo (404), **When** the notice renders, **Then** it reads distinctly as "sign in to view this repo" rather than the generic not-found handling
- [ ] **Given** a rate-limited response, **When** the notice renders, **Then** it states whether the 60/hr (unauthenticated) or 5,000/hr (authenticated) limit applies
- [ ] **Given** any of the above, **When** rendered, **Then** it reuses the existing single-notice mechanism (`lib/ui/notice.ts`) — no new UI surface, no console spam

## Technical Notes

- Extends the existing `FetchCommitsError`/`degrade()` shape from intent 001
  rather than replacing it — add auth-specific cases alongside
  `not-found`/`rate-limited`/`unknown`.
- Reuses `formatResetIn` (`lib/util/relative-time.ts`) for rate-limit
  messaging, same as intent 001.

## Dependencies

### Requires
- 004-authenticated-fetch
- 005-etag-conditional-requests
- 009-soft-degradation (intent 001 — the degradation path being extended)

### Enables
- None (hardens the authenticated path)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Token revoked mid-session, user has a cached graph | Cached graph still renders (per intent 001's soft-degradation precedent) alongside the "sign in again" notice |
| Both auth-aware and generic failure conditions could apply | Auth-specific message takes precedence when a token is/was present |
| Notice text length in the narrow rail gutter | Stays within the existing notice's `max-width` constraint (`lib/ui/notice.ts`) |

## Out of Scope

- Automatic re-authentication (device flow must be explicitly re-triggered by the user)
