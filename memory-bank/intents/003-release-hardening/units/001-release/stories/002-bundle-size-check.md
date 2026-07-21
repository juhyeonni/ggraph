---
id: 002-bundle-size-check
unit: 001-release
intent: 003-release-hardening
status: complete
priority: must
created: '2026-07-21T06:35:00Z'
assigned_bolt: 007-release
implemented: true
---

# Story: 002-bundle-size-check

## User Story

**As a** maintainer preparing the v1.0.0 release
**I want** a script that measures the gzip size of every shipped JS file
**So that** the roadmap's "≤100KB gzip" bundle budget is verified with a real number

## Acceptance Criteria

- [ ] **Given** a production build (`pnpm build`, producing `.output/chrome-mv3/`), **When** the script runs, **Then** it gzips and sums every shipped JS artifact (`background.js`, `content-scripts/commits.js`, the popup chunk(s) under `chunks/`)
- [ ] **Given** the summed gzip size, **When** the script finishes, **Then** it reports the total in KB and an explicit pass/fail against ≤100KB
- [ ] **Given** the script is run twice on the same build, **When** compared, **Then** results are identical (deterministic — no reliance on network or timing)
- [ ] **Given** the script is run after story 007's manifest changes (icons added), **When** re-run, **Then** it still reports a number (icons are separate binary assets, not JS, but the check should not silently break if the build output shape changes slightly)

## Technical Notes

- Node's built-in `zlib.gzipSync` is sufficient — no new dependency needed
  for this story.
- Current raw JS sizes observed pre-hardening: `background.js` ~4K,
  `content-scripts/commits.js` ~16K, popup chunk ~20K (~40KB raw total,
  "well under 100KB gzip" per the roadmap's Key Decisions) — this script
  produces the actual gzip figure rather than relying on that raw-size
  estimate.
- Add as a new `pnpm` script (e.g. `bench:bundle-size`) alongside the
  existing `bench`/`test`/`lint`/`typecheck` scripts in `package.json`.

## Dependencies

### Requires
- None (reads the existing `pnpm build` output)

### Enables
- 010-release-checklist (cites this story's recorded number)
- 007-manifest-release-readiness (should be re-run after icons are added, to confirm the budget still holds)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Build output directory doesn't exist yet (never built) | Script fails with a clear message to run `pnpm build` first, not a cryptic file-not-found |
| A new chunk file appears after a future dependency is added | Script sums all `.js` files under `.output/chrome-mv3/` (glob), not a hardcoded file list, so it doesn't silently miss new chunks |
| Icons/images added to the build (story 007) | Only JS is counted toward the gzip JS budget; images are a separate, non-JS concern not covered by this budget |

## Out of Scope

- Layout+draw perf (001), memory heap budget (005)
- Non-JS asset size (icons, HTML) — the roadmap budget is specifically "shipped JS (gzip)"
