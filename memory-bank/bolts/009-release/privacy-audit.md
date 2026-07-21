---
bolt: 009-release
story: 006-privacy-security-audit
created: 2026-07-21T05:42:12Z
---

# Privacy & Security Audit — "No data leaves the browser"

## Methodology

Grep sweep of `lib/` + `entrypoints/` for `fetch(`, `XMLHttpRequest`,
`navigator.sendBeacon`, `chrome.storage`/`browser.storage`, and
analytics/telemetry keywords (`analytics`, `telemetry`, `mixpanel`, `sentry`,
`amplitude`, `segment`, `google-analytics`, `gtag`), followed by a manual
read of every `lib/github/*.ts` file (the only module group performing
network or storage I/O in this codebase) and `lib/log.ts` (the only console
output). Given the codebase's small size (per story 006's Technical Notes),
no static-analysis tooling was needed.

## Claim 1: Outbound network calls are limited to `api.github.com` and `github.com`

Every `fetch(` call in the codebase (3 total, confirmed by grep — no
`XMLHttpRequest` or `navigator.sendBeacon` anywhere):

| Location | Destination | Purpose |
|---|---|---|
| `lib/github/fetch-commits.ts:89` (`API_BASE`, line 11: `https://api.github.com`) | `api.github.com` | `GET /repos/{owner}/{repo}/commits` |
| `lib/github/device-flow.ts:68` (`DEVICE_CODE_URL`, line 4) | `github.com/login/device/code` | OAuth device-code request |
| `lib/github/device-flow.ts:121` (`ACCESS_TOKEN_URL`, line 5) | `github.com/login/oauth/access_token` | OAuth device-flow token poll |

Cross-checked against `wxt.config.ts` `host_permissions` (pre-edit):
`["https://github.com/*", "https://api.github.com/*"]` — exact match, no
unused host permission, no undeclared destination.

**Verdict: ✅ confirmed.**

## Claim 2: All persistence is `chrome.storage.local`, never `.sync`

Every `browser.storage.*` call site (grep: `storage\.local\|storage\.sync`
across `lib/`, `entrypoints/`):

| Key | File | Calls |
|---|---|---|
| `ggraph:cache:*` (prefix, `lib/github/cache.ts:11`) | `lib/github/cache.ts` | `.local.get`/`.set`/`.remove` at lines 40, 44, 47, 55, 65, 79, 84 |
| `ggraph:auth:token` (`lib/github/token-store.ts:3`) | `lib/github/token-store.ts` | `.local.get`/`.set`/`.remove` at lines 25, 29, 40, 49 |
| `ggraph:auth:device-session` (`lib/github/device-session-store.ts:3`) | `lib/github/device-session-store.ts` | `.local.get`/`.set`/`.remove` at lines 21, 25, 36, 44 |
| `ggraph:settings` (`lib/github/settings-store.ts:3`) | `lib/github/settings-store.ts` | `.local.get`/`.set` at lines 24, 35 |

No `storage.sync` call exists in any production file. The only `.sync`
references in the repo are in `lib/github/token-store.test.ts:91-97`, a test
that asserts `browser.storage.sync.{get,set,remove}` are **never** called —
a positive, executable guard for this exact claim (part of the existing
130-test suite, still green).

**Verdict: ✅ confirmed** (4 keys enumerated, all `.local`, `.sync` usage
actively test-guarded at zero).

## Claim 3: No analytics/telemetry/third-party SDK

Grep for `analytics|telemetry|mixpanel|sentry|amplitude|segment\.|google-analytics|gtag`
(case-insensitive) across all `.ts`/`.tsx`/`.json` source, excluding
`node_modules`, `.output`, `.git`, `pnpm-lock.yaml`: **zero matches.**

`dependencies` in `package.json`: `preact` only. `devDependencies`: Biome,
`fs-extra`, `happy-dom`, `js-yaml`, `typescript`, `vitest`, `wxt` — no
analytics/telemetry package present (third-party dependency supply-chain
review is explicitly out of scope per story 006).

**Verdict: ✅ confirmed.**

## Claim 4: Tokens/PII never logged

`lib/log.ts` is the only sanctioned console usage in the codebase (a
`biome-ignore lint/suspicious/noConsole` marks it as the deliberate
exception); grep for `console\.` across `lib/`+`entrypoints/` outside
`lib/log.ts` returns zero matches, so no other console output path exists.

Every `log.error(...)` call site:

| Location | Arguments passed |
|---|---|
| `entrypoints/background.ts` (`startSignIn` outcome handler) | Static string `"failed to persist auth token"` — no token value |
| `entrypoints/commits.content.ts` (`safe()` wrapper) | `"handler failed", error` — a caught JS `Error`/exception from a DOM event handler, not an `AuthToken`/commit payload |
| `entrypoints/commits.content.ts` (`sync`) | `"sync failed", error` — same: caught exception object, not token/PII |

No call site logs an `AuthToken`, `access_token`, commit author/email, or
device-flow user code.

**Verdict: ✅ confirmed.**

## Deviations Found

None. All four claims verified as stated; no code fix was required (per
story 006's edge case: "no deviations found is still documented, not just
'nothing to see here'").

## Summary

| Claim | Verdict |
|---|---|
| Outbound network limited to `api.github.com` + `github.com` | ✅ |
| Storage is `chrome.storage.local` only, never `.sync` | ✅ |
| Zero analytics/telemetry/third-party SDK | ✅ |
| No tokens/PII logged | ✅ |

The "no data leaves the browser" disclosure (beyond GitHub itself) is
backed by this audit, not assumed.
