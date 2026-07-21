---
intent: 003-release-hardening
phase: inception
status: complete
created: '2026-07-21T06:00:00Z'
updated: '2026-07-21T06:20:00Z'
---

# Requirements: Release Hardening

## Intent Overview

Ship v1.0.0 on the Chrome Web Store. This intent adds no new product
capability — every user-facing feature is frozen at whatever intents 001
(`commit-graph-on-commits-page`) and 002 (`github-sign-in`) already built.
Instead it **verifies** the roadmap's performance/bundle/memory budgets with
recorded measurements (not assumptions), adds the Playwright E2E smoke test
the roadmap requires for release (optional everywhere else per
`coding-standards.md`, mandatory here), audits the "no data leaves the
browser" privacy claim against the actual code, and produces the Chrome Web
Store listing content, README/user docs, manifest release-readiness
(version/icons), and a release checklist. The actual Chrome Web Store
developer-account signup and listing submission/review are maintainer
actions this intent surfaces but does not perform (see Assumptions).

Covers roadmap milestone **v1.0.0 (Release)**. Requires intents 001 and 002
complete — both are (bolts 001–006, all `status: complete`).

## Business Goals

| Goal | Success Metric | Priority |
|------|----------------|----------|
| Ship v1.0.0 with measured, not assumed, performance | All roadmap perf/bundle/memory budgets pass with a recorded number, not a claim | Must |
| Catch breakage before real users see it | Playwright E2E smoke test passes against a live/fixture commits page with the built extension loaded | Must |
| Earn user trust on the Chrome Web Store | Privacy disclosure text is backed by a code audit; listing + README are complete and consistent with it | Must |

## Scope

**In scope**: a performance verification harness (layout+draw timing, bundle
gzip size, memory heap growth) with recorded results; a Playwright E2E smoke
test loading the built extension; a privacy/security audit of the existing
code against the "no data leaves the browser" claim; Chrome Web Store
listing metadata/copy/asset specs; README + user docs; manifest
release-readiness (version bump, icons, description); a release checklist
tying all of the above together and explicitly flagging maintainer-only
steps.

**Out of scope**: any new product feature (all functionality from intents
001/002 is frozen); the actual Chrome Web Store developer-account signup and
listing submission/review (maintainer action); registering the real GitHub
OAuth App / obtaining the production `client_id` (maintainer action from
intent 002, tracked here only as a release-checklist item); final polished
icon/screenshot artwork requiring design input (this intent plans placeholder
assets + a generation approach, not bespoke visual design); CI/CD wiring
(no CI exists yet in this repo — running the new scripts/tests locally is in
scope, hooking them into a CI pipeline is not).

---

## Functional Requirements

