---
stage: implement
bolt: 009-release
created: 2026-07-21T05:42:12Z
---

## Implementation Walkthrough: release (bolt 009-release)

### Summary

Audited the existing codebase's network and storage surface against the
"no data leaves the browser" claim and found it already compliant — no code
fix was required. Brought the manifest to v1.0.0 release shape: version
bump, four placeholder icon sizes wired into both `icons` and
`action.default_icon`, permissions confirmed already minimal.

### Structure Overview

Two new documentation artifacts live in this bolt's own folder
(`memory-bank/bolts/009-release/`): the privacy audit and the icon spec. A
new `public/icons/` directory holds the four placeholder icon files, which
WXT's build picks up automatically. `wxt.config.ts` gained a `version` field
and an `action.default_icon` block; nothing else in the manifest changed.

### Completed Work

- [x] `memory-bank/bolts/009-release/privacy-audit.md` — enumerates every
      outbound `fetch` and `chrome.storage` call site with file:line
      evidence, confirms the two-host / local-storage-only / zero-telemetry
      / no-logged-tokens claims, documents the sweep methodology.
- [x] `memory-bank/bolts/009-release/icon-spec.md` — required icon sizes,
      file locations, the stdlib-only placeholder generation approach, and
      a MANUAL-PENDING flag for real logo artwork.
- [x] `public/icons/16.png`, `32.png`, `48.png`, `128.png` — flat-color
      placeholder icons, valid PNG (verified: correct signature, dimensions
      via a raw byte inspection).
- [x] `wxt.config.ts` — added `manifest.version: "1.0.0"` and
      `manifest.action.default_icon` (mapping the same four icon paths);
      `name`, `description`, `permissions`, `host_permissions` left
      unchanged (audit confirmed they were already exactly right).

### Key Decisions

- **Icons placed at `public/icons/{size}.png` rather than declared via an
  explicit `manifest.icons` map**: WXT auto-discovers icon files at that
  path pattern from the build output, so no manual wiring is needed for the
  `icons` field — one less place for the size/path list to drift.
- **`action.default_icon` set explicitly in `wxt.config.ts`**: unlike
  `manifest.icons`, WXT does not auto-derive the toolbar action's icon from
  discovered icon files — only from the popup entrypoint's own
  `defaultIcon` option (set via the popup HTML file itself, which is
  entrypoint/product territory this bolt does not own). Setting it directly
  in the manifest config block stays within `wxt.config.ts` ownership and
  does not touch `entrypoints/popup/`.
- **`version` set in `wxt.config.ts`'s manifest block, not `package.json`**:
  the parallelism rules for this bolt forbid touching `package.json`/the
  lockfile (owned by sibling bolts installing `@playwright/test`
  concurrently). WXT's manifest generation prefers an explicit
  `manifest.version` over the `package.json`-derived default, so this
  achieves the same release-readiness outcome without the forbidden edit.
- **Placeholder icons generated with a hand-rolled, stdlib-only PNG
  encoder** (Node's built-in `zlib` deflate + CRC32) run as a one-off,
  uncommitted script: satisfies "a simple generated placeholder... is
  acceptable if trivially producible" without adding an image-processing
  dependency or touching any file outside this bolt's ownership.

### Deviations from Plan

None. The audit found zero deviations from the "no data leaves the browser"
claim, so no code fix was needed beyond the planned manifest wiring.

### Dependencies Added

None — no new `package.json` dependency; icon generation used only Node's
built-in `zlib` module, run outside the repo.

### Developer Notes

- The privacy audit's file:line references are current as of this bolt's
  read of `lib/github/*.ts` and `entrypoints/*`; if a sibling bolt's
  concurrent changes touch those files' line numbers, the claims themselves
  (destinations, storage keys, log call sites) remain valid — only exact
  line numbers could drift and should be spot-checked before the audit is
  cited in story 008/009's downstream copy.
- Real icon artwork is the only MANUAL-PENDING item from this bolt; the
  wiring is done and swapping in final PNGs at the same four paths requires
  no further manifest changes.
