---
stage: plan
bolt: 010-release
created: '2026-07-21T05:58:47Z'
---

## Implementation Plan: release (010-release)

### Objective

Synthesize the recorded results from bolts 007/008/009-release into three
docs-only deliverables: the Chrome Web Store listing content, the project
README, and a release checklist that separates engineering-complete work
from maintainer-only steps. No product code, `wxt.config.ts`, or
`package.json` changes. This closes out stories 008/009/010 and intent
003-release-hardening.

### Deliverables

- `docs/STORE-LISTING.md` — title/summary/description copy, screenshot
  shot-list, icon spec, privacy disclosure, permissions justification;
  marks asset creation + submission as maintainer steps (story 008)
- `README.md` (repo root) — what it is, install, usage, sign-in, privacy,
  development, performance facts, tech stack, license note (story 009)
- `docs/RELEASE-CHECKLIST.md` — ordered go/no-go list citing every recorded
  result from 007/008/009, maintainer-only items unambiguously flagged
  (story 010)

### Real data sources (no invented numbers/features)

- **Layout+draw perf** (`memory-bank/bolts/007-release/test-walkthrough.md`):
  n=500 → 2.80ms, n=2000 → 9.20ms, budget <100ms, PASS
- **Bundle gzip** (same file): background.js 1.50KB + popup chunk 6.83KB +
  content-scripts/commits.js 5.96KB = **14.29KB total**, budget ≤100KB, PASS
- **E2E** (`memory-bank/bolts/008-release/test-walkthrough.md`): 3/3
  Playwright tests pass (`e2e/extension.spec.ts`), command `pnpm test:e2e`
- **Memory heap** (same file): delta samples 1.13MB / 0.57MB / 0.57MB
  against 600 rendered commits, budget ≤50MB, PASS; recorded in
  `e2e/results/heap-budget.json`
- **Privacy audit** (`memory-bank/bolts/009-release/privacy-audit.md` +
  its bolt's `test-walkthrough.md` re-verification): 4/4 claims confirmed —
  network limited to `api.github.com`/`github.com`, storage `.local` only
  (never `.sync`), zero analytics/telemetry, no tokens/PII logged
- **Manifest/icons** (`memory-bank/bolts/009-release/test-walkthrough.md` +
  `icon-spec.md`): built manifest `version: "1.0.0"`, `icons`/
  `action.default_icon` populated at 16/32/48/128 from `public/icons/`
  (flat-color placeholder, no logo — MANUAL-PENDING), `permissions:
  ["storage"]`, `host_permissions: ["https://github.com/*",
  "https://api.github.com/*"]` unchanged
- **Maintainer gap** (`lib/github/auth-config.ts`): `CLIENT_ID` is still the
  literal placeholder `"REPLACE_WITH_GITHUB_OAUTH_CLIENT_ID"` —
  `isClientIdConfigured()` returns false until a maintainer registers a real
  GitHub OAuth App and replaces it
- **Feature surface read directly** (for accuracy, not from the sibling
  docs): `entrypoints/commits.content.ts` (rail injection, hover tooltip,
  click-to-navigate, scroll redraw, rate-limit/error notice degrade),
  `entrypoints/popup/main.tsx` (sign-in button → device code + verification
  link, commit-depth setting 1–2000, sign-out), `entrypoints/background.ts`
  (device-flow polling), `lib/github/degrade.ts` (rate-limit/401/404
  messaging text), `lib/github/cache.ts` (10-minute TTL,
  `chrome.storage.local` cache), `package.json` scripts (`dev`, `build`,
  `test`, `test:e2e`, `bench`, `bench:bundle-size`, `lint`, `typecheck`)

### Dependencies

- Bolts 007/008/009-release (Required, complete): source of every
  measurement/audit cited above — read-only, not modified
- No new runtime/dev dependency; docs only

### Technical Approach

- Write all three docs from directly-verified sources: either the sibling
  bolts' committed walkthrough/audit files, or a direct read of the actual
  source file (`auth-config.ts`, `package.json`, entrypoints). No number or
  feature claim without a traceable source.
- README privacy section and `docs/STORE-LISTING.md`'s privacy disclosure
  must say the same thing (both trace to the same 009 audit) — write the
  disclosure text once conceptually, reuse the wording in both places.
- `docs/RELEASE-CHECKLIST.md` splits into two clearly headed sections:
  engineering-complete (✅, with the numbers above) and maintainer-only
  (☐, ordered: register OAuth App → set `CLIENT_ID` → replace icon
  placeholders → capture 3 screenshots → create CWS dev account → submit
  listing → tag/version release).
- After writing, run `pnpm lint` / `pnpm typecheck` / `pnpm test` to confirm
  the existing 130-test suite and tooling are unaffected by docs-only
  changes (expected: unaffected, but confirmed not assumed).

### Acceptance Criteria

- [ ] `docs/STORE-LISTING.md` has title, ≤132-char summary, full
      description, 3-scene shot-list, icon spec (sizes + placeholder note),
      privacy disclosure matching the 009 audit, permissions justification,
      and states asset/submission work is maintainer-only
- [ ] `README.md` has Install (load-unpacked + CWS-placeholder-link),
      Usage, Sign-in, Privacy, Development, Performance, Tech Stack, and
      License sections; every `pnpm` command mentioned exists in
      `package.json`
- [ ] `docs/RELEASE-CHECKLIST.md` cites the actual perf/bundle/heap numbers
      and E2E/privacy status with pass/fail, confirms manifest/listing
      readiness, and lists maintainer-only steps in order, unambiguously
      labeled
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` all still green after the
      docs are added
- [ ] No product code, `wxt.config.ts`, `package.json`, or sibling bolt
      folder is modified
