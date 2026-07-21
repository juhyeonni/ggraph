---
stage: plan
bolt: 002-graph-ui
created: 2026-07-21T02:20:48Z
---

## Implementation Plan: 002-graph-ui

### Objective

Replace bolt 001's dummy pipeline with the real one (milestone v0.2.0): fetch a
repo's commits (with parents) from the unauthenticated REST API, cache parsed
results in `chrome.storage.local`, compute the true DAG layout in a pure
`lib/layout/` core (fixture-verified against `git log --graph`), and render it
on the existing canvas rail — aligned to real commit rows, viewport-clipped,
HiDPI- and theme-aware.

### Deliverables

**New files**
- `lib/github/fetch-commits.ts` — `Commit` type, `DEFAULT_DEPTH`, paginated
  `fetchCommits(owner, repo, ref, depth)`, typed fetch errors
- `lib/github/fetch-commits.test.ts`
- `lib/github/cache.ts` — `chrome.storage.local`-backed TTL/LRU cache
- `lib/github/cache.test.ts`
- `lib/layout/compute-layout.ts` — real `computeLayout(commits): GraphLayout`
- `lib/layout/compute-layout.test.ts` — fixture + edge-case tests

**Modified files**
- `types/graph.ts` — new `GraphRow` / `GraphEdge` / `GraphLayout` / `LayoutCommit` shapes
- `lib/draw/draw.ts` — edge-list rendering, viewport clip, theme palettes, dangling-edge stub
- `lib/github/selectors.ts` — add `getPageTheme()`
- `lib/github/selectors.test.ts` — cover `getPageTheme()`
- `entrypoints/commits.content.ts` — real async fetch→cache→layout→draw pipeline, scroll/resize rAF redraw
- `benchmarks/layout-bench.mjs` — import real `computeLayout` instead of its inline copy

**Removed files**
- `lib/layout/dummy-layout.ts`, `lib/layout/dummy-layout.test.ts` (superseded; nothing left to call them)

### Dependencies

- Requires bolt 001-graph-ui's scaffold, selectors, dummy pipeline shape — present in the repo, used as the base to replace.
- No new npm packages. Fetch uses the platform `fetch()`; cache uses `chrome.storage.local` directly (already permitted via manifest `"storage"`); the benchmark imports the `.ts` layout module directly — verified Node v24.15.0 here executes a `.ts`→`.mjs` import with no flag and no `tsx`/`ts-node`, so no new devDependency or build step is needed.

### Technical Approach

#### Fetch location: content script (not background worker)

Story 003's own note says host_permissions cover CORS either way, so the only
remaining axis is complexity. `chrome.storage.local` and `fetch()` are both
directly usable from a content script given the existing manifest permissions
— a background worker would add message-passing plumbing for zero benefit at
this bolt's scope. Decision: fetch and cache both run in the content script.
(Revisit only if a future bolt needs to dedupe in-flight requests across
multiple open tabs — not required here.)

#### `lib/github/fetch-commits.ts`

```
export interface Commit { sha: string; parents: string[]; message: string; authorName: string; date: string }
export const DEFAULT_DEPTH = 200;
export type FetchCommitsError =
  | { kind: "not-found" }
  | { kind: "rate-limited"; resetAt: number }   // epoch seconds, from X-RateLimit-Reset
  | { kind: "unknown" };
export type FetchCommitsResult = { ok: true; commits: Commit[] } | { ok: false; error: FetchCommitsError };
export function fetchCommits(owner: string, repo: string, ref: string | undefined, depth = DEFAULT_DEPTH): Promise<FetchCommitsResult>
```

- `GET https://api.github.com/repos/{owner}/{repo}/commits?per_page=100&page=N`, add `&sha={ref}` only when `ref` is defined (undefined ref ⇒ API default branch, per AC).
- Page loop: fetch page 1; if its length is `< 100`, stop (last page, exactly matches "repo with <200 commits ⇒ no extra request"); else fetch page 2. Concatenate, slice to `depth`. Max 2 requests, matching the AC directly.
- Per coding-standards ("model expected failures as return values, not throws"): 404/403/other non-OK responses and network failures are all caught and returned as `FetchCommitsResult`, never thrown. 403 reads `X-RateLimit-Reset` (seconds) into `resetAt`.
- Parsing: raw GitHub commit JSON is treated as `unknown`; a small manual type-guard extracts `sha`, first line of `commit.message`, `commit.author.name`, `commit.author.date`, `parents[].sha` — no schema library, no `any`. Malformed individual entries are skipped rather than failing the whole page (fail-soft).

