---
stage: implement
bolt: 007-release
created: '2026-07-21T05:50:00Z'
---

## Implementation Walkthrough: release (007-release)

### Summary

Extended the existing layout benchmark with a combined layout+draw timing
measurement, and added a standalone gzip bundle-size script. Both are plain
Node scripts with no new dependencies, following the pattern of the existing
`benchmarks/layout-bench.mjs`.

### Structure Overview

Both scripts live in `benchmarks/`, which is already excluded from Biome
linting and from `tsc` (they are `.mjs`, run directly by Node, which strips
the `.ts` type annotations from the imported product modules at runtime).
The layout+draw measurement was added to the existing benchmark file rather
than a new one, keeping one script per concern (layout sweep vs. bundle
size) but not fragmenting layout-related timing across files.

### Completed Work

- [x] `benchmarks/layout-bench.mjs` - now also imports `drawGraph` from
      `lib/draw/draw.ts` and runs a combined layout+draw timing pass at
      n=500 and n=2000, using a minimal in-file canvas/context stub and a
      one-line `window.devicePixelRatio` global stub; prints an explicit
      PASS/FAIL line per size against the 100ms budget and sets a non-zero
      process exit code on failure
- [x] `benchmarks/bundle-size.mjs` - new script; recursively finds every
      `.js` file under `.output/chrome-mv3/`, gzips each with the built-in
      `zlib.gzipSync`, sums the total, prints per-file and total gzip KB
      with an explicit PASS/FAIL against the 100KB budget, and sets a
      non-zero process exit code on failure; throws a clear error if the
      build output directory is missing

### Key Decisions

- **Canvas stub location**: kept inline in `layout-bench.mjs` rather than a
  separate stub module - it's ~30 lines, single-use, and colocating it keeps
  the "what is being timed" visible in one file.
- **Draw timing scope**: `visibleTop`/`visibleBottom` are set to cover the
  entire synthetic graph height, so every row and edge is actually drawn
  (path-building calls execute) rather than clipped away - this represents
  the "everything just rendered" worst case the roadmap budget describes,
  not a scrolled/partial viewport.
- **No new `pnpm` script for the draw benchmark**: it was added to the file
  already run by the existing `bench` script, so `pnpm bench` covers it
  without a new script entry. A new `bench:bundle-size` script is requested
  from the orchestrator (package.json is out of this bolt's ownership).
- **Bundle-size script placed in `benchmarks/`, not a new `scripts/`
  directory**: `benchmarks/` is already excluded from Biome's lint globs, so
  no scoped ignore comment is needed for its `console.log` report output;
  creating a second top-level directory for one file was unnecessary.
- **Exit codes**: both scripts set `process.exitCode = 1` on a failed budget
  check, per the Stage 3 requirement that "the scripts ARE the tests" -
  running them at the command line reflects pass/fail in the process exit
  status, not just in printed text.

### Deviations from Plan

None - matches `implementation-plan.md`.

### Dependencies Added

None. Both scripts use only Node built-ins (`node:fs`, `node:path`,
`node:zlib`, `performance.now()`).

### Developer Notes

- The draw-timing measurement only exercises JS control flow (loop over
  rows/edges, path-building calls, color lookups) against a no-op canvas
  context - it does not measure real canvas rasterization/GPU work, since
  headless Node has no canvas. This is documented in both the script's own
  comment and the test walkthrough.
- `benchmarks/bundle-size.mjs` requires a prior `pnpm build` (reads
  `.output/chrome-mv3/`); it throws immediately with a clear message if that
  directory doesn't exist yet.
- Verified `pnpm lint`, `pnpm typecheck`, and `pnpm test` (130 tests) all
  stay green - no product code (`lib/`, `entrypoints/`) was touched.
