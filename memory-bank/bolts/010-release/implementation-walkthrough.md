---
stage: implement
bolt: 010-release
created: '2026-07-21T05:58:47Z'
---

## Implementation Walkthrough: release (010-release)

### Summary

Three docs-only deliverables were written, synthesizing the recorded
results of bolts 007/008/009-release: the project README, the Chrome Web
Store listing content, and the v1.0.0 release checklist. No product code,
`wxt.config.ts`, or `package.json` was touched.

### Structure Overview

A new `docs/` directory holds the two release-facing documents that don't
belong at repo root; `README.md` stays at the conventional root location.
Both new docs cross-reference each other and the sibling bolts'
`memory-bank/bolts/{007,008,009}-release/` artifacts by path, rather than
restating numbers independently, so there is a single source of truth per
fact.

### Completed Work

- [x] `README.md` — install (load-unpacked + CWS-placeholder), usage,
      sign-in (device flow), privacy, development commands, measured
      performance table, tech stack, and a license note (no LICENSE file
      exists in the repo, stated honestly rather than assumed)
- [x] `docs/STORE-LISTING.md` — title, category, short summary, full
      description, 3-shot screenshot list, icon spec (citing bolt
      009-release's placeholder icons), privacy disclosure, permissions
      justification, and an explicit maintainer-action out-of-scope list
- [x] `docs/RELEASE-CHECKLIST.md` — engineering-complete items with their
      actual recorded numbers/verdicts, a "known gap" section flagging the
      placeholder icons and unset `CLIENT_ID`, and an ordered
      maintainer-only action list

### Key Decisions

- **`docs/` for listing + checklist, root for README**: matches the
  bolt brief's ownership note ("docs/ — you own docs/") while keeping
  README at the conventional GitHub root location.
- **No "load more" feature claimed**: grepped the codebase
  (`load.more|loadmore|pagination|older`) and found no such feature — the
  extension re-renders on GitHub's own native "Older commits" page
  navigation via `wxt:locationchange`, which is not a distinct
  extension-owned pagination UI. README's Usage section describes this
  accurately instead of claiming an unimplemented "load more" control.
- **Reused the manifest's own description as the CWS short summary**,
  per story 008's technical note, to avoid the listing and the shipped
  extension's own description drifting apart over time.
- **README privacy section and the store listing's privacy disclosure use
  the same wording**, both traced to the same
  `memory-bank/bolts/009-release/privacy-audit.md` source, per story
  009's acceptance criterion (no drift between the two).

### Deviations from Plan

None — matches `implementation-plan.md` exactly.

### Dependencies Added

None. Docs-only; no new package.

### Developer Notes

- Every number in these three docs traces to a file:
  `memory-bank/bolts/007-release/test-walkthrough.md` (perf, bundle),
  `memory-bank/bolts/008-release/test-walkthrough.md` (E2E, heap),
  `memory-bank/bolts/009-release/privacy-audit.md` +
  `memory-bank/bolts/009-release/test-walkthrough.md` (privacy, manifest).
  A few facts (e.g. the exact `CLIENT_ID` placeholder string, the absence
  of a "load more" feature, the exact `pnpm` script names) were verified
  by reading the actual source (`lib/github/auth-config.ts`,
  `package.json`, `entrypoints/commits.content.ts`) directly rather than
  through a sibling doc, since those weren't covered by 007/008/009's
  outputs.
- `pnpm lint` / `pnpm typecheck` / `pnpm test` (130/130) all re-confirmed
  green after adding the docs (expected, since no source file changed —
  confirmed rather than assumed per the bolt brief).
