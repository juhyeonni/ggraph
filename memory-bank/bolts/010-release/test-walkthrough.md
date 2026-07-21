---
stage: test
bolt: 010-release
created: '2026-07-21T05:58:47Z'
---

## Test Report: release (010-release)

### Summary

- **Tests**: 130/130 Vitest tests passed (docs-only bolt, no product code
  touched — confirmed, not assumed). `pnpm lint` (Biome) and `pnpm
  typecheck` (`tsc --noEmit`) both clean, re-verified after a doc fix
  (see Issues Found).
- **Verification method**: every factual/numeric claim in the three new
  docs was traced back to its source file (a sibling bolt's committed
  walkthrough/audit, or the actual source code) and spot-checked below.

### Documents Verified

- [x] `README.md` — install, usage, sign-in, privacy, development,
      performance, tech stack, license sections
- [x] `docs/STORE-LISTING.md` — Chrome Web Store listing copy, shot-list,
      icon spec, privacy disclosure, permissions justification
- [x] `docs/RELEASE-CHECKLIST.md` — go/no-go synthesis of 007/008/009 plus
      ordered maintainer-only steps

### Claim-by-Claim Spot Check

| Claim | Source | Verified |
|---|---|---|
| Layout+draw 500→2.80ms, 2000→9.20ms, budget <100ms | `memory-bank/bolts/007-release/test-walkthrough.md` | ✅ exact match |
| Bundle gzip 1.50+6.83+5.96=14.29KB, budget ≤100KB | same | ✅ exact match |
| Heap delta 0.57/0.57/1.13MB on 600 commits, budget ≤50MB | `memory-bank/bolts/008-release/test-walkthrough.md` | ✅ exact match |
| E2E 3/3 pass, `pnpm test:e2e` | same | ✅ exact match; command re-confirmed present in `package.json` |
| Privacy: network limited to `api.github.com`/`github.com`; storage `.local` only; zero analytics; no tokens logged | `memory-bank/bolts/009-release/privacy-audit.md` | ✅ exact match, same wording used in both README and STORE-LISTING (no drift, per story 009's acceptance criterion) |
| Manifest `version: "1.0.0"`, icons 16/32/48/128, `permissions`/`host_permissions` unchanged | `memory-bank/bolts/009-release/test-walkthrough.md`, `wxt.config.ts` | ✅ exact match, re-read `wxt.config.ts` directly |
| `CLIENT_ID` placeholder string | `lib/github/auth-config.ts:6` (`"REPLACE_WITH_GITHUB_OAUTH_CLIENT_ID"`) | ✅ read directly, quoted exactly |
| Every `pnpm` command in README (`dev`,`build`,`test`,`test:e2e`,`bench`,`bench:bundle-size`,`lint`,`typecheck`) | `package.json` `scripts` | ✅ all 8 present verbatim (`python3 -c "json.load..."` cross-check) |
| Short summary "Commit graph on GitHub's commits page" reused from manifest | `wxt.config.ts:9` | ✅ verbatim match; char count corrected from an initial miscount (43→37) after a `wc -c` check — see Issues Found |
| Commit-depth range 1–2000, default 200 | `lib/github/settings-store.ts` (`MIN_DEPTH`/`MAX_DEPTH`), `lib/github/fetch-commits.ts` (`DEFAULT_DEPTH`) | ✅ exact match |
| Hover tooltip / click-to-navigate / Cmd·Ctrl·middle-click new tab | `entrypoints/commits.content.ts` (`onMove`, `onClick`) | ✅ matches code behavior read directly |
| Theme matching (light/dark) | `lib/github/selectors.ts` (`getPageTheme`) | ✅ matches |
| No "load more" feature claimed | grep for `load.more\|loadmore\|pagination\|older` across `lib/`+`entrypoints/` | ✅ confirmed absent as a distinct feature; README describes GitHub's own "Older" page nav instead, not an invented control |
| 3-screenshot shot-list (signed-out graph, hover tooltip, sign-in/settings) | `requirements.md` Open Questions resolution (inception default) | ✅ matches the resolved default exactly |
| Icon placeholder color/sizes/paths | `memory-bank/bolts/009-release/icon-spec.md` | ✅ exact match |

### Acceptance Criteria Validation

**Story 008 (store-listing-assets)**:
- ✅ Title, ≤132-char summary (37 chars, verified via `wc -c`), full
  description covering zero-config + optional sign-in
- ✅ 3-shot shot-list with scene + purpose per shot
- ✅ Icon spec: all 4 required sizes, generation approach documented
  (citing bolt 009's script-free zlib approach)
- ✅ Privacy disclosure states exactly what the audit confirmed — no
  broader/narrower claim
- ✅ Explicitly states account creation/upload/submission are maintainer
  actions

**Story 009 (readme-user-docs)**:
- ✅ Install section covers load-unpacked (today) and CWS (placeholder
  link, "coming soon")
- ✅ Usage section explains branch/merge topology and how to read it
- ✅ Sign-in section walks through device-flow UX end to end
- ✅ Privacy section consistent with story 008's disclosure (verified
  identical wording, no drift)
- ✅ Every Development-section `pnpm` command exists in `package.json`

**Story 010 (release-checklist)**:
- ✅ Cites actual layout+draw, gzip, and heap numbers with pass/fail
- ✅ States E2E pass/fail (3/3) and re-run command
- ✅ Links/summarizes the privacy audit's conclusion
- ✅ Confirms manifest + listing work complete and ready
- ✅ Maintainer-only actions (real `client_id`, icon artwork, screenshots,
  CWS account, submission/review, tag) each labeled unambiguously and
  ordered (register OAuth App → set `CLIENT_ID` → replace icons → capture
  screenshots → create CWS account → submit/review → tag release)

### Issues Found

One authoring error, caught and fixed during this stage: `docs/
STORE-LISTING.md` initially stated the short summary was "43 chars" — a
manual miscount. Re-measured with `wc -c` (37 chars) and corrected the doc
in place. No other inconsistency found between the docs and the actual
code/sibling-bolt artifacts.

### Notes

- `pnpm lint` / `pnpm typecheck` / `pnpm test` (130/130) all green,
  re-confirmed after the doc fix above.
- `git status` confirms this bolt's changes are scoped to `README.md`,
  `docs/`, and `memory-bank/bolts/010-release/` only — no product code,
  `wxt.config.ts`, `package.json`, or sibling bolt folder touched.
- Maintainer-only checklist items (OAuth `client_id`, icon artwork,
  screenshots, CWS account, submission/review, tag) are MANUAL-PENDING by
  nature — not exercised here, only verified as correctly labeled and
  ordered in the checklist document.
