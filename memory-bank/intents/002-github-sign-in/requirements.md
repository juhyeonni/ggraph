---
intent: 002-github-sign-in
phase: inception
status: complete
created: '2026-07-21T04:00:00Z'
updated: '2026-07-21T04:20:00Z'
---

# Requirements: GitHub Sign-In

## Intent Overview

Add an optional "Sign in with GitHub" to the extension via OAuth **Device
Flow** (client_id only, no client_secret, no backend). Signing in unlocks
private-repository graphs and the 5,000 req/hr authenticated rate limit
(vs. 60 req/hr unauthenticated), and enables ETag conditional requests (304s
exempt from the authenticated rate limit only). A Preact settings panel
exposes sign-in/sign-out and a commit-depth control. Extends `lib/github/`
from intent 001 rather than replacing it — the extension must keep working
exactly as before for users who never sign in.

Covers roadmap milestone **v0.4.0 (Sign-in & Polish)**. Requires intent
001 (`commit-graph-on-commits-page`) complete — this intent extends its
`lib/github/fetch-commits.ts`, `lib/github/cache.ts`, and the degradation
path in `entrypoints/commits.content.ts`.

## Business Goals

| Goal | Success Metric | Priority |
|------|----------------|----------|
| Unlock private repos without PAT pasting or a backend | Device-flow sign-in works end-to-end against a registered GitHub OAuth App | Must |
| Raise the effective rate limit for active users | Authenticated fetch uses 5,000 req/hr; ETag 304s don't count against it | Must |
| Give users control without leaving the browser | Settings panel: sign-in/out + commit depth, no options page | Should |

## Scope

**In scope**: OAuth Device Flow (device-code request, token polling,
`authorization_pending`/`slow_down`/`expired_token`/`access_denied`
handling), token storage/retrieval in `chrome.storage.local`, authenticated
REST fetch (private repos, 5,000 req/hr), ETag conditional requests wired
onto the cache's already-reserved `etag` field, sign-in/sign-out UI,
commit-depth setting, auth-aware degradation (token revoked, rate-limit
messaging distinguishing authenticated vs unauthenticated).

**Out of scope**: PAT pasting in the main flow (rejected alternative), OAuth
web flow / any backend (rejected — requires a `client_secret`), undocumented
internal GitHub endpoints, Web Store release hardening (intent 003).

---

## Functional Requirements

### FR-1: OAuth Device Flow Sign-In
- **Description**: A "Sign in with GitHub" action starts the OAuth Device
  Flow: `POST https://github.com/login/device/code` with the extension's
  public `client_id` and scope, then present the returned `user_code` and
  `verification_uri` so the user can authorize the extension in a GitHub
  tab.
- **Acceptance Criteria**: Sign-in requests a device code and displays the
  user code plus a clickable verification link in one interaction; no
  `client_secret` is ever requested, sent, or stored; only the public
  `client_id` (build-time config) is used.
- **Priority**: Must

### FR-2: Device Flow Token Polling
- **Description**: Poll `POST https://github.com/login/oauth/access_token`
  at the server-provided `interval` (default 5s) until the user authorizes,
  denies, or the `device_code` expires, per the OAuth Device Authorization
  Grant.
- **Acceptance Criteria**: Polling never occurs faster than the returned
  `interval` and backs off on `slow_down`; on success the access token is
  captured and polling stops immediately; on `expired_token` or
  `access_denied` the UI shows a clear message and lets the user retry.
- **Priority**: Must

### FR-3: Token Storage & Session State
- **Description**: Persist the obtained access token in
  `chrome.storage.local` and derive signed-in/signed-out state from its
  presence at every extension surface (content script, popup).
- **Acceptance Criteria**: Token survives a browser restart; no token value
  is ever logged (per `lib/log.ts` conventions); token is never written to
  `chrome.storage.sync` or sent anywhere except as an `Authorization` header
  to `api.github.com`.
- **Priority**: Must

### FR-4: Authenticated Commit Fetch (Private Repos + Rate Limit)
- **Description**: When signed in, attach `Authorization: Bearer {token}`
  to REST commit requests (extends `lib/github/fetch-commits.ts`),
  unlocking private-repository access and the 5,000 req/hr authenticated
  rate limit in place of the 60 req/hr unauthenticated limit.
- **Acceptance Criteria**: A private repo's commits page renders the graph
  for a signed-in user with repo access; rate-limit messaging reflects the
  authenticated limit and reset window; a signed-out user on a private repo
  sees a distinct "sign in to view" notice instead of a generic error.
- **Priority**: Must

### FR-5: ETag Conditional Requests (Authenticated Only)
- **Description**: For authenticated requests, use the `etag` field already
  reserved on `CacheEntry` (`lib/github/cache.ts`) — store the response
  `ETag` and send `If-None-Match` on revalidation. A `304 Not Modified`
  response reuses the cached commits and, per GitHub's documented behavior,
  is exempt from the authenticated rate limit.
