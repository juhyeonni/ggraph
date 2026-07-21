---
intent: 002-github-sign-in
phase: inception
status: units-decomposed
updated: 2026-07-21T04:30:00Z
---

# GitHub Sign-In - Unit Decomposition

## Units Overview

This intent decomposes into 1 unit of work:

### Unit 1: 001-auth

**Description**: Adds the entire authenticated-mode feature — OAuth Device
Flow, token storage, authenticated fetch + ETag, settings panel, and
auth-aware degradation. Single frontend unit per project type
(`frontend-app`, feature-based decomposition), consistent with intent 001's
single-unit shape.

**Requirement-to-Unit Mapping** (all FRs → this unit):

- FR-1 OAuth device flow sign-in → `001-auth`
- FR-2 Device flow token polling → `001-auth`
- FR-3 Token storage & session state → `001-auth`
- FR-4 Authenticated commit fetch (private repos + rate limit) → `001-auth`
- FR-5 ETag conditional requests (authenticated only) → `001-auth`
- FR-6 Settings panel (sign-in/sign-out + commit depth) → `001-auth`
- FR-7 Auth-aware degradation & messaging → `001-auth`

**Stories**: 9 (see unit brief)

**Deliverables**:

- Device-flow auth module (`lib/github/auth.ts` or similar) with unit tests
- `lib/github/fetch-commits.ts` and `lib/github/cache.ts` extended for
  bearer-token auth + ETag/If-None-Match
- Settings panel replacing the placeholder in `entrypoints/popup/`
- Auth-aware degradation extending `degrade()` in
  `entrypoints/commits.content.ts`

**Dependencies**:

- Depends on: `001-graph-ui` (intent 001) — extends its `lib/github/`
  modules and degradation path; intent 001 must be complete first
- Depended by: none yet (intent 003 release hardening may add e2e coverage
  of the signed-in path)

**Estimated Complexity**: M

## Unit Dependency Graph

```text
[001-graph-ui] (intent 001, complete) ──► [001-auth] (this intent)
```

## Execution Order

1. 001-auth, bolt 004-auth — device flow core: device code, polling, token storage
2. 001-auth, bolt 005-auth — authenticated fetch + ETag
3. 001-auth, bolt 006-auth — settings panel + auth-aware degradation

All three bolts are sequential (each builds on the token/state introduced
by the previous one) — none are parallelizable within this intent.
