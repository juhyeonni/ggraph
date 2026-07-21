---
bolt: 009-release
story: 007-manifest-release-readiness
created: 2026-07-21T05:42:12Z
---

# Icon Spec — v1.0.0 Manifest Release-Readiness

## Required sizes

| Size | Manifest field | File |
|---|---|---|
| 16px | `icons["16"]`, `action.default_icon["16"]` | `public/icons/16.png` |
| 32px | `icons["32"]`, `action.default_icon["32"]` | `public/icons/32.png` |
| 48px | `icons["48"]`, `action.default_icon["48"]` | `public/icons/48.png` |
| 128px | `icons["128"]`, `action.default_icon["128"]` | `public/icons/128.png` |

16/48/128 are the Chrome Web Store's required `icons` sizes; 32 is included
for the Windows taskbar/toolbar convention and toolbar-icon crispness,
consistent with story 007's "16/32/48/128" note.

## Placement & wiring

Files live at `public/icons/{size}.png`. WXT auto-discovers manifest icons
matching `icons?/[0-9]+\.png` in the build's public assets
(`node_modules/wxt/dist/core/utils/manifest.mjs`, `discoverIcons`) — placing
the four files there populates `manifest.icons` with no explicit `icons` map
needed in `wxt.config.ts`.

`action.default_icon` is **not** auto-derived from those discovered files
(that auto-derivation only applies to `popup.options.defaultIcon`, set via
the popup entrypoint's own convention) — `wxt.config.ts`'s `manifest.action`
sets it explicitly, pointing at the same four files, and WXT's
`addEntrypoints` step then merges in `default_popup` on top without
clobbering it.

## Generation approach (placeholder)

A trivially-producible placeholder: a flat-color PNG per size, hand-encoded
with Node's built-in `zlib` (`deflateSync` for the IDAT stream, `crc32` for
chunk checksums) — no image library, no new dependency. The one-off
generator script lived only in a scratch directory and was not committed;
only the resulting 4 PNG files are checked in under `public/icons/`.

Color: flat `#242938` (dark slate), no logotype/monogram — deliberately the
simplest placeholder that satisfies "a non-empty `icons` object", not a
design.

## MANUAL-PENDING

Real logo artwork (a designed icon reflecting the `ggraph` brand) is a
maintainer/design step, per the unit brief's explicit exclusion of "final
polished icon/screenshot artwork requiring design input." Swapping in final
artwork requires only replacing the 4 PNG files at their existing paths —
no further `wxt.config.ts` wiring changes needed.
