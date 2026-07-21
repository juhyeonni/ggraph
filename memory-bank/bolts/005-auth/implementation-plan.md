---
stage: plan
bolt: 005-auth
created: 2026-07-21T05:05:21Z
---

## Implementation Plan: auth (authenticated fetch + ETag)

### Objective

Extend `lib/github/fetch-commits.ts` and `lib/github/cache.ts` (from intent
001) so a stored token attaches `Authorization: Bearer` (private repos +
5,000 req/hr) and the already-reserved `CacheEntry.etag` field drives
`If-None-Match` conditional revalidation, whose `304` is a rate-limit-exempt
cache hit. Wire both through `entrypoints/commits.content.ts` without
changing any unauthenticated behavior.

### Deliverables

- `lib/github/fetch-commits.ts` — `fetchCommits` gains optional `token`/
  `etag` params; `FetchCommitsError` gains an `unauthorized` (401) variant;
  `FetchCommitsResult` gains a `notModified` cache-hit outcome and an
  `etag` on the normal success shape
- `lib/github/cache.ts` — `setCacheEntry` gains an optional `etag` param so
  callers can populate/refresh the field
- `entrypoints/commits.content.ts` — reads the token via `getToken()`,
  passes `token` + the cached entry's `etag` into `fetchCommits`, handles
  the `notModified` outcome by refreshing the cache entry's timestamps
  instead of re-rendering
- Extended `lib/github/fetch-commits.test.ts` / `lib/github/cache.test.ts`

### Dependencies

- `lib/github/token-store.ts` (bolt 004) — `getToken()` for the caller to
  decide whether to authenticate; `fetchCommits` itself stays storage-free
  and pure
- No new npm dependencies, no manifest/host_permission changes

### Technical Approach

**Signature**: `fetchCommits(owner, repo, ref, depth = DEFAULT_DEPTH, token?: string, etag?: string)`
— two new trailing optional params, same style as `ref`/`depth`. When
`token` is `undefined`, the request has no `Authorization` header and no
`If-None-Match` header is ever sent (etag is ignored without a token) —
byte-for-byte the same `fetch(url)` call as before.

**Header logic**: inside the per-page loop, `Authorization: Bearer {token}`
is attached to every page when a token is present. `If-None-Match` is only
attempted on **page 1** — the cache stores one `etag` per (owner, repo,
ref) entry, not one per page, so conditional revalidation is scoped to
"has the most-recent-commits page changed at all," which is what the cache
entry's freshness question actually is.
`ponytail: etag conditional revalidation only covers page 1; a
force-pushed rewrite of older history without a change to HEAD's page
would be missed. Acceptable — the cache already treats the whole entry as
one unit, and this matches git's practical immutability of published
history. Upgrade path: per-page etags in CacheEntry.etags[] if per-page
revalidation is ever needed.`

**304 path**: a `304` response on page 1 short-circuits the whole function
with `{ ok: true, notModified: true }` — no pagination, no parsing. The
caller (already holding the cached entry from `getCacheEntry`) reuses
`cached.commits` as-is; `fetchCommits` never sees or needs the previous
commits, keeping it storage-free.

**200 path / etag capture**: on a successful page-1 response, the `ETag`
response header is captured into `freshEtag` and returned on the success
result (`{ ok: true, commits, etag: freshEtag }`); pages 2+ (if any) are
unaffected — same pagination/parsing as intent 001.

**Result typing without breaking existing tests**: `FetchCommitsResult`
becomes `{ ok: true; commits: Commit[]; etag?: string } | { ok: true;
notModified: true } | { ok: false; error: FetchCommitsError }`. All new
fields are additive/optional on the existing success shape, so
`toEqual({ ok: true, commits: expect.any(Array) })` in the current test
suite still passes (`toEqual` ignores `undefined` properties) — no
existing test needs to change.

**401 handling**: `toFetchError` gets a `response.status === 401` branch
returning `{ kind: "unauthorized" }`, checked before the existing
404/403/429 branches. Not threaded into `rate-limited` (per bolt
constraints — bolt 006 derives 60-vs-5000 messaging from local auth state,
not the error object).

**Cache wiring**: `setCacheEntry` gains a 5th optional `etag` param, stored
directly on the entry (`{ commits, fetchedAt, lastAccessed, etag }`).
Pre-existing intent-001 entries simply have `etag: undefined`, which
`fetchCommits` treats as "no conditional revalidation available" — falls
back to a normal fetch and populates `etag` on the next 200, per the
story's edge case.

**`commits.content.ts` wiring**: `attach()` calls `getToken()` alongside
`getCacheEntry()`, passes `token?.access_token` and `cached?.etag` into
`fetchCommits`. On `notModified`, it calls `setCacheEntry(owner, repo, ref,
cached.commits, cached.etag)` again — reusing the existing `setCacheEntry`
(which always stamps fresh `fetchedAt`/`lastAccessed`) to satisfy
"refreshed" bookkeeping without a new cache function. No re-render, since
the cached commits are already on screen from the pre-fetch render. On a
fresh `200`, cache + render as before, now also storing the new `etag`.
`degrade()` needs no change — it does an equality check on `error.kind`,
not an exhaustive switch, so the new `unauthorized` kind compiles fine and
simply falls through to the existing generic notice text (auth-specific
"sign in again" messaging is story 009 / bolt 006's job, out of scope
here).

**Deferred (not this bolt)**: the story's "sign-out races an in-flight
fetch" edge case has no mechanism to race against yet — sign-out doesn't
exist until bolt 006. Documented here so bolt 006 knows to re-check it once
a sign-out action exists (e.g., bump `generation` or re-read `getToken()`
before writing to cache).

### Acceptance Criteria

- [ ] Token present → request carries `Authorization: Bearer {token}`; no
      token → no `Authorization` header, request otherwise identical to
      intent 001
- [ ] Private repo + signed-in user with access → renders like a public
      repo; without access → typed `not-found`, same shape as intent 001
- [ ] 401 → new `unauthorized` `FetchCommitsError` variant, not conflated
      with `not-found`/`rate-limited`
- [ ] Rate-limited carries the same `resetAt` shape (unchanged)
- [ ] `If-None-Match: {etag}` sent only when both a token and a cached
      `etag` exist; never sent unauthenticated
- [ ] `304` → cache hit, no re-parse, cached commits reused,
      `fetchedAt`/`lastAccessed` refreshed, no rate-limit impact implied
- [ ] `200` → new `ETag` captured and stored on the cache entry
- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` clean; existing `pnpm
      test` (88 tests) still green
