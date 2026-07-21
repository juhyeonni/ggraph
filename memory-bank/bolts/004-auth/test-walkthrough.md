---
stage: test
bolt: 004-auth
created: 2026-07-21T04:55:33Z
---

## Test Report: auth (device flow core)

### Summary

- **Tests**: 88/88 passed (34 new: 24 in `device-flow.test.ts`, 10 in
  `token-store.test.ts`; existing 54 from prior bolts unaffected)
- **Coverage**: no rigid percentage tracked (per coding-standards); every
  branch of `requestDeviceCode`, `pollOnce`, `nextPollStep`, `pollForToken`,
  and the token-store guard/round-trip paths has a dedicated case

### Test Files

- [x] `lib/github/device-flow.test.ts` - device-code request shape
      (`client_id`+`scope`, no `client_secret`, not-configured short-circuit,
      network/malformed errors), poll response parsing (`pending`,
      `slow_down`, `expired_token`, `access_denied`, success, unrecognized/
      network error), the pure `nextPollStep` state machine, and the
      `pollForToken` scheduling loop (interval respected, `slow_down` backoff,
      cancellation before and mid-loop)
- [x] `lib/github/token-store.test.ts` - round-trip store/read, corrupt-entry
      discard, storage-key prefix, write-failure fail-soft, `clearToken`
      never-throws, and an explicit assertion that `chrome.storage.sync` is
      never called

### Acceptance Criteria Validation

**001-device-flow-initiate**
- ✅ Device-code request POSTs `client_id`+`scope`, no `client_secret`
  present anywhere in the request
- ✅ Response parsed into `userCode`+`verificationUri` (display is bolt 006;
  data is available)
- ✅ No `client_secret` anywhere in request or code (asserted directly on
  the sent `URLSearchParams` keys)
- ✅ Failed/malformed device-code request returns a typed, retryable error
  (caller can call `requestDeviceCode()` again) instead of throwing
- ✅ Unconfigured `client_id` -> typed `not-configured` error, no request
  fired, no crash
- MANUAL-PENDING: a real end-to-end device-code request against a
  registered GitHub OAuth App (needs a real `client_id`)

**002-device-flow-poll**
- ✅ Polling never fires faster than the server `interval` (`pollForToken`
  always sleeps before each attempt)
- ✅ `slow_down` adds 5s to the interval before the next attempt
- ✅ `authorization_pending` continues polling silently
- ✅ Success stops immediately and captures the token
- ✅ `expired_token`/`access_denied` stop with a distinct, typed result
- ✅ A dropped network call during polling is treated as transient (same as
  pending; the session is not aborted)
- ✅ Polling is cancelable (`isCancelled`, checked before sleep, after
  sleep, and after the network call) and a cancelled session ignores
  further queued/in-flight responses
- MANUAL-PENDING: `entrypoints/background.ts`'s generation-counter
  wiring (real `runtime.onMessage` dispatch, a second `auth/start`
  cancelling the first session) — needs a loaded browser extension; this
  repo has no WXT entrypoint test harness configured (same gap as
  `commits.content.ts`)

**003-token-storage**
- ✅ Successful token persisted in `chrome.storage.local`
- ✅ Never written to/read from `chrome.storage.sync` (explicit spy
  assertion)
- ✅ Token never passed to `log.error` (nothing in `token-store.ts` or
  `device-flow.ts` logs; only `entrypoints/background.ts` calls
  `log.error`, and only with a plain diagnostic string, never the token)
- ✅ Token round-trips a simulated restart (fresh `getToken()` call sees
  the persisted value)
- ✅ Corrupt stored entry is discarded and removed (treated as signed-out)
- ✅ A failing write fails soft (`storeToken` returns `false`, no partial
  entry left behind)

### Issues Found

None. `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` all clean on
the final state.

### Notes

- `entrypoints/background.ts` is intentionally untested directly (see
  Developer Notes in `implementation-walkthrough.md`): all branching logic
  lives in the tested `lib/github/` modules, and the background worker is a
  thin `runtime.onMessage` wire-up.
- Real end-to-end verification (a live device-code + polling round trip
  against GitHub) requires a maintainer-registered OAuth App's `client_id`
  in place of the placeholder — out of reach for this bolt, consistent with
  the intent's documented assumption.
