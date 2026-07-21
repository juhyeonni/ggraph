---
stage: plan
bolt: 012-graph-ux
created: '2026-07-21T06:48:39Z'
---

## Implementation Plan: graph-ux (bolt 012)

### Objective

Wire bolt 011's pure relationship core (`lib/layout/relationship.ts`,
`lib/github/merge-message.ts`) and fade renderer (`lib/draw/draw.ts`) into
live interaction: canvas-node hover AND GitHub's own commit-row hover drive
one shared focus state; the old metadata tooltip is replaced with a minimal
relationship badge shown only on merge/branch-point rows.

### Deliverables

- `entrypoints/commits.content.ts` — shared `focusedRow` state (replaces
  today's `highlight` number), a `focus()`/`scheduleClear()` pair driving both
  canvas hit-testing and new row-hover listeners, wired into `draw()` (passing
  `computeRelationshipHighlight`) and a new `updateBadge()` that decides
  tooltip visibility via `classifyRow`. Row listeners registered on the
  existing `rowEls`, cleaned up in `cleanupDraw()`.
- `lib/ui/tooltip.ts` — redesigned: `TooltipContent`
  (message/authorName/date/sha) removed entirely; new `RelationshipBadge`
  shape + two pure helpers (`buildRelationshipBadge`, `formatRelationshipBadge`)
  + `showTooltip`/`hideTooltip`/`removeTooltip` adapted to the new content.
  Two-child (title+meta) DOM structure collapses to one text node (content is
  now always a single short line).
- `lib/ui/tooltip.test.ts` (new) — unit tests for the two pure helpers
  (marker precedence, format strings per acceptance criteria).
- `e2e/extension.spec.ts` + fixtures — update the existing hover assertion
  (badge text, not metadata) and add: ordinary-commit hover shows no tooltip,
  row hover produces the same highlight as canvas hover.

### Dependencies

- Bolt 011 outputs (`lib/layout/relationship.ts`, `lib/github/merge-message.ts`,
  `draw.ts`'s `highlight` option, `types/graph.ts`'s `isFirstParent`) — all
  already merged and tested; this bolt only wires them in.
- No new npm dependency.

### Technical Approach

**1. Focus state model.** Single closure-scoped `focusedRow: number |
undefined` per `render()` call (renames today's `highlight`). Two entry
points instead of today's one:
- `focus(row, clientX, clientY)`: cancels any pending clear (see hand-off
  below); redraws only `if (row !== focusedRow)` (reuses the existing
  change-guard, satisfies AC5 of story 003); always calls `updateBadge(row,
  clientX, clientY)` so the badge still tracks the cursor while lingering
  over the same canvas node (no regression to today's tooltip-follows-cursor
  behavior — AC2 of story 003).
- `scheduleClear()`: the leave path (see hand-off below).

**2. Row-hover wiring.** A second loop over the already-collected `rowEls`
(separate from the existing rowCenters/nodes loop, per the story's own
technical note): `getRowSha(el)` → `indexBySha.get(sha)` → if found, bind
`mouseenter` → `focus(idx, event.clientX, event.clientY)` and `mouseleave` →
`scheduleClear()`, both wrapped in `safe()`. No match → element is skipped,
canvas-only focus still works (story 003 AC4). Removal closures collected
into `rowCleanups` and run from `cleanupDraw()` (no leak on SPA nav/detach).

**3. Hand-off (resolved Open Question: same-frame, not clear-then-flash).**
`scheduleClear()` defers via `requestAnimationFrame` instead of clearing
synchronously; `focus()` unconditionally cancels any pending clear as its
first action. Since the DOM doesn't guarantee `mouseleave`(old surface)-then-
`mouseenter`(new surface) ordering, but both fire within the same task well
before the next animation frame, a hand-off between row↔canvas (or row↔row)
always cancels the stale clear before it runs. Only a genuine "left with
nothing re-focusing" case reaches the rAF callback and actually clears +
redraws + hides the tooltip. This reuses the exact rAF-coalescing idiom
already used for scroll-redraw (`rafId`), just for a "clear" instead of a
"draw".
- Chosen over adding a separate rAF-throttle around every hover redraw: the
  existing row-change guard already limits `draw()`+`computeRelationshipHighlight`
  to once per actual focus change (not per mousemove tick), and that
  computation is a bounded linear scan over ≤ a few hundred edges (same
  budget class as today's `hitTest`/`drawGraph` scans) — comfortably under
  50ms without extra batching.

**4. Tooltip redesign.** `lib/ui/tooltip.ts` gains:
- `RelationshipBadge { parentCount, childCount, mergeSource: MergeSource |
  null, marker: "merge-point" | "branch-point" }`.
- `buildRelationshipBadge(classification, mergeSource)`: pure, marker =
  `isMerge ? "merge-point" : "branch-point"` (merge wins when both — story
  005 AC4); `mergeSource` carried through only when `isMerge` (discarded
  otherwise, even if a caller passed one — defensive).
- `formatRelationshipBadge(badge)`: pure, single display string:
  - branch-point: `"branch point · {childCount} children"`.
  - merge-point: `"merge · {parentCount} parents"`, `+ " · from {branch}"`
    (+ `" · PR #{n}"` when parseable) when `mergeSource` present, `+ " ·
    {childCount} children"` when also a branch point (`childCount > 1`).
  - **Decision**: this always includes the numeric parent count alongside
    the branch/PR line when both are known, rather than the bolt brief's
    shorthand illustrative string (`"merge · from {branch} · PR #{n}"`
    replacing the count outright). Taken literally, story 005's ACs (2, 4,
    5) require parent count to always be present on a merge badge — this
    format satisfies AC2/AC4/AC5 word-for-word; the brief's example is
    illustrative, not a literal contract.
- `showTooltip`/`hideTooltip`/`removeTooltip`: same reused-single-element
  pattern and viewport-edge flip as today, content is now one text node
  instead of a title+meta pair (the pair existed only to separate
  message/metadata, which no longer applies).

**5. `commits.content.ts` badge wiring.** `updateBadge(row, x, y)`: `row ===
undefined` → `hideTooltip()`. Else `classifyRow(layout, row)`; neither
`isMerge` nor `isBranchPoint` → `hideTooltip()` (story 005 AC1 — old tooltip
content fully removed, no flag-hiding). Else look up `deduped[row]` (already
computed in `render()`), and if `isMerge`, `parseMergeSource(commit.message)`
(the merge commit's own message carries GitHub's generated `Merge pull
request #N from owner/branch` text) — `null` otherwise. Build the badge and
`showTooltip(...)`.

**6. `draw()` change.** Passes `highlightRow: focusedRow` (renamed) and
`highlight: focusedRow === undefined ? undefined :
computeRelationshipHighlight(layout, focusedRow)`. When no focus, both are
`undefined` → `drawGraph` already treats `undefined` highlight as "highlight
everything" (today's exact behavior, verified in `draw.ts`) — no regression
requirement satisfied for free.

**7. Cleanup.** `cleanupDraw()` additionally cancels `clearRafId` (if
pending) and runs every `rowCleanups` entry, alongside the existing canvas
listener removals and `hideTooltip()`.

### Acceptance Criteria

**Story 003 (bidirectional-focus-wiring)**
- [ ] Hovering a GitHub commit row with a matching `indexBySha` entry
      highlights that commit's relationship set exactly as hovering its
      canvas node would
- [ ] Canvas hover continues to drive the same shared focus state, no
      regression to existing hover/click/tooltip behavior
- [ ] Leaving the currently-focused surface without immediately re-entering
      the other clears focus and restores full color
- [ ] A GitHub DOM mismatch (no rows found / sha unmatched) degrades to
      canvas-only focus, no thrown error
- [ ] No recompute/redraw when the focused row is unchanged

**Story 005 (relationship-badge-tooltip)**
- [ ] Ordinary commit hover shows no tooltip (metadata content fully removed)
- [ ] Merge commit hover shows parent count + merge-source branch/PR (when
      parseable) + "merge point" marker
- [ ] Non-merge branch-point hover shows child count + "branch point" marker,
      no branch/PR line
- [ ] A commit that is both shows both counts, classified primarily as a
      merge point
- [ ] An unparseable merge message still shows parent count + marker, no
      broken/empty tooltip

### Risks / Notes

- Row-hover binds only `mouseenter`/`mouseleave` (no `mousemove`), so the
  badge position for a row-triggered tooltip is pinned to the entry point
  rather than tracking the cursor within the row — matches the story's
  technical note (`mouseenter`/`mouseleave` only) and is a reasonable,
  low-risk simplification since GitHub rows aren't currently interactive at
  all.
- `e2e/fixtures/gen-commits.ts`'s existing 30-commit fixture already places a
  merge commit at row 0 (parents `[1, 10]`) and an ordinary commit at row 1 —
  likely sufficient for both the "badge shows on merge" and "no badge on
  ordinary commit" E2E assertions without fixture changes; confirmed/adjusted
  during the Test stage if needed.