#### `lib/github/cache.ts`

Raw `chrome.storage.local` (no new storage abstraction — it's already the platform API these permissions grant).

```
interface CacheEntry { commits: Commit[]; fetchedAt: number; lastAccessed: number; etag?: string }
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 20;
function cacheKey(owner, repo, ref): string       // `ggraph:cache:${owner}/${repo}@${ref ?? ""}`
function isFresh(entry, ttlMs = DEFAULT_TTL_MS): boolean
async function getCacheEntry(owner, repo, ref): Promise<CacheEntry | null>
async function setCacheEntry(owner, repo, ref, commits: Commit[]): Promise<void>
```

- One `chrome.storage.local` key **per cache entry** (not one shared blob). This makes the "same repo+ref open in two tabs" case trivially safe — each write is a single-key `set`, so last write wins on that key with no risk of clobbering *other* repos' entries via a stale read-modify-write of a shared blob.
- `getCacheEntry` validates the stored shape (`commits` is an array, `fetchedAt`/`lastAccessed` are numbers); on mismatch it removes the key and returns `null` (discard-and-refetch, per the corrupt-entry AC). On a valid hit it also bumps `lastAccessed` (fire-and-forget `set`) — this is the "touch" that makes eviction genuinely LRU rather than FIFO.
- Staleness is the caller's decision (`isFresh(entry)`), not baked into `getCacheEntry` — this is what enables "stale renders first, then a fresh fetch replaces it": content script reads the entry unconditionally, renders it if present (any age), and only *additionally* awaits `fetchCommits` when the entry is missing or stale.
- Eviction (`setCacheEntry` → `evictIfNeeded`): `chrome.storage.local.get(null)` (fetch everything), filter keys with the `ggraph:cache:` prefix, and if count exceeds `MAX_CACHE_ENTRIES`, sort by `lastAccessed` ascending and `remove()` the oldest excess. Ballpark size check: 20 entries × ~200 commits × ~150B ≈ 600KB, comfortably under the default 10MB `chrome.storage.local` quota — no `unlimitedStorage` permission needed.
- Quota-exceeded guard: wrap the `set` in try/catch; on failure, evict half of all cache entries and retry once; if it still fails, swallow the error (never throw out of the cache module — "never crash" per AC).

#### `types/graph.ts` (new shape — replaces bolt 001's placeholder shape)

```
export interface LayoutCommit { sha: string; parents: string[] }   // structural subset of Commit
export interface GraphRow { lane: number }
export interface GraphEdge { fromRow: number; fromLane: number; toRow: number | null; toLane: number } // toRow: null = dangling parent, outside the fetched window
export interface GraphLayout { rows: GraphRow[]; edges: GraphEdge[]; laneCount: number }
```

The old shape (`GraphRow.edges: number[]`, implicitly "this row connects to the
next row") is dropped: it silently assumed a parent always lands on the very
next row, which is only true for the benchmark's synthetic generator, not for
real history (interleaved branches put a parent many rows below its child).
Representing edges explicitly as `(fromRow, fromLane) → (toRow | null, toLane)`
handles both real gaps and the fixed benchmark shape correctly, and lets
dangling parents (never resolved) fall out naturally as `toRow: null`.
`GraphRow` only needs `lane`; row index already aligns positionally with the
(deduplicated) input commit array, so no `sha` field is needed on it.

`computeLayout` takes `LayoutCommit[]` (not the full `Commit[]`) so `lib/layout/`
never needs to know about the github fetch type — `Commit[]` already satisfies
`LayoutCommit[]` structurally, and the benchmark's `{sha, parents}` synthetic
commits satisfy it too, unchanged.

#### `lib/layout/compute-layout.ts` — algorithm evaluation and design

**Verdict on `benchmarks/layout-bench.mjs`'s inline `layout()`**: the core
mechanic (an array of "lanes", each holding the sha it's waiting for; reuse
freed/`null` lanes before growing) is the correct, standard gitk-style lane
assignment and is worth keeping — it's what gives lane compaction and root/
orphan closure for free, and its performance is already measured (~1.3ms/500
commits). But its *output* (`{x, y, edges: laneIndices[]}`, one entry per row)
bakes in an assumption that doesn't hold on real data: it treats "next row" as
always being where a parent lands, which is only true because its synthetic
generator makes primary parents strictly adjacent. Absorbed with a fix, not
absorbed verbatim.

**Adapted algorithm** (newest-first input, matching the GitHub API order):

1. Deduplicate input by `sha`, keeping first occurrence (defensive AC).
2. Maintain `lanes: (string | null)[]` (lane → sha it's waiting for) and
   `pendingEdge: (GraphEdge | null)[]` (lane → the not-yet-resolved edge object
   targeting that lane), both grown lazily.
3. For row `i`, commit `c`:
   - `lane = lanes.indexOf(c.sha)`; if found, resolve `pendingEdge[lane].toRow = i` (this row is where that edge lands). If not found, `lane = lanes.indexOf(null)` or a new lane — this is a root of the visible window (no incoming edge to resolve).
   - `rows[i] = { lane }`.
   - For each parent (`p = 0` continues in `lane`; `p ≥ 1` finds-or-allocates its own lane the same way): push a new `GraphEdge{fromRow: i, fromLane: lane, toRow: null, toLane: pLane}`, set `lanes[pLane] = parentSha`, `pendingEdge[pLane] = thatEdge`. A commit with zero parents just leaves `lanes[lane] = null` (closes cleanly, freed for reuse — orphan/root AC).
   - Sweep other lanes still equal to `c.sha` (criss-cross merges converging here): resolve their `pendingEdge.toRow = i` too, then free them.
4. After the loop, any edge with `toRow` still `null` is dangling (parent SHA outside the fetched window) — the renderer draws it to a bottom marker, per AC.
5. `laneCount = lanes.length` (high-water mark).

Same big-O shape as the benchmark (`indexOf` scan per commit/parent), so the
already-measured performance (well under the 10ms/500-commit budget) carries
over; no algorithmic complexity added, only bookkeeping for correct row
attribution.

#### Fixture format

Inline in `compute-layout.test.ts` — four small hand-built `LayoutCommit[]`
literals (linear chain, single merge, criss-cross merge, octopus merge, each
~5-8 commits), each asserted against its expected `rows[].lane` /
`edges[]`. A separate `fixtures/` directory is unwarranted for four small
literals; keeping them next to their assertions is the shorter, equally
inspectable diff. During Stage 3 authoring, each topology gets sanity-checked
against real `git log --graph --oneline` output from a throwaway scratch repo
(shas/parents and column layout transcribed by eye) — the check happens once
at authoring time, not at test-run time (the module stays dependency-free).
Additional non-fixture cases: dangling parent (`toRow: null`), octopus (3+
parents all routed), orphan mid-list, duplicate shas, empty input, single
commit.

#### Renderer integration (`entrypoints/commits.content.ts`, `lib/draw/draw.ts`)

- `sync()` becomes async. Row measurement stays synchronous and unchanged
  (bounded retry poll, as today). Once rows are found: parse `owner/repo/ref`
  via the existing `parseCommitsPath` (currently imported nowhere — this bolt
  wires it in; `isCommitsPage`'s check is derived from the same parse instead
  of re-parsing).
- Cache-first, stale-allowed flow: `entry = await getCacheEntry(...)`; if
  present, `render(entry.commits)` immediately (regardless of freshness); if
  absent or `!isFresh(entry)`, `result = await fetchCommits(...)` and, on
  success, `setCacheEntry(...)` + re-`render()`. On failure with no entry to
  fall back on: silent no-op (bolt 003 owns degradation UI; this bolt keeps
  today's "failure = no rail" contract).
- **Stale-async guard**: capture a generation counter, incremented each time
  `start()` runs (SPA nav). Before rendering the result of an `await`, check
  the token is still current; otherwise discard — prevents a slow fetch from
  a page the user already navigated away from painting onto the wrong rail.
- `render(commits)` = `computeLayout(commits)` + measure row rects (unchanged
  from bolt 001) + `drawGraph(...)`, and additionally registers scroll/resize
  listeners (once per attach) driving a `requestAnimationFrame`-throttled
  redraw: scroll recomputes only the visible row range and redraws (cheap);
  resize re-runs the full `sync()` (rows may have reflowed).
- `drawGraph` gains a visible-range parameter (canvas-local pixel top/bottom)
  and a `theme: "light" | "dark"` parameter:
  - Only rows whose center falls in range (± one row of buffer) get their node
    drawn; only edges whose `[min(y1,y2), max(y1,y2)]` span overlaps the range
    get stroked. `ctx.clearRect` is likewise limited to the visible band, not
    the full (possibly multi-thousand-pixel-tall) canvas — this is what keeps
    scroll cheap, not the canvas's total size.
  - A linear scan over `rowCenters` to find the visible index range is fine at
    this scale (≤500 rows); noted as the simplification to revisit only if
    depth grows far past today's 200-commit budget.
  - Dangling edges (`toRow: null`) draw a short fixed-length stub below the
    origin node rather than resolving a target row/lane.
  - Two small fixed 6-color palettes (light/dark), keyed off lane index same
    as today; `theme` picks which array.
- `lib/github/selectors.ts` gains `getPageTheme(): "light" | "dark"`: reads
  `document.documentElement.getAttribute("data-color-mode")` (GitHub's own
  attribute), falling back to `window.matchMedia("(prefers-color-scheme: dark)")`
  when it's `"auto"` or absent; wrapped in try/catch, defaulting to `"light"` —
  consistent with every other selector in this module never throwing. "Theme
  switched live" needs no listener: it's read fresh on every draw call, so the
  next scroll/resize redraw already picks up the change.

#### Benchmark rewiring

Verified in this environment: Node v24.15.0 imports a `.ts` file from a plain
`.mjs` script with no flag and no added dependency (native type-stripping).
`benchmarks/layout-bench.mjs` keeps its `genCommits` synthetic generator
as-is (already produces `{sha, parents}`, which satisfies `LayoutCommit`)
and its `bench()`/timing loop as-is; only the inline `layout()` function is
deleted and replaced with `import { computeLayout } from "../lib/layout/compute-layout.ts";`,
with the one call-site and its result-shape reference (`result.length` →
`result.rows.length`) updated to match `GraphLayout`.

### Acceptance Criteria

**Fetch (003)**
- [ ] `GET /repos/{o}/{r}/commits?sha=R&per_page=100` fires on attach, paginated to depth 200, ≤2 requests
- [ ] Parsed `Commit{sha, parents[], message (first line), authorName, date}`, strictly typed, no `any`
- [ ] No ref in URL ⇒ API default branch used (no `sha` param sent)
- [ ] Repo with <200 commits ⇒ stops at last page, no extra request
- [ ] 404 ⇒ typed not-found error; 403 ⇒ typed rate-limited error carrying reset time from headers

**Cache (004)**
- [ ] Successful fetch ⇒ stored in `chrome.storage.local`, keyed by owner+repo+ref, with a fetch timestamp
- [ ] Cached + within TTL ⇒ renders from cache with zero API requests
- [ ] Over size cap ⇒ least-recently-used entries evicted on write
- [ ] Expired entry ⇒ stale may render first, then a fresh fetch replaces it
- [ ] Quota exceeded ⇒ evicts aggressively, never throws/crashes
- [ ] Corrupt/legacy entry shape ⇒ discarded, refetched
- [ ] Same repo+ref in two tabs ⇒ last write wins, no cross-entry corruption

**Layout (005)**
- [ ] `computeLayout(commits): GraphLayout` returns per-row lane, an explicit edge list, and total lane count
- [ ] Fixture topologies (linear, single merge, criss-cross, octopus) match `git log --graph` reference
- [ ] `lib/layout/` imports nothing from DOM/network/`chrome.*`
- [ ] `benchmarks/layout-bench.mjs` imports the real module; 500 commits lay out in <10ms
- [ ] Parent SHA outside fetched window ⇒ edge with `toRow: null` (bottom marker)
- [ ] Octopus merge (3+ parents) ⇒ all parent edges routed
- [ ] Orphan/root commit mid-list ⇒ lane closes cleanly (freed for reuse)
- [ ] Duplicate SHAs in input ⇒ deduplicated defensively

**Render (006)**
- [ ] Node y-position aligns to real commit row rects, including across date-group headers
- [ ] 500-commit graph: layout+draw <100ms budget, zero per-commit DOM nodes
- [ ] HiDPI displays: crisp lines/nodes (devicePixelRatio-aware sizing)
- [ ] Light/dark GitHub theme ⇒ readable colors in both, derived from the page's theme attribute
- [ ] Window resize/zoom ⇒ rail re-measures and redraws correctly
- [ ] Long commit messages (taller rows) ⇒ alignment follows actual rects, not a fixed row height
- [ ] Theme switched live ⇒ colors correct on next draw
- [ ] Scroll ⇒ rAF-throttled redraw, viewport-clipped (only visible rows drawn/cleared)