- **Acceptance Criteria**: A repeated authenticated fetch sends
  `If-None-Match` when a cache entry with an `etag` exists; a `304` response
  refreshes freshness bookkeeping without incrementing visible rate-limit
  usage; unauthenticated requests never send conditional headers (the 304
  exemption does not apply there — verified in intent 001).
- **Priority**: Must

### FR-6: Settings Panel (Sign-in/Sign-out + Commit Depth)
- **Description**: A Preact settings panel (extends the existing extension
  popup at `entrypoints/popup/`) showing current sign-in state, a
  sign-in/sign-out control, and a commit-depth setting overriding
  `DEFAULT_DEPTH` (200) from `lib/github/fetch-commits.ts`.
- **Acceptance Criteria**: Panel reflects signed-in vs. signed-out state
  without a manual refresh; sign-out immediately clears the token and
  reverts subsequent fetches to unauthenticated mode; changing commit depth
  applies to the next graph render without reinstalling the extension.
- **Priority**: Must

### FR-7: Auth-Aware Degradation & Messaging
- **Description**: Extend the existing soft-degradation path (intent 001's
  `degrade()` in `entrypoints/commits.content.ts`) with auth-specific
  cases: a revoked/invalid token (401) triggers a "sign in again" prompt
  rather than the generic failure notice; rate-limit notices distinguish
  the authenticated (5,000/hr) and unauthenticated (60/hr) cases.
- **Acceptance Criteria**: A 401 from `api.github.com` clears the stored
  token and shows a distinct notice, not the generic one; a rate-limited
  notice states which limit applies.
- **Priority**: Should

---

## Non-Functional Requirements

### Security
| Requirement | Standard | Notes |
|-------------|----------|-------|
| No client_secret in the extension | OAuth Device Flow (public client) | Per roadmap decision; PAT pasting and OAuth web flow are explicitly rejected alternatives |
| Token storage | `chrome.storage.local` only | Never `chrome.storage.sync`; never logged |
| Minimal scope | Device-flow `scope` param | Request only what private-repo commit reads need |

### Performance
| Requirement | Metric | Target |
|-------------|--------|--------|
| Device-flow polling | Request cadence | Never faster than server `interval` (default 5s); backs off on `slow_down` |
| Authenticated fetch overhead | vs. intent 001 budget | Layout/draw budget unchanged (<100ms/500 commits); auth adds only a header + optional 304 short-circuit |

### Reliability
| Requirement | Metric | Target |
|-------------|--------|--------|
| Token revocation handling | First 401 response | Token cleared, no repeated failed-request loop |
| Sign-out cleanup | Auth-derived UI state | Signed-out state is immediate and consistent across popup + content script |

### Compatibility
| Requirement | Metric | Target |
|-------------|--------|--------|
| Browser | Chrome MV3 | Current stable, same as intent 001 |
| Permissions | `host_permissions` | No new host permission needed — device-flow endpoints are on `github.com`, already permitted |

### Privacy
| Requirement | Standard | Notes |
|-------------|----------|-------|
| Data locality | No data leaves the browser | Requests go only to `github.com` (device flow) and `api.github.com` (authenticated), same as intent 001 |

---

## Constraints

### Technical Constraints

**Project-wide standards**: loaded from `memory-bank/standards/` by the
Construction Agent.

**Intent-specific constraints**:
- `client_id` is a public, build-time configuration value, not a secret —
  but a *real* one requires a maintainer to register a GitHub OAuth App
  (github.com/settings/developers). This intent implements the flow
  against a config constant; supplying the real value and end-to-end
  verification are maintainer actions (see Assumptions).
- Authenticated rate limit is 5,000 req/hr per token (not per IP); ETag 304
  exemption applies only to authenticated requests (per roadmap, verified
  in GitHub docs).
- No backend: the Device Authorization Grant completes entirely
  client-side without a `client_secret`, unlike the rejected OAuth web flow.

### Business Constraints
- None identified.

---

## Assumptions

| Assumption | Risk if Invalid | Mitigation |
|------------|-----------------|------------|
| GitHub's Device Authorization Grant continues to support public clients (no client_secret) | Sign-in flow breaks entirely | Documented, stable OAuth 2.0 behavior; low risk |
| A maintainer will register a GitHub OAuth App and supply a real `client_id` before release | Sign-in cannot be end-to-end verified pre-release | Treat `client_id` as swappable config; code/flow verified with mocked device-flow responses in tests |
| `chrome.storage.local` has ample quota for one token + settings | Storage write failures | Payload is tiny (<1KB); existing eviction pattern in `lib/github/cache.ts` shows storage is already budget-conscious |

---

## Open Questions

| Question | Owner | Due Date | Resolution |
|----------|-------|----------|------------|
| Where does device-flow polling run — content script or background service worker (survives the ~30-60s authorization wait across SPA navigation/tab teardown)? | Construction | Bolt 004-auth planning | Resolved with default: background service worker recommended in unit brief; final call left to Construction |
| Exact OAuth scope requested (e.g. `repo` for private access vs. a narrower scope)? | Construction | Bolt 004-auth planning | Resolved with default: request `repo` (minimum for private-repo commit reads); Construction may narrow further |