### FR-1: Performance Verification Harness (Layout + Draw)
- **Description**: Extend the existing layout-only benchmark
  (`benchmarks/layout-bench.mjs`, currently ~1.3ms/500 commits for layout
  alone per the roadmap's Key Decisions) to also drive the draw stage
  (`lib/draw/`), producing a single measured wall-clock number for "layout +
  draw, ≥500 commits, after data arrives."
- **Acceptance Criteria**: A runnable script reports a layout+draw time for
  ≥500 commits; the recorded result is committed to the repo (not just
  asserted in prose); the script's own output states pass/fail against the
  <100ms target.
- **Priority**: Must

### FR-2: Bundle Size Budget Verification
- **Description**: A script measures the **gzip** size of every shipped JS
  artifact from a production `wxt build` (background worker, content script,
  popup chunk) and sums them against the ≤100KB budget — raw file sizes are
  not sufficient evidence, gzip is the shipped/downloaded size that matters
  for the Chrome Web Store budget.
- **Acceptance Criteria**: Script reports a total gzip size with an explicit
  pass/fail against ≤100KB; the recorded number is committed to the repo.
- **Priority**: Must

### FR-3: Memory Budget Verification
- **Description**: Using the Playwright harness from FR-4, measure JS heap
  growth (Chromium `page.metrics().JSHeapUsedSize`, or equivalent) from
  before the content script runs to after a ≥500-commit graph is fully
  rendered, verifying the delta against the ≤50MB budget.
- **Acceptance Criteria**: The E2E test (or a dedicated perf test using the
  same harness) captures heap-used before and after render on a ≥500-commit
  graph; the delta is asserted ≤50MB; the recorded delta is committed to the
  repo (e.g. in the test's own output/report).
- **Priority**: Must

### FR-4: End-to-End Smoke Test (Playwright)
- **Description**: A Playwright test suite loads the built extension
  (unpacked, `.output/chrome-mv3`) in a real Chromium instance via a
  persistent browser context, navigates to a commits page, and asserts the
  injected graph canvas renders and one basic interaction (hover tooltip or
  click-to-navigate) works. Playwright is listed as optional project-wide in
  `coding-standards.md` — it is **required** for this release intent.
- **Acceptance Criteria**: A test command loads the unpacked extension,
  confirms the graph canvas appears on a commits page, and exercises a
  hover/click interaction without throwing or crashing the page; the test is
  runnable locally with a documented command (CI wiring is out of scope, per
  Scope).
- **Priority**: Must

### FR-5: Privacy & Security Audit vs. Code
- **Description**: Verify the "no data leaves the browser" disclosure
  against the actual codebase — enumerate every outbound network call
  (`fetch`) and its destination, every `chrome.storage` read/write, and
  confirm there is no analytics/telemetry/third-party endpoint anywhere in
  `lib/` or `entrypoints/`.
- **Acceptance Criteria**: A written audit lists every outbound request
  found in the code (file:line) and confirms destinations are limited to
  `api.github.com` and `github.com` (device-flow endpoints) only; confirms
  storage use is `chrome.storage.local` only, never `.sync`; confirms zero
  analytics/telemetry code paths; any deviation found during the audit is
  fixed in the audit's findings (the disclosure is corrected to match
  reality, never the reverse) — though no such deviation is expected based
  on a preliminary read of `lib/github/fetch-commits.ts`,
  `lib/github/device-flow.ts`, and `wxt.config.ts`.
- **Priority**: Must

### FR-6: Manifest Release-Readiness
- **Description**: Bring `wxt.config.ts`'s manifest fields to release-ready
  shape: bump `version` to `1.0.0` (currently `0.1.0`, inherited from
  `package.json`), add extension icons (16/32/48/128px, currently absent —
  neither `manifest.icons` nor `action.default_icon` exist today) and
  finalize the description/permissions used in the store listing.
- **Acceptance Criteria**: Built `manifest.json` shows `version: "1.0.0"`,
  has non-empty `icons` and `action.default_icon` fields, and the
  `permissions`/`host_permissions` list matches exactly what FR-5's audit
  found in use (no unused permission requested).
- **Priority**: Must

### FR-7: Chrome Web Store Listing Assets & Metadata
- **Description**: Prepare everything for the Chrome Web Store listing that
  doesn't require a developer account: title/summary/detailed-description
  copy, a screenshot shot-list (which screens to capture, using the built
  extension against a real repo), and an icon asset spec covering every
  CWS-required size with either a generated placeholder or a documented
  generation approach.
- **Acceptance Criteria**: A listing-content document has ready-to-paste
  title/summary/description text; a screenshot shot-list with scene +
  purpose per shot; an icon spec listing every required size and how each
  is produced; the document explicitly states that account creation,
  uploading, and submitting for review are maintainer actions outside
  engineering scope.
- **Priority**: Must

### FR-8: README & User Documentation
- **Description**: Write `README.md` with distinct sections for install
  (load-unpacked today, Chrome Web Store once published), usage (what the
  graph shows and how to read it), sign-in (device-flow walkthrough), privacy
  (summary consistent with FR-5's audit), and development/build (the
  existing `pnpm` scripts in `package.json`).
- **Acceptance Criteria**: README has Install, Usage, Sign-in, Privacy, and
  Development sections; every documented `pnpm` command matches an entry
  actually present in `package.json`'s `scripts`; the privacy section makes
  no claim beyond what FR-5 verified.
- **Priority**: Must

### FR-9: Release Checklist
- **Description**: A single checklist document enumerating every step to
  ship v1.0.0 in order, distinguishing engineering-complete/automatable
  items (this intent's other stories) from maintainer-only actions (real
  OAuth `client_id` from intent 002, Chrome Web Store developer account,
  listing submission, review wait).
- **Acceptance Criteria**: Checklist references the recorded results from
  FR-1/2/3, the FR-4 test, the FR-5 audit, and the FR-7 listing assets;
  every maintainer-only step is labeled unambiguously as maintainer-only.
- **Priority**: Should

---

## Non-Functional Requirements

### Performance
| Requirement | Metric | Target |
|-------------|--------|--------|
| Layout + draw budget | Time from data arrival to a fully drawn graph, ≥500 commits | <100ms (measured, FR-1) |
| Scroll smoothness | Frame rate during graph scroll | 60fps (best-effort verification via the FR-4 E2E harness; no automated frame-rate assertion is scripted — see Assumptions) |
| Bundle budget | Shipped JS, gzip, summed across background/content-script/popup | ≤100KB (measured, FR-2) |
| Memory budget | Extra JS heap on a ≥500-commit graph | ≤50MB (measured, FR-3) |

### Reliability
| Requirement | Metric | Target |
|-------------|--------|--------|
| Host page safety | Extension failure mode on the real GitHub page | Silent-safe, never breaks/slows the host page (already built in intents 001/002; re-verified here via FR-4 E2E) |
| Zero-config first run | Public repo commits page | Graph renders with no settings, no login (already built; re-verified via FR-4 E2E) |

### Privacy
| Requirement | Standard | Notes |
|-------------|----------|-------|
| Data locality | No data leaves the browser except to GitHub itself | Only `api.github.com` and `github.com` (device flow); `chrome.storage.local` only; zero analytics/telemetry — verified against code in FR-5, not assumed |

### Security
| Requirement | Standard | Notes |
|-------------|----------|-------|
| Store listing permissions disclosure | Chrome Web Store policy | `host_permissions`/`permissions` in the listing must match exactly what FR-5's audit found actually in use |

### Compatibility
| Requirement | Metric | Target |
|-------------|--------|--------|
| Browser | Chrome MV3 | Current stable, same as intents 001/002 |

---

## Constraints

### Technical Constraints

**Project-wide standards**: loaded from `memory-bank/standards/` by the
Construction Agent.

**Intent-specific constraints**:
- No CI exists in this repo yet — the FR-4 E2E test and FR-1/FR-2/FR-3
  scripts must be runnable locally with a documented command; wiring them
  into CI is explicitly out of scope for this intent.
- `benchmarks/layout-bench.mjs` already establishes the pattern (Node script,
  `process.memoryUsage()`, no framework) for FR-1 — extend it rather than
  building a separate harness.
- Playwright is not yet a dependency (`package.json` has no `@playwright/test`
  today) — FR-4 requires adding it as a new devDependency, the one new
  dependency this intent introduces (justified: it's the roadmap's named
  tool for this exact purpose).

### Business Constraints
- None identified.

---

## Assumptions

| Assumption | Risk if Invalid | Mitigation |
|------------|-----------------|------------|
| The current build's bundle size (raw JS: background 4K + content-script 16K + popup chunk 20K = ~40KB, "well under 100KB gzip" per roadmap) stays well under budget once actually gzip-measured | Bundle could exceed 100KB if not re-checked after adding icons/version bump | FR-2 measures gzip size directly rather than trusting the raw-size estimate |
| A public commits page (or a local fixture reproducing its DOM shape) is available and stable enough to drive the FR-4 Playwright test without live network flakiness | E2E test becomes flaky against a real GitHub page (rate limits, DOM changes) | Construction may choose a local HTML fixture mirroring the commits-page DOM instead of a live network dependency; either approach satisfies FR-4's acceptance criteria |
| 60fps scroll smoothness is real (already achieved by intents 001/002's canvas rendering) but not worth a bespoke automated frame-rate assertion for this release | A real scroll-jank regression ships unnoticed | Manual verification during the FR-4 E2E session, documented as a best-effort check, not a hard automated gate (see NFR Performance table) |
| A maintainer will register the GitHub OAuth App (real `client_id`) and a Chrome Web Store developer account before actual submission | v1.0.0 cannot be submitted even though all engineering work is done | Both are explicit release-checklist (FR-9) items labeled maintainer-only; this intent's code/docs work is not blocked by their absence |

---

## Open Questions

| Question | Owner | Due Date | Resolution |
|----------|-------|----------|------------|
| Does the Playwright E2E test drive a real public GitHub commits page over the network, or a local HTML fixture reproducing the same DOM? | Construction | Bolt 008-release planning | Resolved with default: local fixture preferred (deterministic, no rate-limit/network flakiness); Construction may use a real page if a stable low-traffic repo is chosen instead |
| Exact set of screenshots for the Chrome Web Store listing (how many, which scenes)? | Construction | Bolt 010-release planning | Resolved with default: 3 shots — signed-out graph on a public repo, hover tooltip, sign-in/settings panel; Construction may adjust |
