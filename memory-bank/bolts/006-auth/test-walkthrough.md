---
stage: test
bolt: 006-auth
created: 2026-07-21T05:17:17Z
---

## Test Report: auth (settings panel + auth-aware degradation)

### Summary

- **Tests**: 130/130 passed (33 new: 14 in `settings-store.test.ts`, 8 in
  `device-session-store.test.ts`, 7 in `degrade.test.ts`, 4 in
  `panel-state.test.ts`; existing 97 from bolts 001–005 unaffected, no
  assertions changed)
- **Coverage**: no rigid percentage (per coding-standards); every new pure
  branch (depth clamp bounds, settings round-trip/corruption, device-session
  round-trip/corruption, all four `decideDegrade` branches, all four
  `computeState` branches) has a dedicated case

### Test Files

- [x] `lib/github/settings-store.test.ts` - `clampDepth` bounds (in-range
      passthrough, clamp below 1, clamp above 2000, rounding, non-finite →
      `DEFAULT_DEPTH`, exact boundary values); `getSettings`/`setCommitDepth`
      round-trip, missing/corrupt/out-of-range-on-read fallback, fail-soft
      read and write
- [x] `lib/github/device-session-store.test.ts` - round-trip, corrupt-entry
      discard, fail-soft read/write/remove — mirrors `token-store.test.ts`'s
      existing coverage style for the same storage pattern
- [x] `lib/github/degrade.test.ts` - `decideDegrade`: signed-in 404 → silent;
      signed-out 404 → "sign in to view private repositories"; 401 →
      "session expired — sign in again" + `clearToken: true`; rate-limited
      → "5,000/hr" text when a token was present, "60/hr" when not, with
      the existing `formatResetIn` reset-time text; unknown error → generic
      fallback notice
- [x] `lib/github/panel-state.test.ts` - `computeState`: token present →
      signed-in (even with a stale device session); no token + a device
      session → device state carrying that session's code/link; no token,
      no session, configured → signed-out; unconfigured → not-configured

### Acceptance Criteria Validation

**006-settings-panel-ui**
- ✅ Unconfigured `client_id` → not-configured state (`computeState` test)
- ✅ Corrupt/missing `chrome.storage` reads fall back to signed-out/default
  rather than an error state (`getToken`/`getDeviceSession`/`getSettings`
  already fail soft to `null`/defaults, each independently tested)
- ✅ Reopened-mid-poll state model: `computeState(null, session)` returns
  the in-progress `device` state carrying the persisted user code/link
- MANUAL-PENDING: the actual popup rendering and interaction (sign-in
  button click, device code displayed inline, live update to signed-in
  while open, visually distinct signed-in state) — needs a loaded
  extension in a real browser; this repo has no Preact-render/WXT-popup
  test harness (`main.tsx` renders on import and is otherwise a thin
  wrapper over the now-tested `computeState`)

**007-commit-depth-setting**
- ✅ Default is `DEFAULT_DEPTH` (200) when nothing is stored
  (`getSettings` test)
- ✅ A changed depth persists to `chrome.storage.local` (`setCommitDepth`
  round-trip test)
- ✅ The next commits-page fetch uses the saved depth — `attach()` in
  `entrypoints/commits.content.ts` reads `getSettings()` and passes
  `settings.commitDepth` into `fetchCommits` (code-reviewed wiring over an
  already-tested read function; no entrypoint test harness, same
  documented gap as bolts 004/005)
- ✅ Invalid/out-of-range input is clamped, not passed through (`clampDepth`
  exhaustive bounds tests)
- ✅ No custom depth ever set behaves exactly like intent 001's 200 default
- ✅ Corrupted/missing setting falls back to `DEFAULT_DEPTH`, never throws
- MANUAL-PENDING: the rendered number input itself (typing, blur-triggered
  clamp-and-persist) — same popup-rendering gap as story 006

**008-sign-out**
- ✅ `clearToken()` removes the stored token (already covered by
  `token-store.test.ts` from bolt 004; called directly by the popup's
  sign-out handler)
- ✅ Any surface re-reading auth state immediately reflects signed-out —
  `computeState(null, null)` → signed-out; the popup also sets this state
  optimistically rather than waiting on a storage round-trip
- ✅ The next fetch after sign-out carries no `Authorization` header —
  already covered by `fetch-commits.test.ts`'s "sends no headers at all
  when no token is provided"; `commits.content.ts` re-reads `getToken()`
  fresh on every `attach()`
- ✅ Sign-out with no token present is a no-op, no error (`clearToken`
  never throws, already tested; removing an absent key is a no-op)
- MANUAL-PENDING: the popup showing signed-out immediately after the
  action (rendering) and the full mid-poll cancel path in
  `entrypoints/background.ts` (generation bump + `clearDeviceSession()` on
  `auth/cancel`) — the poll's own cancellation logic was already unit
  tested in bolt 004's `device-flow.test.ts` (`pollForToken`'s
  `isCancelled`); the background worker's wiring around it has no
  entrypoint test harness, consistent with bolts 004/005

**009-auth-aware-degradation**
- ✅ 401 → token cleared (`clearToken: true`) + "session expired — sign in
  again" notice, not the generic failure text
- ✅ Signed-out 404 → "sign in to view private repositories"; signed-in
  404 → silent (unchanged from intent 001)
- ✅ Rate-limited notice states 60/hr (no token) vs 5,000/hr (token
  present), plus the existing reset-time formatting
- ✅ All paths route through the existing single-notice mechanism —
  `commits.content.ts`'s `degrade()` wrapper only ever calls
  `showNotice`/`clearToken`, no new DOM surface; `noConsole` lint rule
  passing confirms no stray console output
- ✅ A cached graph still renders alongside the "sign in again" notice on a
  mid-session token revoke — by construction: `degrade()` never calls
  `detachRail()`, so the pre-fetch cached render from `attach()` stays on
  screen; the notice is purely additive (unchanged mechanism from intent
  001, exercised by prior bolts' cache-hit paths)

**Cross-cutting**
- ✅ No token/PII logging added — no new `console.*`/`log.*` calls touch
  token or session data; `pnpm lint`'s `noConsole` rule stays clean
- ✅ `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` all clean —
  130/130 tests, 0 lint errors, 0 type errors, build succeeds
  (37.78 kB total, unchanged bundle-budget headroom)

### Issues Found

None.

### Notes

- Intent 002 (`github-sign-in`) is now functionally complete across bolts
  004–006. The one remaining gap across all three bolts is consistent and
  pre-existing: no WXT entrypoint / Preact-render test harness exists in
  this repo, so `entrypoints/background.ts`, `entrypoints/commits.content.ts`,
  and `entrypoints/popup/main.tsx` remain thin, code-reviewed wiring layers
  over fully unit-tested pure logic (`lib/github/*`) rather than
  independently tested themselves. This was already true before this bolt
  (documented in bolts 004/005's test reports) and is unchanged by it —
  the two new pure modules this bolt introduces for exactly that reason are
  `lib/github/degrade.ts` and `lib/github/panel-state.ts`.
- Real end-to-end verification of the full popup (sign-in click through to
  a signed-in badge, the device-code UI, sign-out, and the depth input)
  needs a maintainer-supplied `client_id` and a loaded extension in a real
  browser — the same boundary noted in bolts 004/005's reports.
- Depth control is shown regardless of auth state (see
  `implementation-walkthrough.md`'s Key Decisions) — a deliberate reading
  of story 007's actual acceptance criteria, which don't condition it on
  being signed in.
