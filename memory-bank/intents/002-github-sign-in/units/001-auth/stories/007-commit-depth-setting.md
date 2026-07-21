---
id: 007-commit-depth-setting
unit: 001-auth
intent: 002-github-sign-in
status: complete
priority: should
created: '2026-07-21T04:35:00Z'
assigned_bolt: 006-auth
implemented: true
---

# Story: 007-commit-depth-setting

## User Story

**As a** developer with a specific need (e.g. a very active repo)
**I want** to configure how many commits are fetched
**So that** the graph fits my use case instead of always using the default

## Acceptance Criteria

- [ ] **Given** the settings panel, **When** opened, **Then** a commit-depth control is shown, defaulting to `DEFAULT_DEPTH` (200) from `lib/github/fetch-commits.ts`
- [ ] **Given** the user changes the depth setting, **When** saved, **Then** it persists in `chrome.storage.local` alongside other settings
- [ ] **Given** a saved custom depth, **When** the commits page next fetches, **Then** `fetchCommits` is called with that depth instead of the hardcoded default
- [ ] **Given** an invalid depth is entered (negative, zero, absurdly large), **When** submitted, **Then** it is clamped/rejected rather than passed through unchanged

## Technical Notes

- Read the setting in `entrypoints/commits.content.ts` where `fetchCommits`
  is currently called with its default depth; no change to
  `fetchCommits`'s signature beyond the existing `depth` parameter.
- Store alongside the auth-related settings key from story 003/006 (one
  small settings object, not a new storage area).

## Dependencies

### Requires
- 006-settings-panel-ui

### Enables
- None

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| No custom depth ever set | Behaves exactly like intent 001 (200 default) |
| Depth set higher than what the current rate limit budget comfortably allows | Still honored — existing pagination/cache/degradation paths already handle the resulting request count |
| Setting corrupted/missing on read | Falls back to `DEFAULT_DEPTH`, never throws |

## Out of Scope

- Rate-limit-aware auto-adjustment of depth (not requested; out of scope for this intent)
