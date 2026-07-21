---
id: 008-sign-out
unit: 001-auth
intent: 002-github-sign-in
status: complete
priority: must
created: '2026-07-21T04:35:00Z'
assigned_bolt: 006-auth
implemented: true
---

# Story: 008-sign-out

## User Story

**As a** developer who is signed in
**I want** a clear sign-out control
**So that** I can immediately revert to unauthenticated mode

## Acceptance Criteria

- [ ] **Given** the settings panel signed-in state, **When** sign-out is triggered, **Then** the stored token is cleared from `chrome.storage.local`
- [ ] **Given** sign-out completes, **When** any surface reads auth state, **Then** it immediately reflects signed-out (no stale signed-in UI)
- [ ] **Given** sign-out happens while a commits page is open, **When** it next fetches, **Then** the request is unauthenticated (no leftover `Authorization` header)
- [ ] **Given** sign-out completes, **When** the popup is checked, **Then** it shows the signed-out "Sign in with GitHub" state from story 006

## Technical Notes

- `clearToken()` in the auth module from story 003; simple key removal,
  same pattern as `browser.storage.local.remove` used in
  `lib/github/cache.ts`.
- Cache entries fetched while authenticated (e.g. for a private repo) may
  remain in `chrome.storage` after sign-out — acceptable: no data leaves
  the browser (per NFR privacy model), and a subsequent unauthenticated
  fetch of that same private repo will simply 404 as it does today.

## Dependencies

### Requires
- 003-token-storage
- 006-settings-panel-ui

### Enables
- None

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Sign-out triggered with no token present | No-op, no error |
| Sign-out triggered mid device-flow poll (before token obtained) | Cancels the in-progress polling session |
| Storage removal fails | Fails soft; UI still reflects signed-out optimistically, retried on next read if inconsistent |

## Out of Scope

- Revoking the token server-side via GitHub's API (not required — letting it remain valid but unused is sufficient for this intent's scope)
