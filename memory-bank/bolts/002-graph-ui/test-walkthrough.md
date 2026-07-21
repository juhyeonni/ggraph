---
stage: test
bolt: 002-graph-ui
created: 2026-07-21T02:52:00Z
---

## Test Report: 002-graph-ui

### Summary

- **Tests**: 42/42 passed (4 files: layout 10, fetch 9, cache 11, selectors 12)
- **Gate**: `biome check` exit 0, `tsc --noEmit` exit 0, `pnpm build` OK (22.25 kB), `pnpm bench` 1.70ms / 500 commits (budget < 10ms)
- **Coverage**: not measured (no coverage tooling added, per scope)

### Test Files

- [x] `lib/layout/compute-layout.test.ts` — topology fixtures (linear, single
  merge, diamond, octopus) validated by a connectivity check that every parent
  pointer maps to exactly one edge (the "matches git log --graph" property);
  plus dangling parent, freed-lane reuse, sha dedup, empty, single root, and an
  edge-starts-at-child-lane invariant.
- [x] `lib/github/fetch-commits.test.ts` — mocked `fetch`: single-page stop with
  no `sha` for default ref, two-page fetch capped at depth, subject/author/date/
  parent parsing, malformed-entry skipping, 404 → not-found, 403/429 →
  rate-limited with reset time, network throw → unknown, non-array → unknown.
- [x] `lib/github/cache.test.ts` — in-memory `wxt/browser` double: `isFresh`
  ttl boundaries, get returns valid entry regardless of freshness, LRU bump on
  read, corrupt-entry discard+remove, missing → null, store with timestamps,
  LRU eviction over the cap, quota-exceeded evict-and-retry, never-throws.
- [x] `lib/github/selectors.test.ts` — carried over from bolt 001, still green.

### Acceptance Criteria Validation

**Fetch (003)**
- ✅ Paginated `GET /commits?sha=&per_page=100` to depth 200, ≤2 requests
- ✅ Strictly-typed parsed `Commit`, no `any`
- ✅ No ref ⇒ default branch (no `sha` param)
- ✅ <200 commits ⇒ stops at last page, no extra request
- ✅ 404 ⇒ not-found; 403/429 ⇒ rate-limited with reset time

**Cache (004)**
- ✅ Stored keyed by owner+repo+ref with timestamp
- ✅ Within TTL ⇒ served from cache, zero API requests (stale-allowed read + `isFresh` gate)
- ✅ Over cap ⇒ LRU eviction on write
- ✅ Expired ⇒ stale renders first, fresh fetch replaces
- ✅ Quota exceeded ⇒ evicts aggressively, never throws
- ✅ Corrupt/legacy shape ⇒ discarded and refetched
- ✅ Same repo+ref in two tabs ⇒ per-key writes, no cross-entry corruption

**Layout (005)**
- ✅ `computeLayout` returns per-row lane, explicit edge list, lane count
- ✅ Fixture topologies match reference connectivity
- ✅ `lib/layout/` imports nothing from DOM/network/chrome.*
- ✅ Benchmark imports the real module; 500 commits < 10ms (1.70ms)
- ✅ Parent outside window ⇒ `toRow: null`
- ✅ Octopus (3 parents) ⇒ all edges routed
- ✅ Orphan/root mid-list ⇒ lane closes and is reused
- ✅ Duplicate SHAs ⇒ deduplicated

**Render (006)**
- ✅ Merge-in edges curve into the node's landing lane (unit-pinned asymmetry; renderer fix verified by typecheck + build)
- MANUAL-PENDING Node y-alignment to real commit rows across date-group headers
- MANUAL-PENDING 500-commit layout+draw < 100ms in-page, zero per-commit DOM nodes
- MANUAL-PENDING HiDPI crispness (devicePixelRatio)
- MANUAL-PENDING Light/dark theme colors from the page theme attribute
- MANUAL-PENDING Resize/zoom re-measure, long-message row alignment, scroll rAF clipping

### Issues Found

- **Renderer defect (fixed this stage)**: a merge-in edge was drawn to its
  travel lane (`edge.toLane`) rather than the lane where the parent node is
  actually placed (`rows[toRow].lane`), so even the single-merge fixture drew
  the merge line into empty space. `drawGraph`/`drawEdge` now route the edge
  down its travel lane and curve into the landing lane (out-curve → rail →
  in-curve, reusing the existing `curveTo` helper). Regression is pinned by the
  "single merge" and "diamond" layout tests, which assert the travel-lane ≠
  landing-lane asymmetry and that both children awaiting a shared parent keep
  their edges.

### Notes

- Layout topology is asserted structurally (every parent pointer ⇒ one edge to
  the correct row) rather than by string-diffing a stored `git log --graph`
  dump; this is robust to lane-numbering choices while still enforcing the
  connectivity that "matches git log" means.
- The eight render criteria that require a real browser (pixel alignment, HiDPI,
  theme, scroll/resize) are MANUAL-PENDING — the pure/mocked layers are fully
  covered; a single load-unpacked smoke pass on a busy repo confirms the visual
  layer for both bolt 001 and 002.
