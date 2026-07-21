---
intent: 004-graph-ux
phase: inception
status: complete
created: '2026-07-21T07:10:00Z'
updated: '2026-07-21T07:40:00Z'
---

# Requirements: Graph Relationship Highlight & Tooltips

## Intent Overview

Grounded in GitHub Issue #6 ("Graph relationship highlight + relationship-only
tooltips") and a prior user consultation that already fixed the design — this
intent does not re-open the design, only elaborates it. The extension's graph
rail currently repeats information GitHub's own commit row already shows
(message/author/date/sha) and gives no relationship insight. This intent adds:
bidirectional relationship highlighting (first-parent chain + merge edges,
fading everything else) driven by either a canvas node focus or hovering
GitHub's own commit row, and replaces the redundant metadata tooltip with a
minimal relationship badge shown only on structurally-interesting commits
(merge points, branch points).

This is a v1.1+ graph-UX enhancement (`memory-bank/roadmap.md`, "Later"
section) layered entirely on top of the already-complete intent 001
(`commit-graph-on-commits-page`) rendering pipeline — `lib/draw/`,
`lib/layout/`, `entrypoints/commits.content.ts`, `lib/ui/tooltip.ts`,
`lib/github/selectors.ts`. It does not touch fetching, caching, or auth
(intents 001/002), and does not touch release tooling (intent 003).

## Business Goals

| Goal | Success Metric | Priority |
|------|-----------------|----------|
| Stop repeating info GitHub's row already shows | Ordinary commit hover shows no tooltip at all | Must |
| Make first-parent/merge topology visible on focus | Focusing any commit highlights its first-parent chain + merge edges and fades everything else | Must |
| Let developers use either surface to inspect relationships | Hovering a GitHub commit row highlights the graph exactly as hovering its canvas node would | Must |
| Keep it fast and host-safe | Highlight recompute/redraw stays within existing hover budget; row-hover wiring never breaks the host page | Must |

## Scope

**In scope**: first-parent edge tagging in the layout core; pure reachable-set
computation (first-parent chain up + down, plus direct merge edges of any
merge commit on that chain); pure merge/branch-point row classification;
fade/de-emphasis rendering for everything outside the highlighted set;
bidirectional focus wiring (canvas node hover and GitHub commit-row hover
driving the same highlight, clearing on leave); pure parsing of GitHub's
generated merge-commit message format (`from owner/branch` + PR#); a
relationship-badge tooltip shown only on merge/branch-point nodes; removal of
the current metadata tooltip (message/author/date/sha) entirely.

**Out of scope**: ref decoration badges (branch/tag heads) — explicit,
separate future effort per the decided design; on-canvas rendering of the
branch/PR label (surfaces only in the tooltip badge — see Open Questions);
any change to data fetching, caching, or auth (intents 001/002 untouched); any
change to the lane/row assignment algorithm itself (only an additive edge
field).

---

## Functional Requirements

### FR-1: First-Parent Edge Tagging (Layout Core)
- **Description**: `computeLayout` (`lib/layout/compute-layout.ts`) tags each
  `GraphEdge` it produces with whether it is the commit's first-parent edge
  (`parents[0]`), so downstream relationship logic can walk the chain using
  only row/edge indices — no re-fetching of sha/parent strings.
- **Acceptance Criteria**: `GraphEdge` gains an `isFirstParent: boolean`
  field; for every row with N parents, exactly one outgoing edge
  (`parents[0]`) has `isFirstParent: true`; existing `compute-layout.test.ts`
  fixtures continue to pass unchanged (purely additive field, no behavior
  change to lanes/rows).
- **Priority**: Must
- **Related Stories**: 001-relationship-reachability

### FR-2: Relationship Reachable-Set Computation (Pure)
- **Description**: A new pure function, given a `GraphLayout` and a focused
  row index, returns the set of rows/edges to highlight: the focused
  commit's first-parent chain walked toward ancestors (following
  `isFirstParent` edges where `fromRow` is the current row) and toward
  descendants (following `isFirstParent` edges where `toRow` is the current
  row — fanning out to every descendant when a branch point has more than
  one first-parent child), plus, for every merge commit visited along that
  chain (a row with more than one outgoing edge), all of that row's outgoing
  edges — without continuing the walk past those extra edges' endpoints.
