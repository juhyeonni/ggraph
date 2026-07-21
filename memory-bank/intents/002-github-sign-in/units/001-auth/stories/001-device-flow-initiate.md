---
id: 001-device-flow-initiate
unit: 001-auth
intent: 002-github-sign-in
status: complete
priority: must
created: '2026-07-21T04:35:00Z'
assigned_bolt: 004-auth
implemented: true
---

# Story: 001-device-flow-initiate

## User Story

**As a** developer using the extension
**I want** a "Sign in with GitHub" action that starts the OAuth device flow
**So that** I can authorize the extension without pasting a token or a backend

## Acceptance Criteria

- [ ] **Given** I trigger sign-in, **When** the extension requests a device code (`POST https://github.com/login/device/code` with `client_id` + `scope`), **Then** it receives `device_code`, `user_code`, `verification_uri`, `expires_in`, and `interval`
- [ ] **Given** a device code response, **When** displayed, **Then** the user sees the `user_code` and a clickable link to `verification_uri`
- [ ] **Given** the request is made, **When** inspected, **Then** no `client_secret` is present anywhere in the request or extension code
- [ ] **Given** the device-code request fails (network/5xx), **When** it happens, **Then** the sign-in UI shows a retry option instead of a silent failure

## Technical Notes

- New module (e.g. `lib/github/auth.ts`) analogous in style to
  `lib/github/fetch-commits.ts`: typed request/response, no `any`.
- `client_id` is a build-time config constant (see requirements.md
  Assumptions — a real value requires a maintainer-registered OAuth App).
- Requires `scope=repo` (see requirements.md Open Questions — default,
  Construction may narrow).
- Runs from wherever story 002's polling runs (background service worker
  is the resolved default — see unit-brief Technical Context).

## Dependencies

### Requires
- None (first story in this unit)

### Enables
- 002-device-flow-poll

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| `client_id` not configured (dev/test build) | Sign-in action disabled or clearly labeled as unconfigured, no crash |
| Device-code endpoint returns malformed JSON | Typed parse failure surfaces as a retryable error, no throw into host page |
| User triggers sign-in twice in a row | Second request cancels/replaces the first session, no duplicate polling |

## Out of Scope

- Polling for the token (002), token storage (003)
