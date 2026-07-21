---
stage: implement
bolt: 005-auth
created: 2026-07-21T05:05:21Z
---

## Implementation Walkthrough: auth (authenticated fetch + ETag)

### Summary

Extended the intent-001 fetch/cache pair with optional bearer-token
authentication and ETag conditional revalidation, then wired both through
the content script's fetch/render cycle. No new modules — every change is
additive to existing files.

### Structure Overview

Three files touched, no new ones: the pure REST module
(`lib/github/fetch-commits.ts`), the storage cache
(`lib/github/cache.ts`), and the content-script orchestration
(`entrypoints/commits.content.ts`). The pure/impure boundary from intent
001 is preserved — `fetchCommits` still takes its inputs as plain
parameters and never touches `chrome.storage` itself; the content script
remains the only place that reads the token and the cache and decides what
to pass in.

### Completed Work

- [x] `lib/github/fetch-commits.ts` - `fetchCommits` accepts optional
      `token`/`etag` parameters; attaches `Authorization: Bearer` when a
      token is present and `If-None-Match` on the first page only when a
      token and etag are both present; a `304` short-circuits to a typed
      cache-hit result; a `200` captures the response `ETag`;
      `FetchCommitsError` gains an `unauthorized` (401) variant
- [x] `lib/github/cache.ts` - `setCacheEntry` accepts an optional `etag`
      argument so callers can populate the already-reserved `CacheEntry`
      field
- [x] `entrypoints/commits.content.ts` - reads the stored token alongside
      the cache entry, passes both into `fetchCommits`, and on a cache-hit
      result refreshes the entry's timestamps instead of re-rendering
      (the cached commits are already on screen from the pre-fetch render)
- [x] `lib/github/fetch-commits.test.ts` - four pre-existing assertions
      updated to narrow past the new result union (see Deviations)

### Key Decisions

- **Etag is scoped to page 1 of the paginated fetch, not every page**: the
  cache stores exactly one `etag` per (owner, repo, ref) entry, matching
  the reserved field's shape — so conditional revalidation answers "has
  the entry as a whole gone stale," and page 1 (the most recent commits)
  is the meaningful page to ask that about. A `ponytail:` comment in
  `fetch-commits.ts` names the ceiling (a rewritten-but-page-1-unchanged
  history would be missed) and the upgrade path (per-page etags) if that
  ever matters.
- **`fetchCommits` stays storage-free on the 304 path**: rather than
  passing the previous commits back into `fetchCommits` so it can return
  them, a `304` returns a plain `{ ok: true, notModified: true }` signal.
  The caller already holds the cached entry (it read it to get the `etag`
  in the first place) and reuses its own copy — no duplicate commit data
  flowing through the pure function.
- **Result type is additive, not a breaking discriminated union**: the
  existing `{ ok: true; commits }` success shape keeps `commits` as a
  required field with a new optional `etag`; the cache-hit outcome is a
  second, distinct `ok: true` arm (`{ notModified: true }`) rather than
  changing the first arm's shape. This is why the four `if (result.ok)`
  narrows in the existing test file needed a `&& "commits" in result`
  addition — TypeScript can no longer assume `commits` exists on every
  `ok: true` result.
- **Cache refresh on a 304 reuses `setCacheEntry` itself** (called again
  with the same commits + etag) instead of adding a dedicated "touch"
  function — it already stamps a fresh `fetchedAt`/`lastAccessed` on every
  call, which is exactly what "refreshed bookkeeping" means here.
- **`degrade()` in `commits.content.ts` needed no change**: it does an
  equality check on `error.kind`, not an exhaustive switch, so the new
  `unauthorized` error kind compiles as-is and currently falls through to
  the generic failure notice. Auth-specific "sign in again" messaging is
  story 009 / bolt 006's job.

### Deviations from Plan

- Updated four assertions in `lib/github/fetch-commits.test.ts`
  (`if (result.ok)` → `if (result.ok && "commits" in result)`) that the
  plan didn't call out explicitly — required by the additive-but-widened
  result type, not a behavior change; all four still assert the exact same
  thing they did before.

### Dependencies Added

None — reuses `lib/github/token-store.ts` from bolt 004, no new packages.

### Developer Notes

- The story's "sign-out races an in-flight fetch" edge case has no
  mechanism to race against yet (sign-out ships in bolt 006). Left as a
  note for whoever builds bolt 006: re-check that a token cleared mid-flight
  doesn't get written back into the cache.
- `entrypoints/commits.content.ts` still has no dedicated test file (same
  gap noted in bolt 004 — no WXT entrypoint test harness in this repo); all
  new branching (token/etag pass-through, `notModified` handling) is
  covered indirectly by the `fetchCommits`/`cache.ts` unit tests plus a
  manual verification note in the test report.
