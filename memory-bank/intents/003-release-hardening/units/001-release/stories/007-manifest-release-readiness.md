---
id: 007-manifest-release-readiness
unit: 001-release
intent: 003-release-hardening
status: complete
priority: must
created: '2026-07-21T06:35:00Z'
assigned_bolt: 009-release
implemented: true
---

# Story: 007-manifest-release-readiness

## User Story

**As a** maintainer preparing the v1.0.0 release
**I want** the extension manifest to have a release version, icons, and finalized metadata
**So that** the build is submittable to the Chrome Web Store, which requires icons and rejects placeholder versions

## Acceptance Criteria

- [ ] **Given** `wxt.config.ts`'s manifest config, **When** the version is set, **Then** the built `manifest.json` shows `"version": "1.0.0"` (currently `0.1.0`, inherited from `package.json`)
- [ ] **Given** icon assets at 16/32/48/128px (placeholder or generated, per story 008's icon spec), **When** wired into `wxt.config.ts`, **Then** the built `manifest.json` has a non-empty `icons` object and `action.default_icon` is set (both currently absent)
- [ ] **Given** the description field, **When** reviewed, **Then** it matches the finalized store-listing summary from story 008 (not the current placeholder "Commit graph on GitHub's commits page" if a better one is written there)
- [ ] **Given** `permissions`/`host_permissions`, **When** compared against story 006's audit, **Then** they match exactly — no permission requested that isn't actually used
- [ ] **Given** the manifest changes, **When** story 002's bundle-size script is re-run, **Then** the JS gzip budget still passes (icons are non-JS and shouldn't affect it, but this confirms rather than assumes that)

## Technical Notes

- WXT reads `manifest.icons`/`manifest.action.default_icon` from
  `defineConfig`'s `manifest` block, same place `permissions`/
  `host_permissions` are already set today.
- `version` can either be set explicitly in the `manifest` block (overriding
  the `package.json`-derived default) or `package.json`'s own `version`
  field can be bumped to `1.0.0` — bumping `package.json` is simpler and
  keeps a single source of truth, consistent with how WXT currently derives
  `0.1.0` from it.
- Icon files themselves are produced by story 008's spec/generation
  approach; this story is the wiring, not the asset creation.

## Dependencies

### Requires
- 006-privacy-security-audit (permissions must match)
- 008-store-listing-assets (icon files + finalized description text feed this story — Construction may sequence icon creation before or interleaved with this story since both are in different bolts; the wiring itself only needs the files to exist)

### Enables
- 002-bundle-size-check (re-run after this story)
- 010-release-checklist (cites manifest release-readiness as done)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Icon files not yet ready when this story starts | Use placeholder icons initially (per story 008's "placeholder + generation approach"); swap for final assets without re-touching the wiring code |
| `package.json` version bump affects other tooling (e.g. a lockfile) | Confirm `pnpm-lock.yaml` doesn't need regeneration for a version-only change (it shouldn't, no dependency change) |
| Description text not finalized when this story starts | Use the current placeholder description until story 008 finalizes copy, then update in the same story or a small follow-up |

## Out of Scope

- Actual icon artwork design (story 008 plans a placeholder/generation approach, not bespoke design)
- Chrome Web Store submission itself (maintainer action, see requirements.md Scope)
