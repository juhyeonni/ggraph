---
unit: 001-auth
intent: 002-github-sign-in
unit_type: frontend
default_bolt_type: simple-construction-bolt
phase: inception
status: complete
created: '2026-07-21T04:30:00Z'
updated: '2026-07-21T04:30:00Z'
---

# Unit Brief: auth

## Purpose

Add optional "Sign in with GitHub" (OAuth Device Flow) to unlock private
repos and the 5,000 req/hr authenticated rate limit, wire ETag conditional
requests onto the already-reserved cache field, and give users a settings
panel to sign in/out and set commit depth — without changing any
unauthenticated (signed-out) behavior from intent 001.

## Scope

### In Scope
- Device-code request + token polling (`login/device/code`,
  `login/oauth/access_token`), per the OAuth Device Authorization Grant
- Token persistence/retrieval in `chrome.storage.local`
- Extending `lib/github/fetch-commits.ts` to attach `Authorization: Bearer`
  when signed in (private repos, 5,000 req/hr)
- Extending `lib/github/cache.ts` to use its reserved `etag` field: send
  `If-None-Match`, treat 304 as a rate-limit-exempt cache hit
- Settings panel (Preact, extends `entrypoints/popup/`): sign-in/out,
  commit-depth setting
- Auth-aware degradation: token-revoked (401) handling, rate-limit
  messaging distinguishing authenticated vs. unauthenticated

