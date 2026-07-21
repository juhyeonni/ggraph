---
stage: test
bolt: 005-auth
created: 2026-07-21T05:05:21Z
---

## Test Report: auth (authenticated fetch + ETag)

### Summary

- **Tests**: 97/97 passed (9 new: 7 in `fetch-commits.test.ts`, 2 in
  `cache.test.ts`; existing 88 from prior bolts unaffected — 4 assertions
  in `fetch-commits.test.ts` were narrowed, not behavior-changed, to
  account for the widened result type)
- **Coverage**: no rigid percentage tracked (per coding-standards); every
  new branch (Authorization header, If-None-Match gating, 401, 304
  short-circuit, ETag capture) has a dedicated case

### Test Files

- [x] `lib/github/fetch-commits.test.ts` - token → `Authorization: Bearer`
      header; no token → no headers at all (unauthenticated path
      unchanged); 401 → typed `unauthorized`; `If-None-Match` sent only
      with both a token and an etag; `If-None-Match` never sent without a
      token even if an etag is passed; a `304` on page one short-circuits
      to a `notModified` cache hit without a second fetch or body parse; a
      `200` captures the response `ETag` onto the result
- [x] `lib/github/cache.test.ts` - `setCacheEntry`'s optional `etag`
      argument is stored on the entry when given, left `undefined` when
      omitted (pre-existing intent-001 entries keep working)

### Acceptance Criteria Validation

**004-authenticated-fetch**
- ✅ A stored token → request includes `Authorization: Bearer {token}`
- ✅ No token → unauthenticated path is byte-for-byte unchanged (asserted
  directly: `fetch`'s second argument is `undefined`, exactly as before
  this bolt)
- ✅ 404 (no access / not found) → same typed `not-found`, unchanged from
  intent 001
- ✅ Rate-limited → same `resetAt` shape, unchanged from intent 001
- ✅ 401 (revoked token) → new, distinguishable `unauthorized` kind (not
  conflated with `not-found`)
- MANUAL-PENDING: a private repo's commits page rendering identically to a
  public repo for a signed-in user with access — needs a real token
  against a real private repo, not reachable from unit tests

**005-etag-conditional-requests**
- ✅ Authenticated request + cached `etag` → `If-None-Match: {etag}` sent
- ✅ `304` → cached commits reused (`commits.content.ts` re-writes the
  cache entry with the caller's own `cached.commits`/`cached.etag`,
  refreshing `fetchedAt`/`lastAccessed` via `setCacheEntry`'s existing
  timestamp behavior) — no re-parse, no second network call
- ✅ `304` is a normal `ok: true` outcome, distinct from any error path, so
  it is never counted against rate-limit error handling
- ✅ Unauthenticated request → `If-None-Match` never sent, even if an etag
  value is passed in (guarded on token presence, not just etag presence)
- ✅ `200` → new `ETag` response header captured and returned on the
  result; `commits.content.ts` passes it straight into `setCacheEntry`
- ✅ Pre-existing cache entries with no `etag` (intent-001 data) fall back
  to an unconditional fetch and get `etag` populated on the next `200` —
  covered by `cache.test.ts`'s "leaves etag undefined when not provided"
  plus `fetch-commits.test.ts`'s no-etag-provided cases already in the
  suite
- MANUAL-PENDING: a live private-repo revalidation round trip receiving a
  real `304` from `api.github.com` — needs a real token and a real
  previously-cached etag

### Issues Found

None. `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` all clean on
the final state (97/97 tests).

### Notes

- `entrypoints/commits.content.ts`'s new wiring (reading `getToken()`
  alongside the cache entry, passing both into `fetchCommits`, handling the
  `notModified` branch) has no dedicated test — this repo has no WXT
  entrypoint test harness (same gap already documented for bolt 004's
  `background.ts` and intent 001's `commits.content.ts` itself). All the
  decision logic it calls into (`fetchCommits`, `setCacheEntry`) is fully
  unit-tested; the content script remains a thin wiring layer.
- The story's "sign-out races an in-flight fetch" edge case is not
  exercised — no sign-out mechanism exists yet (ships in bolt 006);
  flagged in `implementation-walkthrough.md`'s Developer Notes for that
  bolt to revisit.
- Real end-to-end verification of both stories needs a maintainer-supplied
  `client_id` and a live token, consistent with the intent's documented
  assumption (same boundary noted in bolt 004's test report).
