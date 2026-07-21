---
id: 006-auth
unit: 001-auth
intent: 002-github-sign-in
type: simple-construction-bolt
status: complete
stories:
  - 006-settings-panel-ui
  - 007-commit-depth-setting
  - 008-sign-out
  - 009-auth-aware-degradation
created: '2026-07-21T04:40:00Z'
started: '2026-07-21T05:10:00Z'
completed: '2026-07-21T05:24:56Z'
current_stage: null
stages_completed: []
requires_bolts:
  - 005-auth
enables_bolts: []
requires_units: []
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

## Bolt: 006-auth

### Objective

Settings panel & auth-aware lifecycle (milestone **v0.4**): a Preact
settings panel (sign-in/out, commit depth) replacing the current popup
placeholder, and degradation messaging that distinguishes token-revoked and
authenticated-vs-unauthenticated rate-limit cases. Completes intent 002.

### Stories Included

- [ ] **006-settings-panel-ui**: Settings panel: sign-in/out - Priority: Must
- [ ] **007-commit-depth-setting**: Configurable commit depth - Priority: Should
- [ ] **008-sign-out**: Sign out clears session - Priority: Must
- [ ] **009-auth-aware-degradation**: Auth-aware degradation & messaging - Priority: Should

### Expected Outputs

- `entrypoints/popup/` rendering a stateful settings panel (sign-in/out,
  commit-depth control) in place of the current placeholder
- Commit-depth setting wired into the `fetchCommits` call in
  `entrypoints/commits.content.ts`
- Sign-out flow clearing the token and reverting to unauthenticated
  behavior immediately
- `degrade()` extended with 401 ("sign in again") and rate-limit-type-aware
  messaging, reusing `lib/ui/notice.ts`

### Construction Decisions (resolved from inception caveats, 2026-07-21)

- **Signed-out 404**: GitHub returns identical 404 for missing vs
  private-no-access repos. When signed OUT, ANY 404 shows a "sign in to view
  private repositories" notice (deliberate, scoped behavior change from intent
  001's silent-404 — applies to the signed-out path only). When signed IN, a
  404 stays a silent no-op as today (genuine not-found).
- **Rate-limit 60 vs 5000 messaging**: do NOT add a field to
  `FetchCommitsError`. `degrade()` (or its caller in commits.content.ts) derives
  which limit applies from local auth state (token present ⇒ 5,000/hr, else
  60/hr), since the caller already knows whether it sent a token.
- **Commit-depth clamp bounds**: 1–2000 (invalid/out-of-range values clamped).

### Dependencies

#### Bolt Dependencies (within intent)

- **005-auth** (Required): Planned

#### Unit Dependencies (cross-unit)

- None

#### Enables (other bolts waiting on this)

- None (intent complete)
