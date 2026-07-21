---
unit: 001-release
intent: 003-release-hardening
unit_type: frontend
default_bolt_type: simple-construction-bolt
phase: inception
status: complete
created: '2026-07-21T06:30:00Z'
updated: '2026-07-21T06:45:00Z'
---

# Unit Brief: release

## Purpose

Prove v1.0.0 is ready to ship: verify the roadmap's performance, bundle, and
memory budgets with recorded measurements; add the release-required
Playwright E2E smoke test; audit the "no data leaves the browser" privacy
claim against the actual code; and produce every release artifact buildable
without a Chrome Web Store developer account (manifest fields, listing
content, README, release checklist) — while clearly flagging the steps that
need a maintainer.

## Scope

### In Scope
- Extending `benchmarks/layout-bench.mjs` to also measure the draw stage,
  producing one recorded layout+draw number for ≥500 commits
- A gzip bundle-size script against the production `wxt build` output
- A Playwright E2E suite (new devDependency): loads the built, unpacked
  extension, drives a commits page, asserts the graph renders and one
  interaction works, and measures JS heap growth for the memory budget
- A privacy/security audit document enumerating every outbound request and
  storage write in `lib/` and `entrypoints/`
- `wxt.config.ts` manifest release-readiness: version bump to `1.0.0`, icons
  (16/32/48/128), finalized description
- Chrome Web Store listing content: title/summary/description copy,
  screenshot shot-list, icon asset spec
- `README.md`: install, usage, sign-in, privacy, dev/build
- A release checklist tying together the recorded results above and
  flagging maintainer-only steps

### Out of Scope
- Any new product feature — all functionality from intents 001/002 is
  frozen; this unit verifies and documents, it does not extend
- Chrome Web Store developer-account signup and the actual listing
  submission/review (maintainer action)
- Registering the real GitHub OAuth App / obtaining the production
  `client_id` (maintainer action carried over from intent 002; tracked here
  only as a release-checklist line item)
- Final polished icon/screenshot artwork requiring design input (this unit
  plans a placeholder + generation approach, not bespoke visual design)
- CI/CD wiring (no CI exists yet in this repo; new scripts/tests must run
  locally with a documented command)

---

## Assigned Requirements

| FR | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Performance verification harness (layout + draw) | Must |
| FR-2 | Bundle size budget verification | Must |
| FR-3 | Memory budget verification | Must |
| FR-4 | End-to-end smoke test (Playwright) | Must |
| FR-5 | Privacy & security audit vs. code | Must |
| FR-6 | Manifest release-readiness | Must |
| FR-7 | Chrome Web Store listing assets & metadata | Must |
| FR-8 | README & user documentation | Must |
| FR-9 | Release checklist | Should |

---

## Domain Concepts

### Key Entities
| Entity | Description | Attributes |
|--------|-------------|------------|
| PerfResult | A recorded measurement against a roadmap budget | metric, measuredValue, target, pass, recordedAt |
| PrivacyAuditFinding | One outbound request or storage write found in the code | location (file:line), destination/store, verifiedAgainst |
| ListingContent | Chrome Web Store listing copy + assets plan | title, summary, description, screenshotShotList, iconSpec |
| ReleaseChecklistItem | One step required to ship v1.0.0 | step, owner (engineering \| maintainer), status, evidenceLink |

### Key Operations
| Operation | Description | Inputs | Outputs |
|-----------|-------------|--------|---------|
| runPerfHarness | Extended benchmark: layout + draw on a synthetic ≥500-commit DAG | commit count | PerfResult (time) |
| runBundleSizeCheck | Gzip-measures the production build output | `.output/chrome-mv3/**/*.js` | PerfResult (size) |
| runE2ESmoke | Loads the unpacked extension in Chromium, drives a commits page | built extension, target page/fixture | pass/fail + PerfResult (heap delta) |
| auditPrivacy | Enumerates every `fetch`/`chrome.storage` call in `lib/`+`entrypoints/` | source tree | PrivacyAuditFinding[] |

---

## Story Summary

| Metric | Count |
|--------|-------|
| Total Stories | 10 |
| Must Have | 9 |
| Should Have | 1 |
| Could Have | 0 |

### Stories

| Story ID | Title | Priority | Status |
|----------|-------|----------|--------|
| 001-layout-draw-perf-harness | Measure layout + draw time for ≥500 commits | Must | Planned |
| 002-bundle-size-check | Verify shipped JS gzip size ≤100KB | Must | Planned |
| 003-e2e-extension-load | Playwright loads the built extension and the graph renders | Must | Planned |
| 004-e2e-interaction-smoke | E2E covers one hover/click interaction | Must | Planned |
| 005-memory-heap-budget | Measure extra JS heap on a ≥500-commit graph | Must | Planned |
| 006-privacy-security-audit | Audit "no data leaves the browser" claim against code | Must | Planned |
| 007-manifest-release-readiness | Version bump, icons, finalized manifest fields | Must | Planned |
| 008-store-listing-assets | Chrome Web Store listing copy + shot-list + icon spec | Must | Planned |
| 009-readme-user-docs | README: install, usage, sign-in, privacy, dev/build | Must | Planned |
| 010-release-checklist | Ordered checklist, maintainer-only steps flagged | Should | Planned |

