---
stage: plan
bolt: 007-release
created: '2026-07-21T05:40:00Z'
---

## Implementation Plan: release (007-release)

### Objective

Produce two recorded, runnable measurements for the v1.0.0 exit criteria:
(1) combined layout+draw time for a ≥500-commit synthetic DAG, and (2) the
gzip size of the shipped production JS bundle — both asserted against their
roadmap budgets (<100ms, ≤100KB) instead of left as unmeasured claims.

### Deliverables

- `benchmarks/layout-bench.mjs` extended with a layout+draw combined
  measurement at n=500 and n=2000, using a minimal canvas stub (no real
  GPU/DOM), printing an explicit pass/fail line against the <100ms budget.
- `benchmarks/bundle-size.mjs` (new file, same directory as the existing
  benchmark — already excluded from Biome lint, so no scoped ignore needed):
  globs every `*.js` under `.output/chrome-mv3/`, gzips each with
  `zlib.gzipSync`, sums, and prints total KB + pass/fail against ≤100KB.
- `memory-bank/bolts/007-release/implementation-walkthrough.md` and
  `test-walkthrough.md` (stages 2/3).
- Recorded measurements committed as console output captured into
  `test-walkthrough.md` (no separate JSON/log file — the story only requires
  the number to be committed to the repo, and the walkthrough is already a
  repo-tracked markdown file, so a second output file would be redundant).

### Dependencies

- None new. Node built-in `zlib` (gzip), `fs`/`path` (glob via `fs.readdirSync`
  recursion — no glob library needed for one directory of ~3 files),
  `performance.now()` (already used by the existing benchmark).
- Reads `.output/chrome-mv3/` produced by `pnpm build` (run as a read-only
  verification step, does not touch shared config).

### Technical Approach

**Layout+draw harness** (story 001):
- Reuse `genCommits` (already in `layout-bench.mjs`) to build the same
  synthetic DAG used for the layout-only sweep — no new generator.
- `drawGraph(canvas, layout, rowCenters, options)` in `lib/draw/draw.ts`
  expects an `HTMLCanvasElement`-shaped object (`getContext`, `clientWidth`,
  `clientHeight`, a writable `width`/`height`) and reads `window.devicePixelRatio`
  at module scope via the global `window`. In plain Node neither exists, so
  the script stubs both minimally:
  - A canvas stub object exposing `clientWidth`/`clientHeight` (fixed
    values), a `getContext()` that returns one shared no-op 2D context object
    whose methods (`save`, `restore`, `beginPath`, `rect`, `clip`,
    `clearRect`, `moveTo`, `lineTo`, `bezierCurveTo`, `stroke`, `arc`, `fill`,
    `setTransform`) are empty functions, and settable `strokeStyle`/
    `fillStyle`/`lineWidth` properties drawGraph assigns to.
  - `globalThis.window = { devicePixelRatio: 1 }` set once before the first
    call (draw.ts's only global read).
  - `rowCenters` synthesized as `row * 20` (a plausible fixed row height) for
    each row — no real DOM layout needed since the stub context discards all
    draw calls anyway.
  - This times drawGraph's real JS control flow (edge/row iteration, color
    lookups, path-building calls) but not actual canvas rasterization/GPU
    work, since no real canvas exists in headless Node. This is the
    documented trade-off from the story's technical notes (rejected
    alternative: move this into the Playwright/real-browser harness owned by
    bolt 008 — out of scope here per file-ownership boundaries).
- Add a `bench(n)` variant (or extend the existing one) that also runs
  `computeLayout` then `drawGraph` back-to-back, timing both with one
  `performance.now()` pair, at n=500 and n=2000 (matching the acceptance
  criterion for "at least one larger n").
- Print an explicit `PASS`/`FAIL` string comparing the n=500 combined time
  against the 100ms budget.

**Bundle-size check** (story 002):
- `benchmarks/bundle-size.mjs`: if `.output/chrome-mv3/` doesn't exist, throw
  a clear `Error` telling the user to run `pnpm build` first (no cryptic
  ENOENT).
- Recursively walk `.output/chrome-mv3/` (small tree, plain recursive
  `fs.readdirSync(..., { withFileTypes: true })` — no glob dependency),
  collect every `*.js` file (covers `background.js`,
  `content-scripts/commits.js`, `chunks/*.js`, and any future chunk without a
  hardcoded list per the story's edge case).
- `zlib.gzipSync(fs.readFileSync(file))` per file, sum `.length`, convert to
  KB (`/1024`), print each file's gzip size plus the total, and an explicit
  `PASS`/`FAIL` against the 100KB budget.
- Deterministic: gzip of a fixed file's bytes is stable across runs (no
  timestamp/network dependency), satisfying the story's "run twice, same
  result" criterion.

### Acceptance Criteria (mapped from stories 001/002)

- [ ] Harness drives both `computeLayout` and `drawGraph` and reports one
      combined wall-clock number for ≥500 commits
- [ ] Output states pass/fail against <100ms explicitly
- [ ] Both n=500 and a larger n (2000) are recorded
- [ ] Runnable via a documented `pnpm` script (requested from orchestrator,
      see Package.json Requests below) with no manual setup
- [ ] Bundle script sums gzip of every shipped `.js` under `.output/chrome-mv3/`
- [ ] Reports total KB and explicit pass/fail against ≤100KB
- [ ] Deterministic across repeated runs on the same build
- [ ] Fails with a clear message if `.output/chrome-mv3/` is missing

### Package.json Requests (orchestrator-applied — this bolt does not edit package.json)

- `"bench:draw": "node benchmarks/layout-bench.mjs"` — combined layout+draw
  timing now lives in the same file as the layout-only sweep, so no separate
  script is strictly needed; existing `pnpm bench` already covers it once
  extended. Requesting no new script for this one, reusing `bench`.
- `"bench:bundle-size": "node benchmarks/bundle-size.mjs"` — new script for
  the gzip check (story 002 explicitly names this convention).
- No new dependency.

### Risks

- `.output/chrome-mv3/` may be rebuilt concurrently by another sibling bolt
  invoking `pnpm build` at the same time — mitigated by treating the numbers
  as a point-in-time snapshot re-runnable any time; no shared-state mutation
  risk since build output for unchanged product code is deterministic.
