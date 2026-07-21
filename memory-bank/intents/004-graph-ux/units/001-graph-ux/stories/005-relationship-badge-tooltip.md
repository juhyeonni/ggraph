---
id: 005-relationship-badge-tooltip
unit: 001-graph-ux
intent: 004-graph-ux
status: complete
priority: must
created: '2026-07-21T07:29:00Z'
assigned_bolt: 012-graph-ux
implemented: true
---

# Story: 005-relationship-badge-tooltip

## User Story

**As a** developer hovering a commit
**I want** to see relationship info only when a commit is structurally interesting (a merge or a branch point)
**So that** I'm not shown a tooltip repeating what GitHub's own row already tells me

## Acceptance Criteria

- [ ] **Given** I hover an ordinary commit (not a merge, not a branch point), **When** the tooltip logic runs, **Then** no tooltip is shown — the old message/author/date/sha content is fully removed, not merely hidden behind a flag
- [ ] **Given** I hover a merge commit, **When** the tooltip shows, **Then** it displays parent count, the merge-source branch (+ PR# when parseable per story 004), and a "merge point" marker
- [ ] **Given** I hover a non-merge branch point (a commit with more than one child), **When** the tooltip shows, **Then** it displays child count and a "branch point" marker, with no branch/PR line
- [ ] **Given** a commit is both a merge and a branch point, **When** the tooltip shows, **Then** it displays both parent and child counts, classified primarily as a merge point (per story 001's `classifyRow`)
- [ ] **Given** the merge message doesn't match a recognized format (story 004 returns `null`), **When** the badge renders, **Then** it still shows parent count + "merge point" marker, just without a branch/PR line — no broken/empty-looking tooltip

## Technical Notes

- Redesigns `lib/ui/tooltip.ts`: replace `TooltipContent`
  (`message`/`authorName`/`date`/`sha`) with a `RelationshipBadge` shape
  (`parentCount`, `childCount`, `mergeSource?: { branch, prNumber }`,
  `marker: "merge-point" | "branch-point"`).
- `entrypoints/commits.content.ts`'s hover handler calls `classifyRow`
  (story 001) on the focused row; only shows the tooltip when
  `isMerge || isBranchPoint`, else calls the existing `hideTooltip()` path
  unchanged.
- For merge rows, resolve the merged-in parent's commit message via the
  existing `deduped` commit lookup already in `render()`, then run story
  004's parser.

## Dependencies

### Requires
- 001-relationship-reachability (row classification)
- 004-merge-branch-parsing (branch/PR label content)
- 003-bidirectional-focus-wiring (shared focus state determines which row's badge to show)

### Enables
- None (closes out the intent)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Focus arrives via GitHub row-hover (not canvas) | Badge still shows/hides using the same classification + shared focus state — no separate code path per hover source |
| Rapid hover across several structurally-interesting rows in a row | Tooltip content updates per the existing `showTooltip` re-render path, no stale content lingers |
| Notice/tooltip overlap with `lib/ui/notice.ts` (degradation banner) | Unrelated surfaces (notice = page-level banner, tooltip = per-node) — no shared state, no visual collision beyond what already exists |

## Out of Scope

- Any on-canvas rendering of the branch/PR label (see requirements.md Open Questions — tooltip-only by default)
