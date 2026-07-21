---
id: 009-release
unit: 001-release
intent: 003-release-hardening
type: simple-construction-bolt
status: complete
stories:
  - 006-privacy-security-audit
  - 007-manifest-release-readiness
created: '2026-07-21T06:50:00Z'
started: '2026-07-21T05:36:33Z'
completed: '2026-07-21T05:56:34Z'
current_stage: null
stages_completed: []
requires_bolts:
  - 006-auth
enables_bolts:
  - 010-release
requires_units:
  - 001-graph-ui
  - 001-auth
blocks: false
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 1
---

## Bolt: 009-release

### Objective

Privacy/security audit + manifest release-readiness (milestone **v1.0.0**):
verify the "no data leaves the browser" claim against the actual code, and
bring `wxt.config.ts`'s manifest to a submittable shape (version 1.0.0,
icons, finalized description matching the audited permissions).

### Stories Included

- [ ] **006-privacy-security-audit**: Audit "no data leaves the browser" claim against code - Priority: Must
- [ ] **007-manifest-release-readiness**: Version bump, icons, finalized manifest fields - Priority: Must

### Expected Outputs

- A written privacy/security audit document enumerating every outbound
  `fetch` and `chrome.storage` call in `lib/`+`entrypoints/`, confirming (or
  fixing deviations from) the "no data leaves the browser" claim
- `wxt.config.ts`/`package.json` updated: `version: "1.0.0"`, `icons` +
  `action.default_icon` populated, `permissions`/`host_permissions` matching
  exactly what the audit found in use

### Dependencies

#### Bolt Dependencies (within intent)

- None (parallelizable with 007-release and 008-release — no shared
  artifacts between them)

#### Unit Dependencies (cross-unit)

- **001-graph-ui** (Required, intent 001): Completed — this bolt audits its
  `lib/github/fetch-commits.ts` and cache usage
- **001-auth** (Required, intent 002): Completed — this bolt audits its
  `lib/github/device-flow.ts`, `token-store.ts`, `settings-store.ts`,
  `device-session-store.ts`; intents 001/002 are both fully complete so this
  dependency is already satisfied

#### Enables (other bolts waiting on this)

- 010-release
