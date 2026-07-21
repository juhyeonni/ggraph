---
stage: plan
bolt: 009-release
created: 2026-07-21T05:42:12Z
---

## Implementation Plan: release (bolt 009-release)

### Objective

Produce a code-verified privacy/security audit of the "no data leaves the
browser" claim (story 006), and bring `wxt.config.ts`'s manifest to
release-ready shape for v1.0.0: version `1.0.0`, minimal justified
permissions, and declared icons (story 007).

### Deliverables

- `memory-bank/bolts/009-release/privacy-audit.md` — every `fetch(` call and
  every `chrome.storage`/`browser.storage` call in `lib/` + `entrypoints/`
  enumerated with file:line, cross-checked against `wxt.config.ts`
  `host_permissions`; a grep sweep for analytics/telemetry/third-party SDKs
  and for `.sync` storage usage; a log-safety check on `lib/log.ts` call
  sites.
- `memory-bank/bolts/009-release/icon-spec.md` — required sizes, file
  locations, generation approach (stdlib-only placeholder PNG, no new
  dependency), and MANUAL-PENDING flag for real logo artwork.
- `public/icons/16.png`, `32.png`, `48.png`, `128.png` — flat-color
  placeholder PNGs (WXT auto-discovers `public/icons/{size}.png` into
  `manifest.icons`; no manual `icons` map needed in `wxt.config.ts`).
- `wxt.config.ts` edits: `manifest.version = "1.0.0"`, `manifest.action =
  { default_icon: {...} }` (WXT does not auto-derive `action.default_icon`
  from discovered icon files — must be set explicitly, since editing the
  popup entrypoint HTML meta convention is out of my file ownership),
  `description` reviewed/kept, `permissions`/`host_permissions` reviewed
  against the audit (expected: unchanged, already minimal).
- `memory-bank/bolts/009-release/implementation-walkthrough.md`,
  `test-walkthrough.md` per template.

### Dependencies

- No new npm dependency (rule: do not touch `package.json`/lockfile). Icon
  generation uses only Node's built-in `zlib` (`deflateSync` + `crc32`) to
  hand-encode a minimal PNG — run as a throwaway script outside the repo
  (scratchpad), committing only the resulting PNG bytes.
- Cannot bump `package.json`'s `version` field (owned by siblings via the
  shared lockfile-adjacent file) — set `manifest.version` explicitly in
  `wxt.config.ts` instead, which WXT prefers over the `package.json`-derived
  default (confirmed in `node_modules/wxt/dist/core/utils/manifest.mjs`:
  `wxt.config.manifest.version ?? simplifyVersion(versionName)`).
- Depends on intents 001/002 code being final (confirmed complete per
  bolt.md `requires_units`).

### Technical Approach

1. Grep sweep across `lib/` + `entrypoints/` for `fetch(`, `XMLHttpRequest`,
   `sendBeacon`, `storage.sync`, and analytics/telemetry keywords; manually
   read every `lib/github/*.ts` file to confirm all `browser.storage.*`
   calls are `.local`.
2. Cross-check discovered hosts (`api.github.com`, `github.com`) against
   `wxt.config.ts` `host_permissions` — expect exact match, no unused
   permission.
3. Check `lib/log.ts` and every `log.error(...)` call site for token/PII
   leakage.
4. Write `privacy-audit.md` with a claim-by-claim table (claim, evidence
   file:line, verdict).
5. Write `icon-spec.md`, generate 4 placeholder PNGs via a scratchpad-only
   Node script (not committed), write them into `public/icons/`.
6. Edit `wxt.config.ts`: set `version`, `action.default_icon`; leave
   `permissions`/`host_permissions`/`name` as audit-confirmed; refresh
   `description` only if audit/scope demands (expected: keep, story
   008/010 owns final store-listing copy).
7. Run `pnpm build`, inspect `.output/chrome-mv3/manifest.json` for
   `version: "1.0.0"`, non-empty `icons`, `action.default_icon`.
8. Run `pnpm lint`, `pnpm typecheck`, `pnpm test` — must stay green (no
   product code touched).

### Acceptance Criteria

- [ ] Privacy audit enumerates every `fetch`/storage call with file:line,
      confirms only `api.github.com` + `github.com`, `.local`-only storage,
      zero analytics/telemetry, no token/PII in logs.
- [ ] `permissions`/`host_permissions` in `wxt.config.ts` match exactly what
      the audit found in use.
- [ ] Built `manifest.json` shows `version: "1.0.0"`, non-empty `icons`,
      and `action.default_icon` set.
- [ ] Icon spec documents sizes/location/generation approach; real artwork
      flagged MANUAL-PENDING.
- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` all green.
- [ ] No file outside my ownership (`benchmarks/`, `scripts/`, `e2e/`,
      `playwright.config.*`, `lib/`/`entrypoints/` product logic,
      `package.json`, `pnpm-lock.yaml`) touched.
