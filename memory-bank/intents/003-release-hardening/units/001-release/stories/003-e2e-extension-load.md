---
id: 003-e2e-extension-load
unit: 001-release
intent: 003-release-hardening
status: complete
priority: must
created: '2026-07-21T06:35:00Z'
assigned_bolt: 008-release
implemented: true
---

# Story: 003-e2e-extension-load

## User Story

**As a** maintainer preparing the v1.0.0 release
**I want** an automated test that loads the real built extension and confirms the graph renders
**So that** breakage is caught before real users see it, satisfying the roadmap's required (not optional) E2E smoke test

## Acceptance Criteria

- [ ] **Given** a production build exists (`pnpm build`), **When** the E2E test runs, **Then** Playwright launches a persistent Chromium context with the unpacked extension (`.output/chrome-mv3`) loaded
- [ ] **Given** the extension is loaded, **When** the test navigates to a commits page (real public repo or local fixture, per requirements.md Open Questions), **Then** the injected graph canvas appears in the DOM within a bounded wait (e.g. a few seconds, not an indefinite hang)
- [ ] **Given** the test suite, **When** run via a documented command (e.g. `pnpm test:e2e`), **Then** it completes without requiring manual browser interaction
- [ ] **Given** the test fails to find the canvas, **When** it reports failure, **Then** the failure message identifies what was expected vs. found (not a generic timeout with no context)

## Technical Notes

- `@playwright/test` is a new devDependency — the one new dependency this
  intent introduces (named explicitly by `coding-standards.md`'s E2E row).
- Loading an unpacked MV3 extension in Playwright requires a persistent
  context (`chromium.launchPersistentContext`) with
  `--disable-extensions-except`/`--load-extension` args — standard
  Playwright + Chrome extension pattern.
- If a local HTML fixture is chosen over a live page (see requirements.md
  Open Questions), it must reproduce the real commits-page DOM shape
  closely enough for the content script's selectors (`lib/github/selectors.ts`)
  to find their injection point.

## Dependencies

### Requires
- None (first story of this bolt; depends only on the already-complete
  build from intents 001/002)

### Enables
- 004-e2e-interaction-smoke (same test session, adds an interaction check)
- 005-memory-heap-budget (same harness, adds heap measurement)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Real public repo page used and it's rate-limited (60 req/hr unauthenticated) | Test either uses a low-traffic repo/caches responses, or Construction chooses the local-fixture default instead |
| Extension build is stale (forgot `pnpm build` before running E2E) | Test fails clearly rather than silently testing an old build; document the required build step in the test's own setup or a pretest script |
| Chromium version mismatch with MV3 extension APIs | Pin a Playwright/Chromium version known to support MV3 unpacked loading |

## Out of Scope

- The interaction assertion itself (004), heap measurement (005)
- CI wiring (no CI exists yet in this repo, per requirements.md Scope)
