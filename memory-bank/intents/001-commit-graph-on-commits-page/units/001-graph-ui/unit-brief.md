---
unit: 001-graph-ui
intent: 001-commit-graph-on-commits-page
unit_type: frontend
default_bolt_type: simple-construction-bolt
phase: inception
status: draft
created: 2026-07-21T01:45:00Z
updated: 2026-07-21T01:45:00Z
---

# Unit Brief: graph-ui

## Purpose

Deliver the complete commit-graph feature on GitHub's commits page: detect the
page, fetch commit data, compute the DAG layout, draw an aligned canvas rail,
and make it interactive — fast, tiny, and safe for the host page.

## Scope

### In Scope
- WXT + TypeScript + Preact extension scaffold (Biome, Vitest, pnpm)
- Commits-page detection, SPA-navigation attach/detach, rail injection
- Unauthenticated REST fetch + `chrome.storage` TTL cache
- Pure layout core (`lib/layout/`), canvas renderer (`lib/draw/`)
- Hover/click interactions, incremental load-more, soft degradation

### Out of Scope
- GitHub sign-in / private repos (intent 002)
- Web Store release hardening (intent 003)
- Ref labels / decorations (deferred per requirements)

---

## Assigned Requirements

| FR | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Commits page detection & graph rail injection | Must |
| FR-2 | Commit data fetch (unauthenticated REST) | Must |
| FR-3 | Response caching | Must |
| FR-4 | Graph layout core | Must |
| FR-5 | Canvas rendering | Must |
| FR-6 | Hover & click interactions | Must |
| FR-7 | Incremental load-more | Should |
| FR-8 | Soft degradation | Must |

---

## Domain Concepts

### Key Entities
| Entity | Description | Attributes |
|--------|-------------|------------|
| Commit | One commit in the DAG | sha, parents[], message, author, date |
| GraphLayout | Computed layout for a commit list | rows[] (lane x, row y, edges), laneCount |
| CacheEntry | Cached API response | repo+ref key, pages[], etag?, fetchedAt, ttl |

### Key Operations
| Operation | Description | Inputs | Outputs |
|-----------|-------------|--------|---------|
| fetchCommits | Paginated REST fetch with cache | owner, repo, ref, depth | Commit[] |
| computeLayout | Pure DAG layout | Commit[] | GraphLayout |
| renderGraph | Draw rail on canvas | GraphLayout, theme, viewport | — |
| hitTest | Node under pointer | GraphLayout, x, y | Commit \| null |

---

## Story Summary

| Metric | Count |
|--------|-------|
| Total Stories | 9 |
| Must Have | 8 |
| Should Have | 1 |
| Could Have | 0 |

### Stories

| Story ID | Title | Priority | Status |
|----------|-------|----------|--------|
| 001-extension-scaffold | Extension scaffold & dummy pipeline | Must | Planned |
| 002-commits-page-detection | Commits page detection & SPA lifecycle | Must | Planned |
| 003-fetch-commits | Fetch commits via REST | Must | Planned |
| 004-response-cache | Response cache in chrome.storage | Must | Planned |
| 005-layout-core | Pure layout core | Must | Planned |
| 006-canvas-render | Canvas rail rendering | Must | Planned |
| 007-hover-click | Hover tooltip & click navigation | Must | Planned |
| 008-load-more | Incremental load-more | Should | Planned |
| 009-soft-degradation | Rate-limit & failure degradation | Must | Planned |

---

## Dependencies

### Depends On
| Unit | Reason |
|------|--------|
| — | First unit |

### Depended By
| Unit | Reason |
|------|--------|
| (intent 002 unit) | Will extend `lib/github/` with auth |

### External Dependencies
| System | Purpose | Risk |
|--------|---------|------|
| GitHub commits page DOM | Injection host, row alignment | High (undocumented; isolate selectors) |
| GitHub REST API | Commit data | Low (documented, stable) |
| chrome.storage | Cache | Low |

---

## Technical Context

### Suggested Technology
Per `standards/tech-stack.md`: TypeScript strict, WXT, Preact (widgets only),
Canvas 2D, pnpm, Biome, Vitest. Layout core must stay pure (no DOM/network/chrome.*).

### Integration Points
| Integration | Type | Protocol |
|-------------|------|----------|
| api.github.com | API | REST/JSON |
| github.com page | DOM | content script injection |

### Data Storage
| Data | Type | Volume | Retention |
|------|------|--------|-----------|
| API response cache | chrome.storage.local | bounded (LRU/size cap) | TTL |

---

## Constraints

- Unauthenticated 60 req/hr/IP; 304 exemption does not apply.
- Minimal MV3 permissions: github.com + api.github.com hosts, `storage`.
- Host-page safety: every entry point wrapped; failure = silent no-op.

---

## Success Criteria

### Functional
- [ ] Graph rail on commits pages, aligned to commit rows, SPA-safe
- [ ] Topology matches `git log --graph` on fixture repos
- [ ] Hover tooltip + click-to-commit work

### Non-Functional
- [ ] 500 commits: layout + draw < 100ms; 60fps scroll
- [ ] JS (gzip) ≤ 100KB; ≤ 50MB extra heap
- [ ] Layout bench < 10ms / 500 commits

### Quality
- [ ] Layout core thoroughly unit-tested (fixtures)
- [ ] All acceptance criteria met
- [ ] Biome + tsc clean

---

## Bolt Suggestions

| Bolt | Type | Stories | Objective |
|------|------|---------|-----------|
| 001-graph-ui | simple | 001, 002 | Walking skeleton (milestone v0.1.0) |
| 002-graph-ui | simple | 003, 004, 005, 006 | Real data + layout + render (v0.2.0) |
| 003-graph-ui | simple | 007, 008, 009 | Interactivity + degradation (v0.3.0) |

---

## Notes

Biggest risks (from requirements review): GitHub DOM fragility (mitigated by
selector isolation + soft failure) and layout correctness (mitigated by fixture
tests against `git log --graph`).
