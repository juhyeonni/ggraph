# Roadmap

## v1.0.0 Goal

> **Install the extension, open any public GitHub repository's commits page, and
> instantly see an interactive branch-integration graph — zero configuration.**
> Optional "Sign in with GitHub" (device flow, no token pasting, no backend)
> unlocks private repositories and a 5,000 req/hr rate limit.

### Why

GitHub's commits page is a flat list: you cannot see how branches merged into
each other. `ggraph` overlays a `git log --graph`-style DAG directly where
developers already look.

### Success Criteria (v1.0.0)

| Criterion | Target |
|---|---|
| Zero-config first run | Public repo graph renders with no settings, no login |
| Performance | ≥500 commits laid out and drawn in <100ms after data arrives; smooth (60fps) scroll |
| Bundle budget | Shipped JS (gzip) ≤ 100KB |
| Memory budget | ≤ 50MB extra heap on a 500-commit graph |
| Rate-limit UX | Soft degradation: cached graph + clear message, never a broken page |
| Auth | Device-flow sign-in unlocks private repos + 5,000 req/hr; no PAT pasting in the main flow |
| Host page safety | Never breaks or slows the GitHub page; extension failures are silent-safe |

### Key Decisions (settled, with evidence)

- **Surface**: inline injection on `github.com/{owner}/{repo}/commits` (value where users already look).
- **Data**: GitHub REST `GET /repos/{o}/{r}/commits` — returns parent SHAs (verified), `per_page=100`, paginated.
- **Unauthenticated default**: 60 req/hr/IP; ~1–3 requests per graph render. Mitigate with `chrome.storage` cache (TTL). Note: ETag 304 exemption applies **only to authenticated requests** (verified in docs) — caching helps UX but does not stretch the unauthenticated limit.
- **Auth**: OAuth **Device Flow** — client_id only, no client_secret, no backend. Rejected: PAT pasting (bad UX), OAuth web flow (requires backend for secret), internal `network/meta`/`network_data_chunk` endpoints (undocumented; chunk endpoint currently 404s).
- **Prior art**: Le Git Graph ships GraphQL + OAuth + optional PAT — validates the "optional sign-in" pattern; we differentiate on zero-config default, performance, and lean bundle.
- **Layout in pure TypeScript** (2026-07-21): Rust→WASM was evaluated and rejected with measurements — 500 commits lay out in ~1.3ms / 0.15MB in V8 (see `benchmarks/layout-bench.mjs`); WASM would add 50–250KB binary + boundary serialization for no gain. Layout core isolated in `lib/layout/` as the seam for a future WASM port if ever profiled as needed.

---

## Milestones

### v0.1 — Walking Skeleton (toolchain proof)
- WXT + TypeScript + Preact scaffold.
- Content script detects the commits page and injects a canvas.
- Dummy graph rendered via the full pipeline: layout module → canvas draw.
- **Exit**: extension loads unpacked in Chrome; dummy DAG visible on a real commits page.

### v0.2 — Real Data, Real Layout
- Fetch commits (with parents) from REST API, paginated, unauthenticated.
- Layout core (`lib/layout/`, pure TS): topological order, lane assignment, edge routing → coordinates out.
- Static graph of recent N commits (default 200) drawn on the commits page.
- Response cache in `chrome.storage` (TTL) to reduce repeat fetches.
- **Exit**: correct merge/branch topology for real repos (verified against `git log --graph`).

### v0.3 — Interactivity
- Hit-testing (hover/click) against layout-computed coordinates.
- Hover tooltip (message, author, date); click → navigate to commit.
- Scroll-follow / pan; load-more (older commits) with incremental layout.
- **Exit**: graph is navigable and responsive on large repos.

### v0.4 — Sign-in & Polish
- "Sign in with GitHub" via OAuth device flow (client_id only); token in `chrome.storage`.
- Authenticated mode: private repos, 5,000 req/hr, ETag conditional requests.
- Settings panel (Preact): commit depth, sign-out.
- Match GitHub light/dark theme; rate-limit and error messaging.
- **Exit**: private repo works after sign-in; all soft-failure paths covered.

### v1.0.0 — Release
- Performance budgets verified (bundle size, layout time, memory) — measured, not assumed.
- E2E smoke test (Playwright, extension loaded against a live commits page).
- Chrome Web Store listing (assets, privacy disclosure — no data leaves the browser).
- README + user docs.
- **Exit**: published on Chrome Web Store.

---

## Later (v1.1+ candidates, not committed)

- PR page graph view (how a PR's commits integrate).
- Compare/branch-picker view; multiple refs overlay.
- Firefox port (WXT supports it).
- Advanced: hidden PAT field for power users behind settings.

---

## Intent Mapping (AI-DLC)

Milestones map to intents roughly as:
- `001-commit-graph-on-commits-page` → v0.1–v0.3 (core value)
- `002-github-sign-in` → v0.4
- `003-release-hardening` → v1.0.0