---

## Dependencies

### Depends On
| Unit | Reason |
|------|--------|
| 001-graph-ui (intent 001) | The extension being verified/documented; must be complete |
| 001-auth (intent 002) | The sign-in flow being verified/documented; must be complete |

### Depended By
| Unit | Reason |
|------|--------|
| — | None; this is the last intent before the v1.0.0 exit |

### External Dependencies
| System | Purpose | Risk |
|--------|---------|------|
| Chrome Web Store | Publish target | Medium — developer account + submission/review are maintainer actions outside this unit's control |
| Playwright (new devDependency) | E2E smoke test | Low — mature, widely-used tool; adds install/runtime weight only to devDependencies, not the shipped bundle |
| GitHub commits page (real or fixture) | E2E navigation target | Low–Medium — a live page risks rate-limit/DOM-drift flakiness; a local fixture (Construction's call) avoids it |

---

## Technical Context

### Suggested Technology
Per `standards/tech-stack.md`/`coding-standards.md`: TypeScript strict, WXT,
Preact, pnpm, Biome, Vitest — same stack as intents 001/002. `Playwright` is
the one new devDependency, explicitly named by `coding-standards.md`'s E2E
row and required (not optional) by this release intent. New scripts should
follow the existing `package.json` pattern (`bench`, `test`, `lint`,
`typecheck` — add e.g. `bench:draw`, `bench:bundle-size`, `test:e2e`
alongside them, exact naming left to Construction).

**Resolved open question**: FR-1's harness extends
`benchmarks/layout-bench.mjs` rather than introducing a new tool — the
existing script already measures layout time + heap for a synthetic DAG at
[500, 2000, 10000, 50000] commits; adding a draw-stage measurement to the
same script is the smaller, consistent change.

### Integration Points
| Integration | Type | Protocol |
|-------------|------|----------|
| `.output/chrome-mv3` (build output) | File read | Local filesystem |
| Chromium (via Playwright) | Browser automation | CDP (Chrome DevTools Protocol) under the hood |
| GitHub commits page or local fixture | E2E navigation target | HTTPS or local file/server |

### Data Storage
| Data | Type | Volume | Retention |
|------|------|--------|-----------|
| PerfResult records | Committed file (e.g. script output logged to a markdown/JSON file in the repo) | A handful of numbers | Persistent, updated each time the harness reruns |
| PrivacyAuditFinding records | Committed markdown document | A handful of entries | Persistent, re-audited if `lib/github/`'s network/storage surface changes |

---

## Constraints

- No CI exists in this repo — every new script/test must be runnable
  locally with a documented `pnpm` command.
- `lib/layout/` must stay pure (per `coding-standards.md`) — the perf
  harness drives it from the outside, it does not modify it.
- Manifest changes are release-readiness only (version, icons) — no
  `permissions`/`host_permissions` change beyond what the FR-5 audit
  confirms is actually in use.

---

## Success Criteria

### Functional
- [ ] Layout+draw, bundle-size, and memory-heap numbers are all recorded in
      the repo (not just claimed) and pass their roadmap budgets
- [ ] Playwright E2E suite runs locally, loads the built extension, and
      passes against a commits page (real or fixture)
- [ ] Privacy audit document exists and confirms the "no data leaves the
      browser" claim, or documents and fixes any deviation found
- [ ] README, Chrome Web Store listing content, and release checklist all
      exist and are internally consistent with the recorded/audited results

### Non-Functional
- [ ] Layout+draw <100ms for ≥500 commits (measured)
- [ ] Bundle gzip ≤100KB (measured)
- [ ] Extra heap ≤50MB on a ≥500-commit graph (measured)
- [ ] No new `host_permissions`; no analytics/telemetry found or introduced

### Quality
- [ ] New scripts/tests documented with a runnable `pnpm` command
- [ ] All acceptance criteria met
- [ ] Biome + tsc clean

---

## Bolt Suggestions

| Bolt | Type | Stories | Objective |
|------|------|---------|-----------|
| 007-release | simple | 001, 002 | Performance + bundle-size verification (Node-only) |
| 008-release | simple | 003, 004, 005 | Playwright E2E smoke + memory budget |
| 009-release | simple | 006, 007 | Privacy/security audit + manifest release-readiness |
| 010-release | simple | 008, 009, 010 | Store listing, README, release checklist |

---

## Notes

Biggest risks: E2E flakiness if driven against a live GitHub page (mitigated
by defaulting to a local fixture, see requirements.md Open Questions), and
the bundle/manifest numbers shifting slightly once icons are added in bolt
009-release (mitigated by re-running the FR-2 script after FR-6's manifest
change, before finalizing the release checklist in bolt 010-release).
