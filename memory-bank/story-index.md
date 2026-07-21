# Global Story Index

## Overview
- **Total stories**: 33
- **Generated**: 33
- **Last updated**: 2026-07-21

---

## Stories by Intent

### 001-commit-graph-on-commits-page

- [x] **001-extension-scaffold** (001-graph-ui): Extension scaffold & dummy pipeline - Must - ✅ GENERATED
- [x] **002-commits-page-detection** (001-graph-ui): Commits page detection & SPA lifecycle - Must - ✅ GENERATED
- [x] **003-fetch-commits** (001-graph-ui): Fetch commits via REST - Must - ✅ GENERATED
- [x] **004-response-cache** (001-graph-ui): Response cache in chrome.storage - Must - ✅ GENERATED
- [x] **005-layout-core** (001-graph-ui): Pure layout core - Must - ✅ GENERATED
- [x] **006-canvas-render** (001-graph-ui): Canvas rail rendering - Must - ✅ GENERATED
- [x] **007-hover-click** (001-graph-ui): Hover tooltip & click navigation - Must - ✅ GENERATED
- [x] **008-load-more** (001-graph-ui): Incremental load-more - Should - ✅ GENERATED
- [x] **009-soft-degradation** (001-graph-ui): Rate-limit & failure degradation - Must - ✅ GENERATED

### 002-github-sign-in

- [x] **001-device-flow-initiate** (001-auth): Start OAuth device flow - Must - ✅ GENERATED
- [x] **002-device-flow-poll** (001-auth): Poll for access token - Must - ✅ GENERATED
- [x] **003-token-storage** (001-auth): Persist and read the auth token - Must - ✅ GENERATED
- [x] **004-authenticated-fetch** (001-auth): Authenticated commit fetch (private repos + rate limit) - Must - ✅ GENERATED
- [x] **005-etag-conditional-requests** (001-auth): ETag conditional requests (authenticated) - Must - ✅ GENERATED
- [x] **006-settings-panel-ui** (001-auth): Settings panel: sign-in/out - Must - ✅ GENERATED
- [x] **007-commit-depth-setting** (001-auth): Configurable commit depth - Should - ✅ GENERATED
- [x] **008-sign-out** (001-auth): Sign out clears session - Must - ✅ GENERATED
- [x] **009-auth-aware-degradation** (001-auth): Auth-aware degradation & messaging - Should - ✅ GENERATED

### 003-release-hardening

- [x] **001-layout-draw-perf-harness** (001-release): Measure layout + draw time for ≥500 commits - Must - ✅ GENERATED
- [x] **002-bundle-size-check** (001-release): Verify shipped JS gzip size ≤100KB - Must - ✅ GENERATED
- [x] **003-e2e-extension-load** (001-release): Playwright loads the built extension and the graph renders - Must - ✅ GENERATED
- [x] **004-e2e-interaction-smoke** (001-release): E2E covers one hover/click interaction - Must - ✅ GENERATED
- [x] **005-memory-heap-budget** (001-release): Measure extra JS heap on a ≥500-commit graph - Must - ✅ GENERATED
- [x] **006-privacy-security-audit** (001-release): Audit "no data leaves the browser" claim against code - Must - ✅ GENERATED
- [x] **007-manifest-release-readiness** (001-release): Version bump, icons, finalized manifest fields - Must - ✅ GENERATED
- [x] **008-store-listing-assets** (001-release): Chrome Web Store listing copy + shot-list + icon spec - Must - ✅ GENERATED
- [x] **009-readme-user-docs** (001-release): README: install, usage, sign-in, privacy, dev/build - Must - ✅ GENERATED
- [x] **010-release-checklist** (001-release): Ordered checklist, maintainer-only steps flagged - Should - ✅ GENERATED

### 004-graph-ux

- [x] **001-relationship-reachability** (001-graph-ux): First-parent + merge reachable-set computation (pure) - Must - ✅ GENERATED
- [x] **002-fade-highlight-render** (001-graph-ux): Fade/highlight rendering in draw.ts - Must - ✅ GENERATED
- [x] **003-bidirectional-focus-wiring** (001-graph-ux): Canvas + GitHub row hover drive the same highlight - Must - ✅ GENERATED
- [x] **004-merge-branch-parsing** (001-graph-ux): Merge-source-branch + PR# parsing (pure) - Must - ✅ GENERATED
- [x] **005-relationship-badge-tooltip** (001-graph-ux): Relationship-badge tooltip replaces metadata tooltip - Must - ✅ GENERATED

---

## Stories by Status

- **Planned**: 0
- **Generated**: 33
- **In Progress**: 0
- **Completed**: 0
