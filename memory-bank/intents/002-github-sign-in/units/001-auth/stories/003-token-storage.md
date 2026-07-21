---
id: 003-token-storage
unit: 001-auth
intent: 002-github-sign-in
status: complete
priority: must
created: '2026-07-21T04:35:00Z'
assigned_bolt: 004-auth
implemented: true
---

# Story: 003-token-storage

## User Story

**As a** developer who signed in
**I want** my session to persist across browser restarts
**So that** I don't have to sign in again every time I open Chrome

## Acceptance Criteria

- [ ] **Given** a successful token response, **When** received, **Then** it is persisted in `chrome.storage.local` (never `chrome.storage.sync`)
- [ ] **Given** a stored token, **When** the extension starts, **Then** every surface (content script, popup) can read signed-in state from it
- [ ] **Given** any code path handling the token, **When** it runs, **Then** the token value is never passed to `log.error` or any console output
- [ ] **Given** the browser restarts, **When** the extension reloads, **Then** the previously stored token is still present and usable

## Technical Notes

- New storage helper following the exact pattern of
  `lib/github/cache.ts` (`browser.storage.local.get/set`, typed guard
  function like `isCacheEntry`, single key prefix e.g. `ggraph:auth`).
- Store `{ access_token, token_type, scope, obtainedAt }`; keep the shape
  minimal — no need for a refresh token (GitHub Device Flow tokens don't
  expire by default).

## Dependencies

### Requires
- 002-device-flow-poll

### Enables
- 004-authenticated-fetch, 006-settings-panel-ui, 008-sign-out

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| `chrome.storage.local` write fails (quota/error) | Fails soft — sign-in reports failure, no partial/corrupt token state |
| Stored value is malformed (manual edit, corruption) | Treated as signed-out, corrupt entry removed, mirrors `getCacheEntry`'s guard-and-remove pattern |
| Multiple tabs open during sign-in | All tabs observe the same signed-in state once storage write completes |

## Out of Scope

- Clearing the token (008-sign-out), using the token in fetch requests (004)
