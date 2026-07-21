---
stage: test
bolt: 009-release
created: 2026-07-21T05:42:12Z
---

## Test Report: release (bolt 009-release)

### Summary

- **Tests**: 130/130 passed (existing suite; this bolt added no product
  code, so no new test files)
- **Build**: `pnpm build` succeeds; `.output/chrome-mv3/manifest.json` is
  valid MV3 with the expected release fields
- **Lint/Typecheck**: both clean

### Verification Method

Re-read the emitted manifest after a clean rebuild (`rm -rf .output &&
pnpm build`), and re-ran every audit grep from scratch against the current
tree to catch any drift from sibling bolts' concurrent edits.

### Manifest Fields (built `.output/chrome-mv3/manifest.json`)

- ✅ `version`: `"1.0.0"` (was `"0.1.0"`)
- ✅ `icons`: `{16, 32, 48, 128}` all non-empty, pointing at
  `icons/{size}.png` (was absent)
- ✅ `action.default_icon`: `{16, 32, 48, 128}` set (was absent);
  `default_popup: "popup.html"` still correctly merged in by WXT
- ✅ `manifest_version: 3`, valid MV3 shape (`background.service_worker`,
  `content_scripts`, no MV2-only keys)
- ✅ `permissions`: `["storage"]` — unchanged, matches audit
- ✅ `host_permissions`: `["https://github.com/*", "https://api.github.com/*"]`
  — unchanged, matches audit exactly

### Privacy Audit Re-Verification (re-run against current tree)

| Claim | Evidence | Status |
|---|---|---|
| Only 2 outbound hosts (`api.github.com`, `github.com`) | 3 `fetch(` call sites, unchanged: `lib/github/fetch-commits.ts:89`, `lib/github/device-flow.ts:68,121` | ✅ |
| Storage is `.local` only, never `.sync` | 0 production `storage.sync` matches; `token-store.test.ts` actively asserts `.sync` is never called | ✅ |
| Zero analytics/telemetry/third-party SDK | 0 matches across all `.ts`/`.tsx`/`.json` source | ✅ |
| No tokens/PII logged | 0 `console.*` outside `lib/log.ts`; all `log.error` call sites pass static strings or caught exceptions, never `AuthToken`/commit PII | ✅ |

No drift found: sibling bolts' concurrent edits (visible via `git status` as
modified `lib/github/cache.ts`, `fetch-commits.ts`, `entrypoints/*`) did not
change any of the audited destinations, storage keys, or logging behavior.

### Files Produced/Modified by This Bolt

- [x] `memory-bank/bolts/009-release/privacy-audit.md` — audit document
- [x] `memory-bank/bolts/009-release/icon-spec.md` — icon spec
- [x] `public/icons/16.png`, `32.png`, `48.png`, `128.png` — placeholder
      icons, verified valid PNG (correct signature + declared dimensions
      via raw byte inspection: 16x16, 32x32, 48x48, 128x128)
- [x] `wxt.config.ts` — `version` + `action.default_icon` added; nothing
      else changed

### Acceptance Criteria Validation (stories 006, 007)

- ✅ **006 — every `fetch` enumerated with file:line, confirms only
  `api.github.com`/`github.com`**: done, see privacy-audit.md
- ✅ **006 — every storage call confirmed `.local`, never `.sync`**: done
- ✅ **006 — zero analytics/telemetry matches**: done
- ✅ **006 — any deviation fixed before finalizing**: none found, none
  needed
- ✅ **007 — built manifest shows `version: "1.0.0"`**: done
- ✅ **007 — non-empty `icons` + `action.default_icon`**: done
- ✅ **007 — description matches finalized copy**: kept current copy;
  story 008/010 (different bolt) owns the final store-listing description
  text — not yet available to this bolt, so no premature change made
- ✅ **007 — permissions match audit exactly**: confirmed unchanged, no
  unused permission
- ⚠️ **007 — bundle-size script re-run**: story 002's bundle-size script is
  owned by a sibling bolt (`benchmarks/`/`scripts/` are off-limits to this
  bolt) and may not exist yet mid-parallel-run; performed an informal
  stdlib-only gzip check instead (background.js + content script + popup
  chunk ≈ 14.3 KB gzip total, icons are non-JS PNG and don't count toward
  the JS budget) — well under the 100KB budget. The formal script re-run
  is story 002/010's responsibility once merged.

### Issues Found

None in product code. See Findings in the final report for one
observation worth flagging upstream (not a defect — see below).

### Notes

- `lib/github/auth-config.ts`'s `CLIENT_ID` is still the
  `REPLACE_WITH_GITHUB_OAUTH_CLIENT_ID` placeholder — expected, tracked as
  a maintainer-only release-checklist item from intent 002/story
  010-release-checklist, not this bolt's scope.
- Icon artwork is placeholder-only (flat color, no logo) — MANUAL-PENDING,
  see icon-spec.md.
