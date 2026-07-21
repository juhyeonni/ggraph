# v1.0.0 Release Checklist

Synthesizes every recorded result from bolts 007/008/009-release
(intent `003-release-hardening`) into one go/no-go list. Engineering-side
items are already verified with a recorded measurement or audit — not
restated targets. Maintainer-only items are what's left before the actual
Chrome Web Store submission.

## Engineering — complete, verified ✅

- ✅ **Layout + draw performance** — 500 commits: 2.80ms; 2000 commits:
  9.20ms. Budget: <100ms. **PASS** with wide margin.
  (`memory-bank/bolts/007-release/test-walkthrough.md`, re-run:
  `pnpm bench`)
- ✅ **Bundle size (gzip)** — background.js 1.50KB + popup chunk 6.83KB +
  content-scripts/commits.js 5.96KB = **14.29KB total**. Budget: ≤100KB.
  **PASS** with wide margin. (same file, re-run: `pnpm build && pnpm
  bench:bundle-size`)
- ✅ **Memory / heap budget** — extra JS heap on a 600-commit graph: 0.57MB
  / 0.57MB / 1.13MB across 3 samples. Budget: ≤50MB. **PASS**, recorded in
  `e2e/results/heap-budget.json`.
  (`memory-bank/bolts/008-release/test-walkthrough.md`)
- ✅ **Playwright E2E suite** — 3/3 tests pass: extension loads and the
  graph rail renders; hover shows the tooltip and click navigates to the
  commit; host-page console/error safety asserted (zero `[ggraph]`-prefixed
  errors). Re-run: `pnpm test:e2e`.
  (`memory-bank/bolts/008-release/test-walkthrough.md`,
  `e2e/extension.spec.ts`)
- ✅ **Privacy & security audit** — 4/4 claims confirmed: network limited to
  `api.github.com`/`github.com`; storage is `chrome.storage.local` only,
  never `.sync`; zero analytics/telemetry/third-party SDK; no tokens/PII
  logged. No deviation found, no code fix needed.
  (`memory-bank/bolts/009-release/privacy-audit.md`, re-verified in
  `memory-bank/bolts/009-release/test-walkthrough.md`)
- ✅ **Manifest release-readiness** — built `manifest.json` has `version:
  "1.0.0"`, non-empty `icons`/`action.default_icon` at 16/32/48/128,
  `permissions: ["storage"]` and `host_permissions:
  ["https://github.com/*", "https://api.github.com/*"]` unchanged and
  matching the audit exactly. (`memory-bank/bolts/009-release/
  test-walkthrough.md`, `wxt.config.ts`)
- ✅ **Store listing content** — title, summary, full description,
  3-screenshot shot-list, icon spec, privacy disclosure, and permissions
  justification all written and internally consistent with the audit above.
  (`docs/STORE-LISTING.md`)
- ✅ **README / user docs** — install, usage, sign-in, privacy,
  development, and performance sections written; every documented `pnpm`
  command verified against `package.json`. (`README.md`)
- ✅ **Test suite green** — 130/130 Vitest tests passing throughout bolts
  007–009 (unaffected by docs-only work in this bolt); `pnpm lint` (Biome)
  and `pnpm typecheck` (`tsc --noEmit`) clean.

## Known gap, tracked below

- ⚠️ **Icon artwork is placeholder-only** — flat `#242938` color, no logo.
  Functionally satisfies "non-empty `icons`", but is not final release
  artwork. See maintainer step 2 below.
- ⚠️ **`CLIENT_ID` is unset** — `lib/github/auth-config.ts` still has the
  literal placeholder `"REPLACE_WITH_GITHUB_OAUTH_CLIENT_ID"`. Sign-in is
  fully implemented and tested, but inert (`isClientIdConfigured()` returns
  false; popup shows "GitHub sign-in isn't configured yet") until a real
  OAuth App is registered. Unauthenticated mode is fully functional and
  unaffected. See maintainer step 1 below.

## Maintainer-only — remaining steps, in order ☐

1. ☐ **Register a GitHub OAuth App** at
   `https://github.com/settings/developers` (Device Authorization Grant,
   no client secret needed) and set the resulting `client_id` as `CLIENT_ID`
   in `lib/github/auth-config.ts`, replacing the placeholder. Rebuild and
   re-run `pnpm test:e2e` to confirm sign-in still works with the real ID.
2. ☐ **Replace the placeholder icons** — swap the 4 flat-color PNGs at
   `public/icons/{16,32,48,128}.png` with real designed artwork at the same
   sizes and paths (no `wxt.config.ts` change needed, per
   `memory-bank/bolts/009-release/icon-spec.md`).
3. ☐ **Capture the 3 listing screenshots** per `docs/STORE-LISTING.md`'s
   shot-list, against a real repository with realistic merge history.
4. ☐ **Create a Chrome Web Store developer account** (one-time $5 fee at
   time of writing — verify current CWS terms).
5. ☐ **Submit the listing** — upload the built `.output/chrome-mv3` as a
   zip, paste in the title/summary/description from
   `docs/STORE-LISTING.md`, upload the icons and screenshots from steps 2–3,
   and paste the privacy disclosure into CWS's privacy practices form.
6. ☐ **Pass Chrome Web Store review** (timeline outside maintainer control).
7. ☐ **Tag the release** — `git tag v1.0.0` once the listing is live (or
   once submission is final, maintainer's call), matching
   `package.json`'s/`wxt.config.ts`'s already-bumped `version: "1.0.0"`.

## Exit

v1.0.0 ships when step 6 (CWS review) passes and the listing is publicly
visible. All engineering-complete items above are already satisfied;
nothing in this list is blocked on further code changes.