- **Acceptance Criteria**: a linear chain with no merges highlights every
  row/edge in the chain; a merge commit on the chain highlights both of its
  parent edges even though only one is `isFirstParent`; a branch point
  (more than one child sharing this row as first parent) includes every one
  of those children's chains in the result; focusing the root or head commit
  terminates without error (dangling `toRow: null` / no matching
  `isFirstParent` edge simply stops that direction); tested with DAG
  fixtures in the same style as `compute-layout.test.ts`.
- **Priority**: Must
- **Related Stories**: 001-relationship-reachability

### FR-3: Merge/Branch-Point Row Classification (Pure)
- **Description**: A pure helper, given a `GraphLayout` and a row index,
  reports `parentCount` and `childCount` (counted directly from `edges` by
  `fromRow`/`toRow`) and derives `isMerge` (`parentCount > 1`) and
  `isBranchPoint` (`childCount > 1`). Shared by the reachable-set
  computation (FR-2) and the tooltip badge decision (FR-7) so "what counts
  as a merge/branch point" is defined once.
- **Acceptance Criteria**: a normal single-parent, single-child row
  classifies as neither; a merge commit (2 parents) classifies
  `isMerge: true`; a commit referenced as a parent by two different rows
  classifies `isBranchPoint: true`; a commit can be both simultaneously.
- **Priority**: Must
- **Related Stories**: 001-relationship-reachability

### FR-4: Fade/De-Emphasis Rendering
- **Description**: `drawGraph` (`lib/draw/draw.ts`) accepts the highlighted
  row/edge set from FR-2 via `DrawOptions` and renders every lane/node/edge
  NOT in that set at a reduced-opacity ("faded") variant of its lane color,
  while highlighted rows/edges keep full `LANE_COLORS` saturation. When no
  focus is active, rendering is identical to today (full color everywhere)
  — a regression-safety requirement.
- **Acceptance Criteria**: no active focus → output unchanged from before
  this intent; an active focus → highlighted nodes/edges render at full
  lane color, everything else at a visibly reduced alpha; the existing
  focused-node ring (`highlightRow`) is preserved unchanged for the exact
  focused node.
- **Priority**: Must
- **Related Stories**: 002-fade-highlight-render

### FR-5: Merge-Source-Branch + PR Parsing (Pure)
- **Description**: A pure parser, given a commit message string, extracts
  the merge source in GitHub's generated formats:
  `Merge pull request #{n} from {owner}/{branch}` →
  `{ branch, prNumber: n }`, and `Merge branch '{branch}'` (no PR) →
  `{ branch, prNumber: null }`. Any message not matching either shape
  returns `null`.
- **Acceptance Criteria**: the exact GitHub PR-merge string parses to the
  correct branch (including branch names containing additional `/`) and PR
  number; a plain `Merge branch 'foo'` message parses to
  `{ branch: "foo", prNumber: null }`; an unrelated (non-merge) commit
  message returns `null` without throwing.
- **Priority**: Must
- **Related Stories**: 004-merge-branch-parsing

### FR-6: Bidirectional Focus Wiring
- **Description**: Hovering a canvas node (existing `hitTest` in
  `entrypoints/commits.content.ts`) OR hovering one of GitHub's own
  commit-row elements (`rowEls`, already collected via
  `findCommitRowEls`) sets the same shared focused-row state, which drives
  the reachable-set computation (FR-2) and a redraw with fade (FR-4).
  Leaving either source (canvas `mouseleave` or row `mouseleave`) clears
  focus and restores full color.
- **Acceptance Criteria**: hovering a GitHub commit row highlights the
  corresponding graph node/lane exactly as hovering that canvas node would;
  canvas hover continues to work unchanged; moving off whichever surface is
  focused clears the highlight; row-hover listeners are wrapped in the same
  `safe()` silent-failure pattern as existing canvas handlers, so a GitHub
  DOM change that breaks row matching degrades to canvas-only focus rather
  than throwing into the host page.
- **Priority**: Must
- **Related Stories**: 003-bidirectional-focus-wiring

### FR-7: Relationship-Badge Tooltip (Replaces Metadata Tooltip)
- **Description**: Remove the current tooltip content (`message`/
  `authorName`/`date`/`sha`) shown on every node hover. Show a tooltip only
  when the hovered/focused row classifies (FR-3) as `isMerge` or
  `isBranchPoint`: parent count, and — for merges — the branch/PR label
  parsed by FR-5 plus a "merge point" marker; for branch points without a
  merge, child count plus a "branch point" marker. Ordinary rows get no
  tooltip at all.
