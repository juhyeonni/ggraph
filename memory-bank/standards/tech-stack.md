# Tech Stack

## Overview

`ggraph` is a Chrome (MV3) browser extension that renders a commit/branch
integration graph directly on GitHub pages. The stack is optimized for a small
bundle, low memory, and fast rendering: pure TypeScript with graph layout in an
isolated, dependency-free module, drawn on Canvas 2D.

## Languages

- **TypeScript** — everything: content script, background service worker,
  graph layout core, canvas drawing, and UI.

**Rationale**: Rust→WASM was evaluated and **rejected with measurements**
(2026-07-21). The layout workload is tiny for V8: 500 commits lay out in
~1.3ms / 0.15MB heap; even 50,000 commits take ~46ms (measured with a real
lane-assignment algorithm, see `benchmarks/layout-bench.mjs`). WASM would add
50–250KB of binary plus ~10KB JS glue plus JS↔WASM boundary serialization —
worse on all three constraints (bundle, memory, speed) at this scale. The real
bottlenecks are network fetch and canvas painting, not layout computation.

**Escape hatch**: the layout core lives in `lib/layout/` as a pure module
(no DOM, no network) with a stable interface. If profiling ever shows layout as
a real bottleneck, a WASM port is a drop-in replacement of that one module.

## Framework

- **Extension tooling**: **WXT** (Vite-based). Auto-generates the MV3 manifest,
  provides HMR, and simplifies content-script placement.
- **UI layer**: **Preact (~3KB)** for peripheral UI (toolbar, settings panel).
  The graph itself is not built from framework components.
- **Graph rendering surface**: **Canvas 2D**. Node/edge count does not grow the
  DOM, keeping memory low and scroll/zoom fast. Hover/click is handled via
  manual hit-testing against layout-computed coordinates.

**Rationale**: These choices directly serve the lightweight/low-memory/fast
constraints. Canvas avoids DOM blow-up on large graphs; Preact stays tiny while
giving reasonable DX for the surrounding widgets; WXT removes MV3 boilerplate.

## Authentication

**TBD (optional).** Public repositories need no authentication. "Sign in with
GitHub" via OAuth device flow (client_id only, no backend) is planned for a
later intent — unlocks private repositories and 5,000 req/hr. No PAT pasting
in the main flow.

## Infrastructure & Deployment

- **Distribution**: Chrome Web Store (MV3 package). No servers, no database —
  the extension runs entirely client-side in the browser.
- **Data source**: GitHub REST API (`GET /repos/{o}/{r}/commits`, includes
  parent SHAs; verified). Unauthenticated: 60 req/hr/IP, mitigated with
  `chrome.storage` caching.

## Package Manager

**pnpm** — fast, disk-efficient, works well with WXT/Vite.

## Performance Discipline

- Layout core is pure and benchmarked: `benchmarks/layout-bench.mjs` guards
  against regressions (500 commits must stay well under the 100ms budget).
- Bundle budget: shipped JS (gzip) ≤ 100KB — measured in CI before release.

## Decision Relationships

- Pure layout module ↔ Canvas 2D: layout returns coordinates; a thin drawing
  layer renders them. The module boundary is what keeps a future WASM port
  cheap.
- WXT (Vite) is the single build/integration point.
- Preact and Canvas are complementary: Preact for widgets, Canvas for the
  graph — neither drives the other.
