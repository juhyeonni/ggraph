---
id: 010-release
unit: 001-release
intent: 003-release-hardening
type: simple-construction-bolt
status: complete
stories:
  - 008-store-listing-assets
  - 009-readme-user-docs
  - 010-release-checklist
created: '2026-07-21T06:50:00Z'
started: '2026-07-21T05:56:30Z'
completed: '2026-07-21T06:04:14Z'
current_stage: null
stages_completed: []
requires_bolts:
  - 007-release
  - 008-release
  - 009-release
enables_bolts: []
requires_units: []
blocks: true
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 1
---

## Bolt: 010-release

### Objective

Store listing, README, and release checklist (milestone **v1.0.0**):
synthesize the recorded results from 007-release, 008-release, and
009-release into the Chrome Web Store listing content, the project README,
and a single ordered release checklist that clearly separates
engineering-complete work from maintainer-only steps. Completes intent 003
and the v1.0.0 milestone (short of the actual store submission).

### Stories Included

- [ ] **008-store-listing-assets**: Chrome Web Store listing copy + shot-list + icon spec - Priority: Must
- [ ] **009-readme-user-docs**: README: install, usage, sign-in, privacy, dev/build - Priority: Must
- [ ] **010-release-checklist**: Ordered checklist, maintainer-only steps flagged - Priority: Should

### Expected Outputs

- A Chrome Web Store listing-content document: title/summary/description
  copy, screenshot shot-list, icon asset spec, privacy disclosure consistent
  with 009-release's audit
- `README.md`: install, usage, sign-in, privacy, development/build sections
- A release checklist document citing every recorded result from
  007/008/009-release, with maintainer-only steps (real OAuth `client_id`,
  Chrome Web Store developer account, submission, review) unambiguously
  labeled

### Dependencies

#### Bolt Dependencies (within intent)

- **007-release** (Required): Planned — cites its recorded perf/bundle
  numbers
- **008-release** (Required): Planned — cites its E2E pass/fail and heap
  measurement
- **009-release** (Required): Planned — consumes its privacy audit and
  manifest/icon work directly

#### Unit Dependencies (cross-unit)

- None (all dependencies are within this unit, captured above)

#### Enables (other bolts waiting on this)

- None (last bolt of intent 003; the v1.0.0 exit is the actual Chrome Web
  Store submission, a maintainer action this bolt's checklist surfaces but
  does not perform)
