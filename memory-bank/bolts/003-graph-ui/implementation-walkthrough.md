---
stage: implement
bolt: 003-graph-ui
created: 2026-07-21T03:05:00Z
---

## Implementation Walkthrough: graph-ui

### Summary

Made the rail interactive and failure-proof: hover shows a tooltip and
highlights the node, clicking opens the commit, and every entry point is wrapped
so no error can reach the host page. DOM rows are now aligned to fetched commits
by SHA rather than by index, which makes the graph correct across GitHub's
pagination (the "load-more" path) and is the shared mapping that hit-testing
uses.

### Structure Overview

Pure, testable logic lives in small modules (`hit-test`, `relative-time`); DOM
glue (tooltip, notice) is isolated in `lib/ui/`; the content script orchestrates
them. The renderer gained an optional highlight ring and an exported lane-x
helper so the content script can place hit-test nodes without duplicating lane
geometry.

### Completed Work

- [x] `lib/draw/hit-test.ts` - pure nearest-node-within-radius hit test over a node list
- [x] `lib/util/relative-time.ts` - pure "resets in N min / N h" formatter from an epoch-seconds reset
- [x] `lib/ui/tooltip.ts` - one reused fixed-position tooltip element with viewport-edge flip
- [x] `lib/ui/notice.ts` - one reused inline notice element anchored in the rail gutter
- [x] `lib/log.ts` - the single sanctioned `[ggraph]` error-level console wrapper
- [x] `lib/draw/draw.ts` - exports `laneX`; `DrawOptions.highlightRow` draws a ring on the hovered node
- [x] `lib/github/selectors.ts` - `getRowSha` extracts a commit sha from a row's commit link (defensive)
- [x] `entrypoints/commits.content.ts` - sha-aligned nodes, hover/click, degradation notices, `safe()` on every handler

### Key Decisions

- **SHA alignment over index alignment**: fixes the multi-page misalignment risk
  flagged at the end of bolt 002 and is the natural mapping hover/click needs, so
  007 and 008 share one code path rather than each inventing their own.
- **Load-more = GitHub's native pagination**: the existing `wxt:locationchange`
  re-attach already re-renders per page; with sha alignment each page is correct
  and cache-served (no duplicate fetch). No infinite-scroll append machinery,
  which the story puts out of scope.
- **Canvas takes pointer events**: it sits in the left gutter (left of the commit
  rows), so capturing hover/click there never blocks GitHub's content column.
- **`safe()` wrapper** around every handler and the async chain, funneling to the
  one `[ggraph]` error logger — satisfies "no uncaught error escapes, no console
  spam" with a single mechanism.

### Deviations from Plan

- Added `auxclick` alongside `click` so middle-click opens a new tab reliably
  (plain `click` does not fire for the middle button in all browsers).
- Kept `hitTest` generic (`HitNode<T>`) rather than hard-coding the commit type,
  so it is trivially unit-testable in isolation with plain data.

### Dependencies Added

- None.

### Developer Notes

- The rail canvas no longer sets `pointer-events:none`; anything that later needs
  clicks to pass through the gutter must revisit this.
- `getRowSha` relies on each row containing a `/commit/{sha}` link — best-knowledge
  against current markup; on mismatch a row just gets no node (silent, by contract).
- Upward edge stubs (parent visible, child off-window above) are intentionally
  omitted — a minor gap only at page boundaries.
- Bundle after this bolt: content script 14.13 kB uncompressed, comfortably under
  the 100 KB gzip budget.
