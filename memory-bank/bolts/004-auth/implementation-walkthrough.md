---
stage: implement
bolt: 004-auth
created: 2026-07-21T04:55:33Z
---

## Implementation Walkthrough: auth (device flow core)

### Summary

Added the OAuth Device Authorization Grant core: a config seam for the
public `client_id`, a device-code/poll module, and a `chrome.storage.local`
token store, wired together by a new background service worker that a
future popup can trigger over `runtime.onMessage`.

### Structure Overview

Three new modules under `lib/github/` follow the existing
`fetch-commits.ts`/`cache.ts` conventions (typed discriminated unions,
fail-soft, no throws): configuration, the device-flow request/poll/state
machine, and token persistence. One new WXT entrypoint,
`entrypoints/background.ts`, is the only code that talks to `browser.runtime`
directly — it is a thin wiring layer, not where any decision logic lives.

### Completed Work

- [x] `lib/github/auth-config.ts` - `CLIENT_ID` placeholder constant,
      `OAUTH_SCOPE`, and `isClientIdConfigured()`
- [x] `lib/github/token-store.ts` - `AuthToken` type and
      `getToken`/`storeToken`/`clearToken` against `chrome.storage.local`,
      with corrupt-entry guard-and-discard
- [x] `lib/github/device-flow.ts` - `requestDeviceCode()` (device-code POST),
      `pollOnce()` (single access-token POST + response parsing),
      `nextPollStep()` (pure poll state machine), `pollForToken()`
      (cancelable scheduling loop with an injectable sleep function)
- [x] `entrypoints/background.ts` - new background service worker; handles
      `auth/start` and `auth/cancel` messages, runs the poll loop, persists
      the token on success

### Key Decisions

- **Message protocol kept minimal**: only `auth/start` and `auth/cancel`.
  "Observe signed-in state" doesn't need a message — any surface reads
  `getToken()` directly, the same way `commits.content.ts` already reads the
  cache directly.
- **Classic `sendResponse` + `return true`, not a returned Promise**: this is
  the one message-response idiom that works whether `wxt/browser` resolves
  to the raw Chrome callback API or the Firefox/webextension-polyfill API.
- **Generation counter for cancellation**: reused the same pattern already
  in `commits.content.ts` (an incrementing counter captured in a closure) so
  a second `auth/start` invalidates the first session's poll loop instead of
  introducing a new abstraction.
- **`pollForToken` takes an injectable `sleep`/`isCancelled`**: keeps the
  scheduling loop itself pure/testable without real timers, while still
  defaulting to real `setTimeout` in production.
- **No client-side device-code expiry tracking**: relies on the server's
  `expired_token` response, per the story's own edge-case table, instead of
  a redundant local timer.
- **Token field names match the bolt's prescribed shape exactly**
  (`access_token`/`token_type`/`scope`/`obtainedAt`) rather than converting
  to camelCase, since they mirror GitHub's own response fields one-to-one.

### Deviations from Plan

None.

### Dependencies Added

None — everything uses `wxt/browser`, already a project dependency.

### Developer Notes

- `entrypoints/background.ts` has no dedicated test file; this repo has no
  WXT vitest/mocking setup for entrypoints (mirrors `commits.content.ts`,
  which is also untested directly). All decision logic lives in the tested
  `lib/github/` modules; the background worker only wires messages to them.
- `CLIENT_ID` is a placeholder (`REPLACE_WITH_GITHUB_OAUTH_CLIENT_ID`); a
  maintainer must register a GitHub OAuth App and replace it before any real
  end-to-end sign-in is possible.
- A known MV3 service-worker idle-timeout ceiling on the poll loop is
  flagged with a `ponytail:` comment in `device-flow.ts`.