- **Acceptance Criteria**: hovering an ordinary commit shows no tooltip (the
  old message/author/date/sha content is fully removed, not merely hidden
  behind a flag); hovering a merge commit shows parent count + merge-source
  branch/PR (when parseable) + a merge-point marker; hovering a non-merge
  branch point shows child count + a branch-point marker and no branch/PR
  line; a commit that is both classifies primarily as a merge point,
  showing both parent and child counts.
- **Priority**: Must
- **Related Stories**: 005-relationship-badge-tooltip

---

## Non-Functional Requirements

### Performance
| Requirement | Metric | Target |
|-------------|--------|--------|
| Highlight recompute cost | Task time per hover-triggered recompute+redraw | <50ms; reuses the existing rAF/hit-test-guarded pattern (recompute only on focused-row change, not every mousemove tick) |
| No regression to draw budget | vs. intent 001 budget | <100ms/500 commits still holds with fade rendering enabled |

### Reliability
| Requirement | Metric | Target |
|-------------|--------|--------|
| Row-hover wiring degrades safely | GitHub DOM/selector mismatch | Falls back to canvas-only focus; no thrown error reaches the host page (same silent-failure contract as `findCommitRowEls`/`safe()`) |
| No-focus is the default/rest state | Extension load, no hover yet | Full color, no tooltip — identical to intent 001's original behavior |

### Compatibility
| Requirement | Metric | Target |
|-------------|--------|--------|
| Pure layout core stays pure | `lib/layout/` | No DOM, network, or `chrome.*` API in any new file under `lib/layout/` |
| Chrome MV3, host-page safety | Same as intent 001 | No new host permissions; extension failures remain silent-safe |

---

## Constraints

### Technical Constraints

**Project-wide standards**: loaded from `memory-bank/standards/` by the
Construction Agent.

**Intent-specific constraints**:
- Extends `lib/draw/`, `lib/layout/`, `lib/github/selectors.ts`,
  `entrypoints/commits.content.ts`, `lib/ui/tooltip.ts` rather than
  replacing them wholesale.
- Ref decoration badges (branch/tag heads) explicitly out of scope, per the
  decided design — separate future effort.
- No on-canvas text rendering: `draw.ts` currently renders no text at all;
  the branch/PR label surfaces only via the tooltip badge, not drawn on the
  canvas (see Open Questions).

### Business Constraints
- None identified.

---

## Assumptions

| Assumption | Risk if Invalid | Mitigation |
|------------|-------------------|------------|
| GitHub's generated merge-commit message format (`Merge pull request #N from owner/branch`) remains stable | Branch/PR parsing (FR-5) returns `null` more often, degrading tooltip content only, not the highlight's correctness | Parser returns `null` (never throws) for unrecognized formats; the badge simply omits the branch/PR line |
| Commit depth (default 200, or user-configured per intent 002) keeps the DAG small enough for chain/fan-out highlighting to stay cheap | Slow highlight recompute at very old branch points on unusually large histories | Depth is already bounded by intent 002's `commitDepth` setting; no new unbounded traversal is introduced |

---

## Open Questions

| Question | Owner | Due Date | Resolution |
|----------|-------|----------|------------|
| When walking the first-parent chain "upward" (toward descendants) and a branch point has more than one child whose first parent is the current row, do we highlight only one child's line or every child's line? | Construction | Bolt 011-graph-ux planning | Resolved with default: highlight the union of every such child's line (inclusive fan-out). The commit DAG is already bounded by `commitDepth`, so the cost is negligible, and excluding a valid first-parent descendant would read as a rendering bug rather than a deliberate choice. |
| Does the merge-source branch/PR label ever render on the canvas itself (near the merged-in edge), or only inside the tooltip badge? | Construction | Bolt 012-graph-ux planning | Resolved with default: tooltip-only. `draw.ts` has no text-rendering path today, and adding one is scope beyond the "minimal relationship badge" the issue asked for. |
| Where focus moves directly from a GitHub row to the canvas (or vice versa) without an intervening empty gap, is that a "clear then set" or a hand-off? | Construction | Bolt 012-graph-ux planning | Resolved with default: treat it as a hand-off, not a clear-then-flash. The DOM does not guarantee ordering between the old source's `mouseleave` and the new source's `mouseenter`/`mousemove`, so only clear focus if nothing re-set it within the same animation frame — mirrors the existing rAF-guarded scroll-redraw pattern. |