### Out of Scope
- Registering the real GitHub OAuth App / obtaining a production `client_id`
  (maintainer action, external to this unit's code)
- PAT pasting in the main flow, OAuth web flow / any backend (rejected
  alternatives per roadmap)
- Web Store release hardening (intent 003)
- Changes to unauthenticated fetch/cache/layout/render behavior (intent 001,
  must keep working unchanged)

---

## Assigned Requirements

| FR | Requirement | Priority |
|----|-------------|----------|
| FR-1 | OAuth device flow sign-in | Must |
| FR-2 | Device flow token polling | Must |
| FR-3 | Token storage & session state | Must |
| FR-4 | Authenticated commit fetch (private repos + rate limit) | Must |
| FR-5 | ETag conditional requests (authenticated only) | Must |
| FR-6 | Settings panel (sign-in/sign-out + commit depth) | Must |
| FR-7 | Auth-aware degradation & messaging | Should |

---

## Domain Concepts

### Key Entities
| Entity | Description | Attributes |
|--------|-------------|------------|
| DeviceCodeSession | In-progress device-flow authorization | device_code, user_code, verification_uri, expires_in, interval |
| AuthToken | Persisted authenticated session | access_token, token_type, scope, obtainedAt |
| Settings | User-configurable extension settings | commitDepth |

### Key Operations
| Operation | Description | Inputs | Outputs |
|-----------|-------------|--------|---------|
| startDeviceFlow | Request a device code | client_id, scope | DeviceCodeSession |
| pollForToken | Poll until authorized/denied/expired | DeviceCodeSession | AuthToken \| error |
| getToken / storeToken / clearToken | Token lifecycle in chrome.storage.local | — / AuthToken / — | AuthToken \| null |
| fetchCommits (extended) | REST fetch with optional bearer token + conditional ETag | owner, repo, ref, depth, token?, etag? | Commit[] \| 304-cache-hit |
| renderSettingsPanel | Preact settings UI | auth state, Settings | sign-in/out action, depth change |

---

## Story Summary

| Metric | Count |
|--------|-------|
| Total Stories | 9 |
| Must Have | 7 |
| Should Have | 2 |
| Could Have | 0 |

### Stories

| Story ID | Title | Priority | Status |
|----------|-------|----------|--------|
| 001-device-flow-initiate | Start OAuth device flow | Must | Planned |
| 002-device-flow-poll | Poll for access token | Must | Planned |
| 003-token-storage | Persist and read the auth token | Must | Planned |
| 004-authenticated-fetch | Authenticated commit fetch (private repos + rate limit) | Must | Planned |
| 005-etag-conditional-requests | ETag conditional requests (authenticated) | Must | Planned |
| 006-settings-panel-ui | Settings panel: sign-in/out | Must | Planned |
| 007-commit-depth-setting | Configurable commit depth | Should | Planned |
| 008-sign-out | Sign out clears session | Must | Planned |
| 009-auth-aware-degradation | Auth-aware degradation & messaging | Should | Planned |

---

## Dependencies

### Depends On
| Unit | Reason |
|------|--------|
| 001-graph-ui (intent 001) | Extends `lib/github/fetch-commits.ts`, `lib/github/cache.ts`, and `degrade()` in `entrypoints/commits.content.ts`; intent 001 must be complete |

### Depended By
| Unit | Reason |
|------|--------|
| — | None yet; intent 003 (release hardening) may add e2e coverage of the signed-in path |

### External Dependencies
| System | Purpose | Risk |
|--------|---------|------|
| GitHub Device Flow endpoints | Sign-in | Medium — requires a maintainer-registered OAuth App (`client_id`) for real end-to-end verification; code/flow itself is documented and stable |
| GitHub REST API (authenticated) | Private repos + higher rate limit | Low (documented, stable) |
| chrome.storage | Token + settings persistence | Low |

---

## Technical Context

### Suggested Technology
Per `standards/tech-stack.md`: TypeScript strict, WXT, Preact (widgets
only), pnpm, Biome, Vitest — same stack as intent 001. New auth module
should follow the same pattern as `lib/github/cache.ts` (typed,
`browser.storage.local`, fails soft, unit-tested).

**Open technical question (resolved with a default, see requirements.md):**
device-flow polling likely belongs in a background service worker rather
than the content script, since the content script can be torn down by SPA
navigation during the ~30-60s the user takes to authorize in a tab. Default:
background service worker; Construction may revisit.

### Integration Points
| Integration | Type | Protocol |
|-------------|------|----------|
| github.com/login/device/code, /login/oauth/access_token | API | REST/JSON (form-encoded request) |
| api.github.com | API | REST/JSON, now with Authorization + If-None-Match |
| entrypoints/popup | UI | Preact render (extends existing placeholder) |

### Data Storage
| Data | Type | Volume | Retention |
|------|------|--------|-----------|
| Auth token + scope | chrome.storage.local | 1 small entry | Until sign-out or token revoked |
| Settings (commit depth) | chrome.storage.local | 1 small entry | Persistent |
| Cache ETag (extends intent 001 entries) | chrome.storage.local | Reuses existing bounded cache | Same TTL/LRU as intent 001 |

---

## Constraints

- No new `host_permissions` — device-flow endpoints are on `github.com`,
  already permitted; `api.github.com` already permitted.
- `client_id` is a build-time config constant, not a secret; a real value
  is a maintainer action (OAuth App registration).
- Must not alter signed-out behavior or the existing 60 req/hr
  unauthenticated path from intent 001.

---

## Success Criteria

### Functional
- [ ] Sign-in via device flow completes end-to-end against a registered
      OAuth App (or mocked endpoints in tests)
- [ ] Private repo commits page renders for a signed-in user with access
- [ ] Sign-out immediately reverts to unauthenticated behavior

### Non-Functional
- [ ] Polling never exceeds the server-provided `interval`
- [ ] Token never logged or written to `chrome.storage.sync`
- [ ] Authenticated fetch adds no measurable regression to intent 001's
      <100ms/500-commit layout+draw budget

### Quality
- [ ] Device-flow and token modules unit-tested (mocked endpoints)
- [ ] All acceptance criteria met
- [ ] Biome + tsc clean

---

## Bolt Suggestions

| Bolt | Type | Stories | Objective |
|------|------|---------|-----------|
| 004-auth | simple | 001, 002, 003 | Device flow core: device code, polling, token storage |
| 005-auth | simple | 004, 005 | Authenticated fetch + ETag conditional requests |
| 006-auth | simple | 006, 007, 008, 009 | Settings panel + auth-aware degradation |

---

## Notes

Biggest risks: the external `client_id` boundary (mitigated by treating it
as swappable config and testing against mocked device-flow responses) and
where polling should run (mitigated by defaulting to a background service
worker, documented as an open question Construction can revisit).
