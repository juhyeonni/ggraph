---
intent: 001-commit-graph-on-commits-page
phase: inception
status: inception-complete
created: 2026-07-21T01:00:51Z
updated: 2026-07-21T02:05:00Z
---

# Requirements: Commit Graph on Commits Page

## Intent Overview

Render an interactive branch-integration graph (a `git log --graph`-style DAG)
inline on GitHub's commits page (`github.com/{owner}/{repo}/commits`). GitHub
shows commits as a flat list; users cannot see how branches merged. This intent
delivers the core value of the extension: see the merge topology where you
already look, with zero configuration on public repositories.

Covers roadmap milestones **v0.1.0 (Walking Skeleton)**, **v0.2.0 (Real Data,
Real Layout)**, and **v0.3.0 (Interactivity)**. Authentication (v0.4.0) and
release hardening (v1.0.0) are separate intents.

## Business Goals

| Goal | Success Metric | Priority |
|------|----------------|----------|
| See branch-merge topology at a glance on the commits page | Graph topology matches `git log --graph` on real repos | Must |
| Zero-config first run | Public repo graph renders with no settings, no login | Must |
| Fast and lightweight | ≥500 commits laid out and drawn <100ms after data; smooth scroll | Must |

## Scope

**In scope**: toolchain skeleton (WXT + TS + Preact), commits-page
detection and canvas injection, unauthenticated REST data fetch (parent SHAs),
pure-TS layout core (topological order, lanes, edge routing), Canvas 2D rendering,
`chrome.storage` response cache (TTL), interactivity (hover tooltip, click →
commit, pan/scroll-follow, incremental load-more).

**Out of scope**: GitHub sign-in / private repos (intent 002), Web Store
release hardening (intent 003), PAT input UI.

---

## Functional Requirements

### FR-1: Commits Page Detection & Graph Rail Injection
- **Description**: Detect `github.com/{owner}/{repo}/commits` (including `/commits/{ref}`) and inject a graph rail alongside GitHub's existing commit list, aligning graph rows to the list's commit rows (across date-group headers). Must survive GitHub's SPA (Turbo) navigation — attach/detach on soft page transitions.
- **Acceptance Criteria**: Rail appears on commits pages and nowhere else; each graph node vertically aligns with its commit row; navigating away and back via SPA navigation re-attaches without duplicate injection; all GitHub DOM selectors live in a single isolated module.
- **Priority**: Must

### FR-2: Commit Data Fetch (Unauthenticated REST)
- **Description**: Fetch recent commits of the currently viewed ref via `GET /repos/{owner}/{repo}/commits?sha={ref}&per_page=100` (paginated), extracting SHA, parents, message, author, and date. Default depth 200 commits.
- **Acceptance Criteria**: Parent SHAs captured for every commit; ref taken from the page URL (default branch when absent); a 200-commit graph costs ≤ 2 requests (page size 100).
- **Priority**: Must

### FR-3: Response Caching
- **Description**: Cache API responses in `chrome.storage` keyed by repo+ref with a TTL, to reduce repeat requests under the 60 req/hr unauthenticated limit.
- **Acceptance Criteria**: Revisiting a cached repo+ref within TTL issues zero API requests; cache is bounded (LRU or size cap) so storage does not grow unbounded.
- **Priority**: Must

### FR-4: Graph Layout Core
- **Description**: Pure TypeScript module (`lib/layout/`, no DOM/network/chrome.*) computing topological order, lane assignment, and edge routing from the commit parent DAG.
- **Acceptance Criteria**: Merge/branch topology matches `git log --graph` on reference repositories (fixture-based tests); module has zero non-test dependencies; benchmark (`benchmarks/layout-bench.mjs`) stays within budget.
- **Priority**: Must

### FR-5: Canvas Rendering
- **Description**: Draw nodes, lanes, and merge edges on a Canvas 2D rail; adapt to GitHub's light/dark theme colors minimally (readable in both).
- **Acceptance Criteria**: 500-commit graph renders correctly; no DOM nodes created per commit; crisp rendering on HiDPI (devicePixelRatio handled).
- **Priority**: Must

### FR-6: Hover & Click Interactions
- **Description**: Manual hit-testing against layout-computed coordinates. Hover shows a tooltip (message, author, date, short SHA); click navigates to the commit page.
- **Acceptance Criteria**: Hover highlights the node and shows the tooltip within one frame; click on a node opens the commit URL; hit-testing tolerance makes nodes comfortably clickable.
- **Priority**: Must

### FR-7: Incremental Load-More
- **Description**: Load older commits (next pages) on demand and extend the graph with incremental layout, following GitHub's own pagination when possible.
- **Acceptance Criteria**: Loading more never re-fetches already-cached pages; existing rendered rows do not visibly shift except to extend downward.
- **Priority**: Should

### FR-8: Soft Degradation
- **Description**: On any failure (rate limit exhausted, API error, injection point missing), degrade gracefully: show cached graph if available, else a single small inline notice; never throw into the host page.
- **Acceptance Criteria**: With rate limit exhausted, cached data still renders with a notice; with no cache, one concise notice appears (no console spam, no layout breakage of the GitHub page).
- **Priority**: Must

---

## Non-Functional Requirements

### NFR-1: Performance
| Requirement | Metric | Target |
|-------------|--------|--------|
| Layout + draw | 500 commits, after data arrives | < 100ms |
| Scrolling | Frame rate with graph attached | 60fps (no long tasks > 50ms) |
| Layout core regression | `benchmarks/layout-bench.mjs`, 500 commits | < 10ms |

### NFR-2: Footprint
| Requirement | Metric | Target |
|-------------|--------|--------|
| Bundle size | Shipped JS (gzip) | ≤ 100KB |
| Memory | Extra heap at 500-commit graph | ≤ 50MB |

### NFR-3: Reliability (host-page safety)
| Requirement | Metric | Target |
|-------------|--------|--------|
| Host page integrity | GitHub page breakage caused by extension | Never (all entry points wrapped; failures are no-ops) |
| DOM fragility isolation | GitHub selectors | Single module; selector failure → silent no-op |

### NFR-4: Privacy & Permissions
| Requirement | Standard | Notes |
|-------------|----------|-------|
| Data locality | No data leaves the browser | API calls go only to github.com/api.github.com |
| Permissions | Minimal MV3 permissions | Host permissions for github.com + api.github.com, `storage`; nothing else |

### NFR-5: Compatibility
| Requirement | Metric | Target |
|-------------|--------|--------|
| Browser | Chrome stable (MV3) | Current stable |
| GitHub navigation | SPA (Turbo) transitions | Attach/detach correctly |

---

## Constraints

### Technical Constraints

**Project-wide standards**: loaded from `memory-bank/standards/` by the
Construction Agent.

**Intent-specific constraints**:
- Unauthenticated GitHub REST API: 60 req/hr/IP; ETag 304 exemption does NOT
  apply to unauthenticated requests.
- Must never break or slow the host GitHub page; failures degrade silently.

### Business Constraints
- None identified.

---

## Assumptions

| Assumption | Risk if Invalid | Mitigation |
|------------|-----------------|------------|
| REST commits endpoint keeps returning parent SHAs | Graph cannot be built | Official documented API; low risk |
| GitHub commits-page DOM allows stable injection point | Graph placement breaks on redesign | Isolate selectors in one module; fail silently |

---

## Open Questions

| Question | Owner | Due Date | Resolution |
|----------|-------|----------|------------|
| — | | | |
