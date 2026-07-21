---
stage: plan
bolt: 006-auth
created: 2026-07-21T05:17:17Z
---

## Implementation Plan: auth (settings panel + auth-aware degradation)

### Objective

Replace the popup placeholder with a stateful Preact settings panel
(sign-in/out, commit depth), wire the persisted commit-depth setting into
`fetchCommits`, and extend `degrade()` with 401/rate-limit/signed-out-404
messaging derived from local auth state — without changing any signed-in
404 or unauthenticated-baseline behavior from intents 001/bolt 005.
Completes intent 002 (v0.4).

### Deliverables

- `lib/github/settings-store.ts` (new) — `Settings { commitDepth }`,
  `clampDepth` (pure, 1–2000), `getSettings`/`setCommitDepth`
  (`chrome.storage.local`, fail-soft, mirrors `token-store.ts`)
- `lib/github/device-session-store.ts` (new) — `DeviceSession { userCode,
  verificationUri }`, `getDeviceSession`/`setDeviceSession`/
  `clearDeviceSession`, same storage pattern, so a reopened popup can show
  an in-progress device code (story 006's edge case) via existing
  `browser.storage.onChanged`, without a new message type
- `lib/github/degrade.ts` (new) — `decideDegrade(error, hasToken, now?)`, a
  pure function returning `{ kind: "silent" } | { kind: "notice"; text;
  clearToken }`; isolates the branch logic from DOM/notice wiring so it is
  directly unit-testable (`commits.content.ts` has no test harness, per
  bolts 004/005's documented WXT-entrypoint gap)
- `entrypoints/commits.content.ts` (modify) — reads `getSettings()`
  alongside the existing cache/token reads and passes `commitDepth` into
  `fetchCommits`; `degrade()` becomes a thin wrapper over `decideDegrade`
  that clears the token and/or shows a notice
- `entrypoints/background.ts` (modify) — `startSignIn` persists/clears the
  device session around the poll so a reopened popup can read it; the
  `auth/cancel` handler also clears it
- `entrypoints/popup/main.tsx` (rewrite) — stateful panel: signed-out /
  not-configured / starting / device-code / error / signed-in states, plus
  an always-visible commit-depth number input; live-updates via
  `browser.storage.onChanged` (no new background messages beyond the
  existing `auth/start`/`auth/cancel`)
- New co-located tests: `settings-store.test.ts`, `device-session-store.test.ts`,
  `degrade.test.ts`

### Dependencies

- `lib/github/token-store.ts`, `lib/github/device-flow.ts`,
  `lib/github/auth-config.ts` (bolt 004) — read-only reuse
- `lib/github/fetch-commits.ts`'s `DEFAULT_DEPTH`, `unauthorized` error kind
  (bolt 005) — read-only reuse
- `lib/ui/notice.ts` (`showNotice`/`removeNotice`) — reused as-is, no changes
- No new npm dependencies, no manifest/host_permission changes

### Technical Approach

**State model (popup)**: a single discriminated union
`PanelState = { kind: "loading" | "not-configured" | "signed-out" |
"starting" | "error" | "signed-in" } | { kind: "device"; userCode;
verificationUri }`, computed by one pure `computeState(token,
deviceSession)` helper from `getToken()` + `getDeviceSession()` +
`isClientIdConfigured()`. Re-run on mount and on every
`browser.storage.onChanged` (`area === "local"`) event — this single
listener covers both "poll succeeds while popup is open" (token appears)
and "popup reopened mid-poll" (device session already present), with no
new message protocol.

**Message protocol**: unchanged — `auth/start`/`auth/cancel` only. Sign-in
click sends `auth/start` and applies its `DeviceCodeResult` response
directly (session known immediately since the popup itself triggered it).
Sign-out sends `auth/cancel` (safe no-op if nothing is in flight) and calls
`clearToken()` directly, then optimistically sets state to signed-out (not
waiting for the storage round-trip) — satisfies "sign-out immediately
reflects signed-out" without a race against `onChanged`.

**Device-session persistence**: `startSignIn()` in `background.ts` writes
`{ userCode, verificationUri }` via `setDeviceSession()` right after
`requestDeviceCode()` succeeds, and clears it when the poll reaches any
terminal outcome (success or failure) — guarded on `gen === generation` so
a superseded (cancelled) poll's completion never clobbers a newer session's
data. `auth/cancel` also clears it directly.

**Commit-depth clamp**: single guard point, `clampDepth()` in
`settings-store.ts`, used by both `setCommitDepth()` (write path) and
`getSettings()` (read path, so a corrupted/out-of-range stored value is
also normalized on read, never just on write). Bounds 1–2000 per bolt.md;
non-finite input falls back to `DEFAULT_DEPTH`.

**Depth control placement**: shown unconditionally in the panel (not
gated on signed-in state) — story 007's AC is "given the settings panel,
when opened, a commit-depth control is shown," with no signed-in
precondition, and depth applies to unauthenticated fetches too. Flagging
this as a deliberate reading since the bolt summary's shorthand grouped it
under "signed-in."

**`degrade()` split**: `decideDegrade(error, hasToken, now)` is pure
(no DOM, no storage) and returns an action; `commits.content.ts`'s
`degrade()` wrapper executes that action (`void clearToken()` if
requested, `showNotice(...)` unless `silent`). Branches:
  - `not-found` + `hasToken` → `silent` (signed-in 404: unchanged from
    intent 001)
  - `not-found` + `!hasToken` → notice "sign in to view private
    repositories"
  - `unauthorized` → notice "session expired — sign in again" +
    `clearToken: true`
  - `rate-limited` → notice text names "5,000/hr" when `hasToken` else
    "60/hr", plus the existing `formatResetIn` reset time
  - `unknown` → unchanged generic notice
`hasToken` is `auth !== null` at the call site in `attach()` — the same
value already used to decide whether the request itself carried a token,
per bolt.md's "derive from local auth state, don't add an error field."

**Depth wiring in `commits.content.ts`**: `attach()`'s existing
`Promise.all([getCacheEntry(...), getToken()])` gains a third member,
`getSettings()`; the `fetchCommits(...)` call's `depth` argument changes
from `undefined` (implicit `DEFAULT_DEPTH`) to `settings.commitDepth`.

### Acceptance Criteria

**006-settings-panel-ui**
- [ ] Signed-out popup shows a "Sign in with GitHub" action
- [ ] Once a device code is available, the popup shows the user code and
      verification link inline
- [ ] When the poll succeeds while the popup is open, it updates to
      signed-in without being closed/reopened
- [ ] Signed-in popup shows a distinctly different state from signed-out
- [ ] Reopening the popup mid-poll shows the in-progress code, not a fresh
      prompt
- [ ] `chrome.storage` read failure falls back to signed-out UI, not an
      error state
- [ ] Unconfigured `client_id` shows a clear "not configured" message
      instead of a broken flow

**007-commit-depth-setting**
- [ ] A commit-depth control is shown, defaulting to `DEFAULT_DEPTH` (200)
- [ ] Changing it persists to `chrome.storage.local`
- [ ] The next commits-page fetch uses the saved depth
- [ ] Invalid/out-of-range input (≤0, absurdly large) is clamped to 1–2000
- [ ] No custom depth ever set → behaves exactly like intent 001 (200)
- [ ] Corrupted/missing setting on read → falls back to `DEFAULT_DEPTH`,
      never throws

**008-sign-out**
- [ ] Sign-out clears the stored token from `chrome.storage.local`
- [ ] Any surface reading auth state immediately reflects signed-out
- [ ] The next commits-page fetch after sign-out carries no `Authorization`
      header
- [ ] The popup shows the signed-out state right after sign-out
- [ ] Sign-out with no token present is a no-op, no error
- [ ] Sign-out mid device-flow poll cancels the in-progress polling session

**009-auth-aware-degradation**
- [ ] 401 clears the token and shows "session expired — sign in again"
      (not the generic failure notice)
- [ ] Signed-out 404 reads distinctly as "sign in to view private
      repositories"; signed-in 404 stays a silent no-op
- [ ] Rate-limited notice states whether the 60/hr or 5,000/hr limit
      applies
- [ ] All of the above reuse `lib/ui/notice.ts` — no new UI surface, no
      console output
- [ ] A cached graph still renders alongside the "sign in again" notice
      when a token is revoked mid-session

**Cross-cutting**
- [ ] Never log the token or any PII
- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` clean; all existing
      `pnpm test` (97) plus new tests green
