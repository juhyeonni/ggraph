---
stage: test
bolt: 001-graph-ui
created: 2026-07-21T02:08:57Z
---

## Test Walkthrough: graph-ui

### Summary

17/17 tests pass across 2 test files (Vitest 4.1.10). Final gate run: `pnpm test`,
`pnpm lint` (Biome), `pnpm typecheck` (tsc --noEmit), and `pnpm build` all exit 0.
No coverage tooling added (not requested; suite is small enough to read). The pure
dummy-layout module and the selectors module — the two decision points of this bolt —
are fully covered; browser-only behavior (visual rail, SPA lifecycle in real Chrome)
is listed as MANUAL-PENDING below, not faked.

### Test Files

- [x] `lib/layout/dummy-layout.test.ts` — 5 tests: row count matches input, lane/edge
  bounds within laneCount at sizes 1–50, deterministic output, empty layout for
  zero/negative counts, 10,000-row large case (laneCount 3)
- [x] `lib/github/selectors.test.ts` (happy-dom) — 12 tests: `parseCommitsPath`
  (plain /commits, trailing slash, /commits/{ref}, file-history ref+filePath, slashy
  ref limitation, null for non-commits URLs), `isCommitsPage` (true for /commits and
  /commits/{ref}; false for file-history and non-commits), `findCommitRowEls` (rows
  found across date-group sections in document order, legacy-markup fallback, empty
  array on mismatch, never throws even when the DOM query itself throws)
- [ ] Content-script attach idempotency (marker-id dedupe) — SKIPPED: the guard lives
  inside `defineContentScript`'s `main(ctx)` (WXT-injected global + ContentScriptContext);
  testing it requires exporting internals and stubbing WXT globals — heavier than the
  two-line guard it would cover. It is exercised by the manual SPA smoke test instead.

### Acceptance Criteria Validation

| Criterion | Verdict |
|-----------|---------|
| `pnpm dev`/`pnpm build` produce MV3 output with only github.com + api.github.com host permissions and `storage` | ✅ build exit 0; `.output/chrome-mv3/manifest.json` inspected — exact permissions match |
| Dummy DAG canvas rail visible on real `github.com/{owner}/{repo}/commits[/{ref}]` pages | MANUAL-PENDING (needs Chrome + live github.com) |
| Rail rows align to real commit rows across date-group headers | MANUAL-PENDING (row discovery across groups unit-tested; visual alignment needs a browser) |
| SPA navigate away → rail detaches cleanly (no orphan canvas, no leaked listeners) | MANUAL-PENDING |
| SPA navigate back → re-attaches exactly once (no duplicates) | MANUAL-PENDING |
| Non-commits GitHub pages get no canvas | ✅ deciding predicate `isCommitsPage` unit-tested; injection guard is a one-line early return |
| `/commits/{ref}/{path}` file-history pages get no canvas | ✅ unit-tested (`isCommitsPage` false for file-history paths) |
| Empty repo (no rows) → no rail, no error | ✅ `findCommitRowEls` empty-result path unit-tested; attach stops silently after bounded retries |
| Very narrow viewport → rail hides/collapses | MANUAL-PENDING (guard is an attach-time innerWidth check; untested in unit) |
| Selector mismatch → nothing injected, no error reaches host page | ✅ never-throws and empty-array behavior unit-tested; content script additionally wraps the lifecycle in try/catch |
| Extension reload while page open → no duplicate canvas | MANUAL-PENDING (`ctx.onInvalidated` cleanup; unit test skipped per note above) |
| `pnpm test`, `biome check`, `tsc --noEmit` all pass | ✅ all exit 0 (17/17 tests) |
| `pnpm bench` runs `benchmarks/layout-bench.mjs` unmodified | ✅ runs (500 commits ≈ 1ms); `git status` confirms file untouched |

### Issues Found

None. All tests passed on first run; no source changes were needed during Stage 3.

### Notes

- Manual smoke checklist for the user (covers all MANUAL-PENDING rows): `pnpm build`,
  load `.output/chrome-mv3/` unpacked in Chrome, open a busy public repo's commits
  page (e.g. facebook/react), confirm the dummy rail appears left of the commit list
  and spans date groups; click into a file then back to commits via GitHub navigation
  (rail re-attaches once); visit a non-commits page and a file-history URL (no rail);
  narrow the window below 768px and reload (no rail); reload the extension with the
  page open (no duplicate rail).
- Biggest known risk remains the selector strings (`data-testid="commit-row-item"`,
  legacy `li.js-commits-list-item`) — best-knowledge, not yet verified against live
  github.com. Failure mode is the designed silent no-op; the manual smoke test is the
  real verdict.
- Happy-dom is engaged per-file via the `@vitest-environment` pragma; no
  `vitest.config.ts` was needed.
