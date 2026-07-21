---
id: 004-merge-branch-parsing
unit: 001-graph-ux
intent: 004-graph-ux
status: complete
priority: must
created: '2026-07-21T07:28:00Z'
assigned_bolt: 011-graph-ux
implemented: true
---

# Story: 004-merge-branch-parsing

## User Story

**As a** developer looking at a merge commit
**I want** the extension to recognize which branch/PR was merged in
**So that** the relationship badge can label the merged-in line meaningfully

## Acceptance Criteria

- [ ] **Given** a message in the exact format GitHub generates for a merged PR (`"Merge pull request #79 from juhyeonni/dev"`), **When** parsed, **Then** the result is `{ branch: "juhyeonni/dev", prNumber: 79 }`
- [ ] **Given** a branch name that itself contains additional `/` (e.g. `"Merge pull request #12 from someorg/feature/nested-thing"`), **When** parsed, **Then** the full `"someorg/feature/nested-thing"` is preserved as `branch`
- [ ] **Given** a plain local merge message with no PR (`"Merge branch 'foo'"`), **When** parsed, **Then** the result is `{ branch: "foo", prNumber: null }`
- [ ] **Given** any commit message that doesn't match either recognized shape (including a non-merge commit message), **When** parsed, **Then** the function returns `null` without throwing

## Technical Notes

- New pure module, e.g. `lib/github/merge-message.ts`, following the same
  "pure logic extracted for direct unit-testing" pattern as
  `lib/github/degrade.ts`.
- Input is a plain `string` (the commit's `message` field, already
  available on `Commit` from `lib/github/fetch-commits.ts`) — no
  network/DOM involved.
- Only needs to recognize GitHub's own generated formats; arbitrary
  hand-written merge messages are expected to return `null` (the badge
  simply omits the branch/PR line, per requirements.md Assumptions).

## Dependencies

### Requires
- None (fully independent pure utility)

### Enables
- 005-relationship-badge-tooltip (consumes the parsed result for the merge label)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| PR number with unusual formatting (leading zeros, very large number) | Parsed as a plain integer via the regex capture, no special-casing needed |
| Message has trailing merge-conflict resolution text after the first line | Only the recognized prefix pattern is matched; trailing text is ignored |
| Empty string / unexpected input | Returns `null` (defensive, matches `degrade.ts`/`selectors.ts` style of never throwing on unexpected input) |

## Out of Scope

- Deciding WHEN to show this in a tooltip (005) — this story only parses
