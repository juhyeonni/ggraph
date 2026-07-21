---
id: 005-auth
unit: 001-auth
intent: 002-github-sign-in
type: simple-construction-bolt
status: complete
stories:
  - 004-authenticated-fetch
  - 005-etag-conditional-requests
created: '2026-07-21T04:40:00Z'
started: '2026-07-21T05:01:30Z'
completed: '2026-07-21T05:09:46Z'
current_stage: null
stages_completed: []
requires_bolts:
  - 004-auth
enables_bolts:
  - 006-auth
requires_units: []
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

## Bolt: 005-auth

### Objective

Authenticated fetch + ETag (milestone **v0.4**): extend
`lib/github/fetch-commits.ts` and `lib/github/cache.ts` to attach bearer
tokens (unlocking private repos and the 5,000 req/hr rate limit) and wire
the already-reserved `etag` field for conditional (`If-None-Match`)
requests, whose `304` responses are exempt from the authenticated rate
limit.

### Stories Included

- [ ] **004-authenticated-fetch**: Authenticated commit fetch (private repos + rate limit) - Priority: Must
- [ ] **005-etag-conditional-requests**: ETag conditional requests (authenticated) - Priority: Must

### Expected Outputs

- `fetchCommits` accepting an optional token parameter, attaching
  `Authorization: Bearer` without changing unauthenticated behavior
- `CacheEntry.etag` populated and read; `If-None-Match` sent on
  authenticated revalidation; `304` handled as a cache hit
- Tests covering authenticated fetch, 401, and the 304 path

### Dependencies

#### Bolt Dependencies (within intent)

- **004-auth** (Required): Planned

#### Unit Dependencies (cross-unit)

- None (reuses 004-auth's cross-unit dependency on 001-graph-ui)

#### Enables (other bolts waiting on this)

- 006-auth
