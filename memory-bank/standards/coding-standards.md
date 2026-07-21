# Coding Standards

## Overview

Lean standards for a TypeScript-only codebase (Preact/WXT Chrome extension).
Bias toward small focused functions, early returns, and minimal comments.
Standards are enforced by tooling, not review nitpicks.

## Code Formatting

**TypeScript / JS / JSON**: **Biome** (formatter).

**Key Settings**:
- Indentation: 2 spaces
- Line width: 100
- Quotes: double
- Trailing commas: multi-line
- Semicolons: always

**Enforcement**: format on save + pre-commit; CI fails on unformatted code.

## Linting

**Tool**: **Biome** (linter) + `tsc --noEmit` for type checking.

**Base Config**: Biome recommended rules; TypeScript `strict: true`.

**Strictness**: strict.

**Key Rules**:
- No `any` — use `unknown` and narrow. Rationale: catches bugs at the DOM/API boundaries.
- Unused variables/imports: error.
- No `console.*` directly in production paths — use the logging wrapper (see below).
- No commented-out code; no `TODO` without a linked issue.

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `laneCount`, `isMerged` |
| Functions | camelCase | `computeLayout`, `parseCommits` |
| Types / Interfaces | PascalCase | `CommitNode`, `GraphLayout` |
| Preact components | PascalCase | `GraphToolbar` |
| Constants | UPPER_SNAKE | `MAX_LANES` |
| Booleans | is/has/can prefix | `isMerged`, `hasParents` |
| Event handlers | on/handle | `onNodeClick`, `handleZoom` |

**File Naming**:
- Preact components: `PascalCase.tsx`
- Utilities/modules: `kebab-case.ts`
- Tests: `*.test.ts` co-located

## File Organization

**Pattern**: feature-based, split by responsibility. The layout core is an
isolated pure module.

**Structure**:
```text
.
├─ entrypoints/        # WXT entrypoints: content script(s), background worker
├─ lib/
│   ├─ layout/         # PURE layout core: topo order, lanes, edge routing (no DOM/network)
│   ├─ github/         # REST data access + chrome.storage cache
│   └─ draw/           # canvas rendering + hit-testing
├─ ui/                 # Preact components (toolbar, settings panel)
├─ types/              # shared TS types (or co-located)
└─ benchmarks/         # layout benchmark (performance regression guard)
```

**Conventions**:
- Tests: co-located `*.test.ts`.
- Types: co-located with usage; promote to `types/` only when shared.
- Index files: avoid deep barrel re-exports; import from source paths.
- `lib/layout/` must stay pure (no DOM, no network, no chrome.*) — it is the
  correctness core and the seam for a potential future WASM port.

## Testing Strategy

**Framework**: Vitest.

**Coverage Target**: no rigid percentage. Cover critical paths first — the
layout core (topological order, lane assignment, edge routing) must be
thoroughly unit-tested, since it is the correctness core.

**Test Types**:

| Type | Tool | When to Use |
|------|------|-------------|
| Unit | Vitest | Layout core, data mapping, canvas hit-testing math |
| E2E smoke | Playwright | Later: load extension on a real GitHub page (optional) |

**Conventions**:
- Structure: Arrange-Act-Assert.
- Test behavior, not implementation.
- Mock only at boundaries (network/DOM/chrome.*); the layout core is pure and mock-free.
- Run tests after every change (project workflow rule).

## Error Handling

Throw at boundaries (GitHub fetch failure, missing DOM); model *expected*
failures as return values rather than throwing. Fail soft in the UI — if the
graph can't be built, show a small inline message, never break the host GitHub
page.

## Logging

**Tool**: a thin `console` wrapper gated by a dev flag (no logging library).

**Format**: plain text, prefixed with `[ggraph]`.

**Levels**:

| Level | Usage |
|-------|-------|
| error | Failed data fetch, unexpected exceptions |
| warn  | Recoverable issues (partial data, fallback rendering) |
| info  | Significant lifecycle events (graph rendered) — dev only |
| debug | Detailed timings/coordinates — dev only |

**Rules**:
- Never log tokens, credentials, or any PII.
- No `info`/`debug` output in production builds.
- Keep the host page's console quiet — the extension is a guest.
