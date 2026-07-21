---
id: 001-extension-scaffold
unit: 001-graph-ui
intent: 001-commit-graph-on-commits-page
status: complete
priority: must
created: '2026-07-21T01:45:00Z'
assigned_bolt: 001-graph-ui
implemented: true
---

# Story: 001-extension-scaffold

## User Story

**As a** developer of ggraph
**I want** a working WXT + TypeScript + Preact extension scaffold with the full dummy pipeline
**So that** every later story builds on a proven toolchain

## Acceptance Criteria

- [ ] **Given** the repo, **When** I run `pnpm dev` / `pnpm build`, **Then** WXT produces a loadable MV3 extension with only github.com/api.github.com host permissions and `storage`
- [ ] **Given** the built extension loaded unpacked in Chrome, **When** I open any `github.com/{owner}/{repo}/commits` page, **Then** a canvas rail with a hardcoded dummy DAG is visible
- [ ] **Given** the codebase, **When** I run `pnpm test` / Biome / `tsc --noEmit`, **Then** all pass in CI-equivalent local run

## Technical Notes

- Project structure per `standards/coding-standards.md`: `entrypoints/`, `lib/layout|github|draw`, `ui/`, `types/`, `benchmarks/`
- Dummy data flows through the real pipeline shape: layout module → draw module
- Include `benchmarks/layout-bench.mjs` wiring (`pnpm bench`)

## Dependencies

### Requires
- None (first story)

### Enables
- All other stories

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Non-commits GitHub page | No canvas injected |
| Extension reloaded while page open | No duplicate canvas |

## Out of Scope

- Real page detection logic (002), real data (003), real layout (005)
