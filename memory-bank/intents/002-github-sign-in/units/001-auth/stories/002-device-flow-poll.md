---
id: 002-device-flow-poll
unit: 001-auth
intent: 002-github-sign-in
status: complete
priority: must
created: '2026-07-21T04:35:00Z'
assigned_bolt: 004-auth
implemented: true
---

# Story: 002-device-flow-poll

## User Story

**As a** developer who just started sign-in
**I want** the extension to poll for authorization automatically
**So that** I don't have to do anything after entering the code on GitHub

## Acceptance Criteria

- [ ] **Given** a device code session, **When** polling `POST https://github.com/login/oauth/access_token`, **Then** requests occur no faster than the returned `interval` (default 5s)
- [ ] **Given** a `slow_down` response, **When** received, **Then** the polling interval increases per GitHub's contract (adds 5s) before the next attempt
- [ ] **Given** `authorization_pending`, **When** received, **Then** polling continues silently (no user-visible error)
- [ ] **Given** the user authorizes, **When** the next poll succeeds, **Then** the access token is captured and polling stops immediately
- [ ] **Given** `expired_token` or `access_denied`, **When** received, **Then** polling stops, and the UI shows a clear message with a way to restart sign-in

## Technical Notes

- Pure state-machine function (session + last response → next action) is
  unit-testable without real network calls, mirroring how
  `lib/layout/compute-layout.ts` stays pure — keep GitHub-response parsing
  separate from timer/scheduling code.
- Timer/scheduling lives in the same context resolved for story 001
  (background service worker default).

## Dependencies

### Requires
- 001-device-flow-initiate

### Enables
- 003-token-storage

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Extension reloads mid-poll (browser restart, update) | Polling session is not resumed silently; user must restart sign-in (no stale device_code reuse past `expires_in`) |
| Network drops during a poll | Treated like a transient error; next scheduled poll retries, does not abort the whole session |
| `device_code` expires exactly between polls | Next poll returns `expired_token`, handled per above |

## Out of Scope

- Initiating the device code request (001), persisting the resulting token (003)
