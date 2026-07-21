---
id: 004-auth
unit: 001-auth
intent: 002-github-sign-in
type: simple-construction-bolt
status: complete
stories:
  - 001-device-flow-initiate
  - 002-device-flow-poll
  - 003-token-storage
created: '2026-07-21T04:40:00Z'
started: '2026-07-21T04:47:59Z'
completed: '2026-07-21T05:01:09Z'
current_stage: null
stages_completed: []
requires_bolts:
  - 003-graph-ui
enables_bolts:
  - 005-auth
requires_units:
  - 001-graph-ui
blocks: false
complexity:
  avg_complexity: 3
  avg_uncertainty: 3
  max_dependencies: 3
  testing_scope: 2
---

## Bolt: 004-auth

### Objective

OAuth Device Flow core (milestone **v0.4**): implement device-code
initiation, token polling per the OAuth Device Authorization Grant, and
token persistence in `chrome.storage.local` — the foundation every
authenticated feature in this intent builds on.

### Stories Included

- [ ] **001-device-flow-initiate**: Start OAuth device flow - Priority: Must
- [ ] **002-device-flow-poll**: Poll for access token - Priority: Must
- [ ] **003-token-storage**: Persist and read the auth token - Priority: Must

### Expected Outputs

- New auth module (e.g. `lib/github/auth.ts`) with `startDeviceFlow`,
  `pollForToken`, `getToken`/`storeToken`/`clearToken`, unit-tested against
  mocked device-flow responses
- Token persisted in `chrome.storage.local`, never `chrome.storage.sync`,
  never logged
- Resolution of the background-worker-vs-content-script polling question
  (default per unit brief: background service worker)

### Dependencies

#### Bolt Dependencies (within intent)

- None (first bolt of this intent)

#### Unit Dependencies (cross-unit)

- **001-graph-ui** (Required, intent 001): Completed — this bolt extends
  its `lib/github/` modules; intent 001 is fully complete so this
  dependency is already satisfied

#### Enables (other bolts waiting on this)

- 005-auth
