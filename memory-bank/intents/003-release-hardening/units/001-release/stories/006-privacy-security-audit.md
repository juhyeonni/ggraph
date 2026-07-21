---
id: 006-privacy-security-audit
unit: 001-release
intent: 003-release-hardening
status: complete
priority: must
created: '2026-07-21T06:35:00Z'
assigned_bolt: 009-release
implemented: true
---

# Story: 006-privacy-security-audit

## User Story

**As a** maintainer preparing the v1.0.0 release
**I want** a written audit confirming "no data leaves the browser" against the actual code
**So that** the Chrome Web Store privacy disclosure is backed by evidence, not a marketing claim

## Acceptance Criteria

- [ ] **Given** every `fetch(...)` call in `lib/` and `entrypoints/`, **When** enumerated, **Then** each is listed with its file:line and destination host, confirming only `api.github.com` (`lib/github/fetch-commits.ts`) and `github.com` (`lib/github/device-flow.ts` device-flow endpoints) appear
- [ ] **Given** every `chrome.storage`/`browser.storage` read/write, **When** enumerated, **Then** each is confirmed to use `.local` only, never `.sync` (per `lib/github/cache.ts`, `lib/github/token-store.ts`, `lib/github/settings-store.ts`, `lib/github/device-session-store.ts`)
- [ ] **Given** the codebase, **When** searched for analytics/telemetry/third-party SDK usage (e.g. Sentry, Google Analytics, Mixpanel), **Then** the audit confirms zero matches
- [ ] **Given** a deviation is found (unexpected host, `.sync` usage, or telemetry), **When** discovered, **Then** it is either fixed in code before the audit is finalized, or the disclosure text is written to match the actual (not the intended) behavior — never the reverse

## Technical Notes

- This is primarily a documentation/verification story, not new code — the
  main output is a written audit document (e.g.
  `memory-bank/intents/003-release-hardening/units/001-release/privacy-audit.md`
  or directly the store-listing privacy section in story 008).
- A grep-based sweep (`fetch(`, `chrome.storage`, `browser.storage`) across
  `lib/` and `entrypoints/` is sufficient given the codebase's small size —
  no static-analysis tooling needed for this.
- Cross-reference against `wxt.config.ts`'s `host_permissions` — the
  permissions requested should match exactly what the audit finds in use.

## Dependencies

### Requires
- None (reads existing code from intents 001/002, already complete)

### Enables
- 007-manifest-release-readiness (permissions must match this audit)
- 008-store-listing-assets (privacy disclosure text derives from this audit)
- 009-readme-user-docs (privacy section derives from this audit)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| A `fetch` call is found to an unexpected host | Investigated and either removed/fixed, or explicitly justified and disclosed — not silently omitted from the audit |
| `chrome.storage.sync` usage is found anywhere | Flagged as a finding requiring a fix before this story is considered done — the requirements explicitly forbid `.sync` for token/settings data |
| No deviations found (expected outcome based on preliminary review) | Audit still documents the sweep methodology and positive result, not just "nothing to see here" |

## Out of Scope

- Fixing unrelated code-quality issues found incidentally during the sweep (log as a note, don't scope-creep into refactoring)
- Third-party dependency audit (e.g. `preact`, `wxt` supply-chain review) — this audit covers this codebase's own outbound behavior, not its dependencies' behavior
