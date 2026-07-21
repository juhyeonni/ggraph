---
stage: implement
bolt: 006-auth
created: 2026-07-21T05:17:17Z
---

## Implementation Walkthrough: auth (settings panel + auth-aware degradation)

### Summary

Replaced the popup placeholder with a stateful Preact settings panel
covering sign-in, sign-out, and commit depth, wired the persisted
commit-depth setting into the commits-page fetch, and split the
degradation branch logic out into a pure, unit-testable function that the
content script's `degrade()` now wraps. Intent 002 is functionally
complete pending a real OAuth `client_id`.

### Structure Overview

Three new small `lib/github/` modules follow the existing
`token-store.ts`/`cache.ts` pattern exactly (typed guard, `chrome.storage.local`
only, fail-soft, no throws): one for the commit-depth setting, one for an
ephemeral device-flow session record, and one pure decision function for
degrade-notice branching. `entrypoints/commits.content.ts` and
`entrypoints/background.ts` are extended, not restructured — both keep
their existing generation-guard/message-protocol shape. The popup
(`entrypoints/popup/main.tsx`) is a single Preact component file (as the
story's technical notes call for — no router, no extra component files),
using `preact/hooks` for state and a `browser.storage.onChanged` listener
as the sole live-update mechanism, covering both "poll succeeds while open"
and "reopened mid-poll" without adding to the `auth/start`/`auth/cancel`
message protocol.

### Completed Work

- [x] `lib/github/settings-store.ts` - `Settings { commitDepth }`,
      `clampDepth` (pure, 1–2000, non-finite → `DEFAULT_DEPTH`),
      `getSettings`/`setCommitDepth` against `chrome.storage.local`
- [x] `lib/github/device-session-store.ts` - `DeviceSession { userCode,
      verificationUri }`, `getDeviceSession`/`setDeviceSession`/
      `clearDeviceSession`, same guard-and-discard pattern as
      `token-store.ts`
- [x] `lib/github/degrade.ts` - `decideDegrade(error, hasToken, now?)`, a
      pure function mapping a `FetchCommitsError` + local auth-state flag
      to a `{ kind: "silent" }` or `{ kind: "notice"; text; clearToken }`
      action
- [x] `entrypoints/commits.content.ts` - `attach()` now also reads
      `getSettings()` and passes `commitDepth` into `fetchCommits`;
      `degrade()` is a thin wrapper that runs `decideDegrade`'s action
      (clears the token when told to, shows a notice unless silent)
- [x] `entrypoints/background.ts` - `startSignIn` persists the device
      session around the poll (cleared on any terminal outcome, guarded
      against a superseded generation clobbering a newer session); the
      `auth/cancel` handler also clears it
- [x] `entrypoints/popup/main.tsx` - full rewrite: a `PanelState`
      discriminated union (loading/not-configured/signed-out/starting/
      device/error/signed-in), computed from `getToken()` +
      `getDeviceSession()` + `isClientIdConfigured()`, re-run on mount and
      on every local storage change; sign-in/cancel/sign-out actions call
      the existing background messages plus `clearToken()` directly; an
      always-visible commit-depth number input clamped on blur

### Key Decisions

- **`degrade()` split into a pure decision function**: `commits.content.ts`
  has no WXT entrypoint test harness in this repo (documented in bolts
  004/005), so the branch logic itself (`decideDegrade`) lives in
  `lib/github/degrade.ts`, fully unit-testable without a DOM or storage
  mock; the content script keeps only the DOM-touching wrapper (clear
  token, show notice).
- **Rate-limit/404 messaging derives `hasToken` from the caller, not a new
  error field**: `attach()` already knows whether it sent a token (the same
  `auth !== null` used to build the request); that boolean is threaded into
  `degrade()`/`decideDegrade` instead of adding anything to
  `FetchCommitsError`, per bolt.md's construction decision.
- **Device-session persisted via storage, not a new message**: rather than
  add a query message (e.g. `auth/status`) for the popup to ask "is a poll
  in progress," the background worker writes the in-progress
  `{ userCode, verificationUri }` to `chrome.storage.local` and clears it
  on any terminal outcome. The popup's existing `browser.storage.onChanged`
  listener (needed anyway for "live update to signed-in") picks this up for
  free — one listener covers both required live-update behaviors.
- **Commit-depth control is shown unconditionally**, not gated on
  signed-in state: story 007's acceptance criteria don't condition it on
  auth state, and the setting is equally meaningful for unauthenticated
  fetches. (The bolt's own shorthand summary grouped it under "signed-in";
  this is a deliberate reading of the actual story text, flagged here for
  visibility.)
- **Clamp applied on both read and write**: `getSettings()` re-clamps
  whatever is stored, not just `setCommitDepth()`, so a value that became
  out-of-range some other way (manual storage edit, a future lowered
  ceiling) is still normalized on every read, not just at the moment it was
  set.
- **Sign-out sets local state optimistically** rather than waiting for a
  storage round trip: `clearToken()` and the `auth/cancel` message run in
  parallel, then the panel sets itself to signed-out directly — satisfying
  "immediately reflects signed-out" without racing the `onChanged` event
  it also listens for.

### Deviations from Plan

None — implementation matches `implementation-plan.md`.

### Dependencies Added

None — no new npm packages; reuses `preact/hooks` (already part of the
installed `preact` package) and the existing `wxt/browser` storage/runtime
APIs.

### Developer Notes

- `entrypoints/background.ts` and `entrypoints/popup/main.tsx` still have
  no dedicated test files (same documented gap as bolts 004/005 — no WXT
  entrypoint/Preact-render test harness in this repo). All of their
  decision logic (`decideDegrade`, `clampDepth`, `getSettings`,
  `getDeviceSession`/`setDeviceSession`/`clearDeviceSession`,
  `computeState`-equivalent branching) is covered by co-located unit tests
  instead; the entrypoints remain thin wiring layers.
- Real end-to-end verification of the sign-in/sign-out/device-code flow
  needs a maintainer-supplied `client_id` and a live browser session, same
  boundary noted in bolts 004/005.
