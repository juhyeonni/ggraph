---
stage: implement
bolt: 012-graph-ux
created: '2026-07-21T06:55:00Z'
---

## Implementation Walkthrough: graph-ux (bolt 012)

### Summary

Wired bolt 011's pure relationship core into live interaction: canvas-node
hover and GitHub's own commit-row hover now drive one shared focus state that
feeds both the fade/highlight renderer and a redesigned tooltip. The old
metadata tooltip (message/author/date/sha) is fully removed and replaced with
a minimal relationship badge shown only on merge and branch-point rows.

### Structure Overview

`entrypoints/commits.content.ts`'s `render()` gained a small internal state
machine (`focus()` / `scheduleClear()`) replacing the previous single
`highlight` variable. Both the existing canvas hit-test path and a new
GitHub-row-hover binding call into the same `focus()` entry point, so there is
one source of truth for "what's focused" driving both the redraw and the
tooltip decision. `lib/ui/tooltip.ts` was redesigned around a new
`RelationshipBadge` content shape with two small pure helpers factored out for
direct unit testing, replacing the old two-line (title + metadata) DOM
layout with a single text line.

### Completed Work

- [x] `entrypoints/commits.content.ts` — renamed the focus variable
  (`highlight` → `focusedRow`), added `focus()`/`scheduleClear()` as the
  single shared entry points for both hover surfaces, added `updateBadge()`
  to decide tooltip visibility via `classifyRow`, wired `computeRelationshipHighlight`
  into the existing `draw()` call, added a second small loop binding
  `mouseenter`/`mouseleave` listeners onto the already-collected `rowEls`
  (mapped to a row index via `getRowSha` + `indexBySha`), and extended
  `cleanupDraw()` to remove the new listeners and cancel any pending
  hand-off timer.
- [x] `lib/ui/tooltip.ts` — removed `TooltipContent` and the old
  message/author/date/sha rendering entirely; added `RelationshipBadge`,
  `buildRelationshipBadge` (pure: classification + parsed merge source →
  badge, with merge-point taking priority over branch-point when a row is
  both), and `formatRelationshipBadge` (pure: badge → single display
  string). `showTooltip`/`hideTooltip`/`removeTooltip` keep the existing
  reused-single-element pattern and viewport-edge-flip positioning, now
  rendering one text line instead of a title+meta pair.
- [x] `lib/ui/tooltip.test.ts` (new) — unit tests for the two new pure
  helpers: marker precedence when a row is both a merge and a branch point,
  mergeSource being dropped for non-merge classifications, and all four
  message formats (branch-point-only, merge with no parseable source, merge
  with branch+PR, merge with branch but no PR, merge that's also a branch
  point).

### Key Decisions

- **Single shared `focus()`/`scheduleClear()` pair, not two parallel hover
  state machines**: both the canvas hit-test path and the new row-hover
  listeners call the exact same two functions, per story 003's explicit
  guidance ("one source of truth"). This also means the hand-off logic (see
  below) only has to be implemented once.
- **Hand-off via a single deferred-clear rAF, not a per-redraw throttle**:
  `scheduleClear()` defers the actual clear by one animation frame instead of
  clearing synchronously on `mouseleave`; `focus()` unconditionally cancels
  any pending clear as its first action. This satisfies the resolved Open
  Question (same-frame hand-off, not clear-then-flash) with the same rAF
  idiom already used for scroll-redraw, without adding a second throttling
  mechanism around every hover redraw (the existing row-change guard already
  keeps `draw()`+`computeRelationshipHighlight` to once per actual focus
  change).
- **Tooltip badge format always includes the numeric parent count**, even
  when a branch/PR is parseable, rather than the bolt brief's shorthand
  illustrative string that replaces the count with the branch name. Story
  005's acceptance criteria (2, 4, 5), read literally, require the parent
  count to be present on every merge badge; the brief's example string was
  treated as illustrative rather than a literal contract. Documented in
  `implementation-plan.md`'s Technical Approach §4.
- **Row-hover binds only `mouseenter`/`mouseleave`** (no `mousemove`), so a
  row-triggered badge is positioned at the entry point rather than tracking
  the cursor within the row — matches the story's technical note exactly and
  is a deliberate, low-risk simplification since GitHub's rows have no
  existing pointer-tracking behavior to regress.
- **Tooltip DOM simplified from two child elements (title + meta) to one
  text node**: the old split existed to separate the commit message from its
  metadata; the new badge content is always a single short line, so the
  split became dead structure and was removed rather than kept unused.

### Deviations from Plan

None — implementation matches `implementation-plan.md`.

### Dependencies Added

None.

### Developer Notes

- `updateBadge` is called unconditionally from `focus()` on every canvas
  `mousemove` tick (not just on row change), preserving the pre-existing
  behavior where the tooltip tracks the cursor while lingering over the same
  node. For row-hover, it's called once at `mouseenter` only, per the note
  above.
- `deduped[row]` is guarded defensively before use even though the type
  system doesn't force it (no `noUncheckedIndexedAccess`), matching the
  existing defensive-indexing style already used elsewhere in this file.
