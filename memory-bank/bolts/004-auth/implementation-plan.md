---
stage: plan
bolt: 004-auth
created: 2026-07-21T04:55:33Z
---

## Implementation Plan: auth (device flow core)

### Objective

Implement the OAuth Device Authorization Grant core: request a device code,
poll for the access token per GitHub's contract, and persist the resulting
token in `chrome.storage.local`. This is the foundation bolt 005
(authenticated fetch) and bolt 006 (settings panel) build on. No UI, no
authenticated fetch — just the mechanism and a clean API surface.

### Deliverables

- `lib/github/auth-config.ts` — `CLIENT_ID` (placeholder constant),
  `OAUTH_SCOPE` (`"repo"`), `isClientIdConfigured()`
- `lib/github/token-store.ts` — `AuthToken` type
  (`{ access_token, token_type, scope, obtainedAt }`), `getToken`,
  `storeToken`, `clearToken` — `chrome.storage.local` only, corrupt-entry
  discard, mirrors `lib/github/cache.ts`
- `lib/github/device-flow.ts` — `requestDeviceCode()`, `pollOnce()`,
  `nextPollStep()` (pure state machine), `pollForToken()` (cancelable
  scheduling loop with injectable sleep)
- `entrypoints/background.ts` — new WXT background service worker; wires
  `browser.runtime.onMessage` (`auth/start`, `auth/cancel`) to the above,
  runs the poll loop, stores the token on success
- Co-located `*.test.ts` for `device-flow.ts` and `token-store.ts`

### Dependencies

- `wxt/browser` (already used by `cache.ts`) — storage + runtime messaging
- GitHub Device Flow endpoints (`github.com/login/device/code`,
  `github.com/login/oauth/access_token`) — already covered by existing
  `host_permissions`, no manifest change needed
- No new npm dependencies

### Technical Approach

**File layout**: three new `lib/github/` modules (config, token storage,
device flow) plus one new entrypoint, following the existing
`fetch-commits.ts` / `cache.ts` conventions (typed discriminated unions,
fail-soft, no throws).

**Background worker + message protocol**: `entrypoints/background.ts` keeps a
`generation` counter (same pattern as `commits.content.ts`'s SPA-nav
generation guard) so a second `auth/start` invalidates the first session's
poll loop via an `isCancelled` closure — no duplicate polling. Messages:
`{ type: "auth/start" }` → triggers `requestDeviceCode()`, responds with the
session (or a typed error) synchronously via `sendResponse`, then continues
polling in the background and calls `storeToken()` on success;
`{ type: "auth/cancel" }` → bumps the generation, stops the in-flight loop.
Uses the classic `sendResponse` + `return true` idiom (not "return a
Promise") since that is the one pattern that works on both the raw Chrome
callback API and the Firefox/webextension-polyfill API `wxt/browser`
resolves to. "Observe signed-in state" does not need a message at all: any
surface calls `getToken()` directly against `chrome.storage.local`, same as
how `commits.content.ts` reads the cache directly today.

**Poll state machine**: `nextPollStep(outcome, currentIntervalMs)` is a pure
function (no I/O) mapping the last poll's typed outcome
(`pending | slow_down | success | expired | denied | error`) to
`{ action: "wait", intervalMs }` or `{ action: "stop", result }` — directly
unit-testable per the story's technical note. `pollForToken()` wraps it in a
loop with an injectable `sleep` (defaults to `setTimeout`, tests inject an
instant resolver) and an injectable `isCancelled` predicate, checked before
sleeping, after sleeping, and after the network call for responsive
cancellation. A network/parse error during a poll is treated the same as
`pending` (keep the same interval, try again) — matches the story's edge
case that a dropped connection must not abort the whole session.
`ponytail: pollForToken schedules via plain setTimeout inside the MV3
service worker; Chrome may terminate an idle service worker before a long
wait fires, silently ending a session mid-poll. Story 002 already treats
"extension reloads mid-poll" as an acceptable failure (user restarts
sign-in), so this is left as-is; upgrade path if it proves too flaky in
practice is a keepalive ping (e.g. a periodic no-op `chrome.runtime` call)
or moving scheduling to `chrome.alarms` (minute-granularity, would need
its own polling-interval workaround).`

**Token schema + storage key**: `AuthToken = { access_token, token_type,
scope, obtainedAt }` (field names match bolt.md's prescribed shape exactly —
`access_token`/`token_type` mirror GitHub's own response so no renaming
round-trip is needed) stored under key `ggraph:auth:token`
(`ggraph:auth:` prefix, single key — no need for cache.ts's multi-entry
prefix scan/eviction since there is only ever one token). Same
guard-and-discard pattern as `isCacheEntry`/`getCacheEntry`.

**client_id config seam**: `lib/github/auth-config.ts` exports `CLIENT_ID`
as a single named constant with an obvious placeholder value
(`"REPLACE_WITH_GITHUB_OAUTH_CLIENT_ID"`) and a comment pointing at
`github.com/settings/developers`; `isClientIdConfigured()` gates
`requestDeviceCode()` so an unconfigured build fails fast with a typed
`{ kind: "not-configured" }` error instead of firing a request with a fake
id (matches story 001's edge case table).

**Not building this bolt (explicitly out of scope)**: no popup UI trigger
(bolt 006 owns the panel; the message API is directly testable and usable
without one), no authenticated fetch changes, no ETag work, no
`entrypoints/background.test.ts` (WXT's vitest plugin/mocking for
entrypoints isn't set up in this repo — same reason `commits.content.ts`
has no test today; the background worker is a thin wiring layer over
already-tested `lib/github/` functions).

### Acceptance Criteria

- [ ] Device-code request POSTs `client_id` + `scope` (no `client_secret`
      anywhere) and returns a typed session (`deviceCode`, `userCode`,
      `verificationUri`, `intervalMs`) or a typed, retryable error
- [ ] An unconfigured `client_id` is detected before any network call and
      surfaced as a typed error, not a crash
- [ ] Polling never fires faster than the server's `interval`; `slow_down`
      adds 5s; `authorization_pending` continues silently;
      `expired_token`/`access_denied` stop with a typed, distinguishable
      result; success stops immediately with the token
      captured
- [ ] A dropped network call during polling is treated as transient
      (session continues, does not abort)
- [ ] Polling is cancelable, and starting a second device-flow session
      cancels/replaces the first (no duplicate polling)
- [ ] Token persists only in `chrome.storage.local` (never `.sync`), is
      readable by any surface via `getToken()`, survives a simulated
      restart (fresh module import in a test), and is never passed to
      `log.error`
- [ ] A corrupt stored token is treated as signed-out and removed
- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` all clean; `pnpm test`
      all green
