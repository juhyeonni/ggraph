---
stage: plan
bolt: 003-graph-ui
created: 2026-07-21T02:56:01Z
---

## Implementation Plan: 003-graph-ui

### Objective

Interactivity and hardening (milestone v0.3.0): hover tooltip + click-to-commit
via pure hit-testing, load-more through GitHub's native pagination (made correct
across pages by SHA-aligning DOM rows to fetched commits), and soft degradation
on every failure path so the host page never breaks.

### Deliverables

**New files**
- `lib/draw/hit-test.ts` — pure `hitTest(nodes, x, y, radius)` (nearest node wins)
- `lib/draw/hit-test.test.ts`
- `lib/util/relative-time.ts` — pure `formatResetIn(resetAt, now)` ("resets in 23 min")
- `lib/util/relative-time.test.ts`
- `lib/ui/tooltip.ts` — one reused absolutely-positioned tooltip element (show/hide/flip)
- `lib/ui/notice.ts` — one reused inline notice element in the rail area
- `lib/log.ts` — `[ggraph]` error-level logger (the only sanctioned console path)

**Modified files**
- `lib/draw/draw.ts` — export `laneX` (so the content script can place hit nodes)
- `lib/github/selectors.ts` — add `getRowSha(el)` (defensive commit-sha extraction)
- `entrypoints/commits.content.ts` — SHA-aligned node building, pointer hover/click,
  tooltip, degradation notices, `safe()` wrapper on every handler/async chain

### Dependencies

- Builds on bolt 002 (`fetchCommits`, cache, `computeLayout`, `drawGraph`) and
  bolt 001 (attach lifecycle, selectors). No new npm packages.

### Technical Approach

#### SHA alignment (foundation for 007 + 008)

Today `render()` aligns fetched commit `i` to DOM row `i`. That is only correct
on the first commits page (HEAD downward); on "Older" pages the DOM rows are an
offset window while the fetch still starts at HEAD, so nodes misalign (the risk
flagged at the end of bolt 002). Fix at the root: build a `sha -> layoutIndex`
map from the fetched list, read each visible DOM row's sha via `getRowSha`, and
place a node only where they match.

- `computeLayout` runs over the **full** fetched window (unchanged), so topology
  and edges stay correct.
- `rowCenters` becomes sparse: length = fetched count, defined only at the layout
  indices whose commit is currently in the DOM. `drawGraph` already skips rows
  with an undefined center and stubs edges whose target is off-window, so no
  change to `drawGraph` is needed beyond exporting `laneX`.
- The same matched set yields the hit-test `nodes` array
  (`{x: laneX(lane), y: center, data: commit}`), so 007 and 008 share one mapping.
- Load-more (008) is therefore GitHub's own Older/Newer pagination: it fires
  `wxt:locationchange`, `start()` re-attaches, the new page's rows SHA-match into
  the cached fetch (no duplicate request — AC-2), and the graph is correct for
  that page (AC-1, AC-3). Parent edges whose commit is in the window connect;
  those beyond it stub downward (AC-4). Infinite-scroll append stays out of scope
  per the story.
  `# ponytail:` upward stubs for parents of off-window children are omitted — a
  minor gap only at page boundaries; add if page-edge continuity matters.

#### Hit-testing + hover/click (007)

- `hitTest(nodes, x, y, radius)` is pure: linear nearest-within-radius (closest
  wins via squared distance). At ~40 visible nodes this is far under the 50ms
  budget. `# ponytail:` linear scan over visible nodes; bucket by y if a page
  ever shows thousands of rows.
- Canvas gets `pointer-events:auto` (it sits in the left gutter, left of the
  commit rows, so it never blocks GitHub's content). `mousemove` converts client
  coords to canvas-local, runs `hitTest`; a hit highlights the node (redraw with
  a highlight ring) and shows the tooltip (message first line, author, date,
  short sha) within the same frame; a miss hides both.
- `click` on a hit navigates to `/{owner}/{repo}/commit/{sha}`; cmd/ctrl/middle
  → `window.open(_blank)`, else same-tab. Touch tap fires click (navigates); no
  persistent hover state to get stuck.
- Tooltip is one reused element; default placement right of the pointer, flips
  left when it would overflow the viewport.

#### Soft degradation (009)

- `safe(fn)` wraps every entry point (init already wrapped; add wrapping to
  scroll/resize/mousemove/click handlers and the async attach chain) so no error
  escapes to the host page; on catch, `log.error` once (the `[ggraph]` wrapper,
  error-level only) — never console spam.
- Fetch outcomes: `rate-limited` → keep any cached (even stale) render and show a
  notice "resets in N min" (`formatResetIn`); no cache → one notice with the
  reset time. `unknown`/5xx with no cache → one generic notice. `not-found` →
  silent no-op. Missing injection point / selector mismatch → silent no-op
  (already true).
- Notice is one reused element in the rail area; exact pixel placement is
  browser-verified (MANUAL-PENDING).

### Acceptance Criteria

**Hover & click (007)**
- [ ] Pointer over a node ⇒ highlight + tooltip (message, author, date, short sha) within a frame
- [ ] Click ⇒ opens `/commit/{sha}` (same tab; cmd/ctrl/middle ⇒ new tab)
- [ ] Pointer leaves / hit misses ⇒ highlight and tooltip clear
- [ ] Rapid mousemove ⇒ no task > 50ms (pure hit-test, no per-event allocation storm)
- [ ] Two near nodes ⇒ closest wins; tooltip flips at viewport edge

**Load-more (008)**
- [ ] Older/Newer pagination ⇒ graph re-renders for that page (cache-aware, no duplicate fetch)
- [ ] Rows keep their positions within a page; growth is downward via paging
- [ ] Parent edges connect when the parent commit is in the fetched window
- [ ] End of history ⇒ GitHub's own control governs; no error

**Soft degradation (009)**
- [ ] Rate limit exhausted ⇒ cached (even stale) graph renders + inline notice with reset time
- [ ] No cache + failed fetch ⇒ exactly one concise inline notice (no console spam, no broken layout)
- [ ] Any uncaught error ⇒ contained by wrapped entry points; GitHub page stays functional
- [ ] Missing injection point / DOM change ⇒ silent no-op
