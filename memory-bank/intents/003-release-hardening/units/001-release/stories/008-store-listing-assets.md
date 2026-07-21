---
id: 008-store-listing-assets
unit: 001-release
intent: 003-release-hardening
status: complete
priority: must
created: '2026-07-21T06:35:00Z'
assigned_bolt: 010-release
implemented: true
---

# Story: 008-store-listing-assets

## User Story

**As a** maintainer preparing the v1.0.0 release
**I want** all Chrome Web Store listing content and assets prepared ahead of time
**So that** submission (once a developer account exists) is a paste-and-upload action, not a scramble

## Acceptance Criteria

- [ ] **Given** the extension's actual functionality, **When** listing copy is written, **Then** a document has a title, a short summary (≤132 chars, CWS's limit), and a detailed description covering the zero-config graph view and optional sign-in
- [ ] **Given** the extension needs screenshots, **When** a shot-list is written, **Then** it names each shot's scene and purpose (default: 3 shots — signed-out graph on a public repo, hover tooltip, sign-in/settings panel — per requirements.md Open Questions default)
- [ ] **Given** the Chrome Web Store requires icons at specific sizes, **When** the icon spec is written, **Then** it lists every required size (16/32/48/128 for the extension; CWS store-listing icon is typically 128px reused) and either a generated placeholder file or a documented generation approach (e.g. a simple SVG mark rendered to each PNG size)
- [ ] **Given** story 006's privacy audit, **When** the listing's privacy disclosure text is written, **Then** it states exactly what the audit confirmed (only `api.github.com`/`github.com`, `chrome.storage.local` only, no analytics) — no broader or narrower claim
- [ ] **Given** this document, **When** read, **Then** it explicitly states that developer-account creation, asset upload, and submission for review are maintainer actions not performed by this story

## Technical Notes

- This is a content/planning story — output is a markdown document, not
  code. Icon placeholder generation (if attempted) can be a small one-off
  script or a simple design tool export; no new runtime dependency.
- Reuses story 007's manifest description as the canonical short
  description where the two overlap, to avoid drift between manifest and
  listing copy.

## Dependencies

### Requires
- 006-privacy-security-audit (disclosure text source)

### Enables
- 007-manifest-release-readiness (icon files + finalized description)
- 010-release-checklist (cites listing content as ready)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Real screenshots require a live repo with realistic commit history | Shot-list documents which repo/fixture to use for capture; capturing the actual images is a maintainer/Construction action, this story defines what to capture |
| No design resource available for final icon artwork | Placeholder (e.g. a simple monochrome mark) ships as the interim icon; the doc names this explicitly as a placeholder, not a final asset |
| CWS character/size limits change or are misremembered | Document the limits as currently understood, flagged as "verify against current CWS developer docs at submission time" |

## Out of Scope

- Actually creating a developer account, uploading, or submitting (maintainer action)
- Bespoke visual design work beyond a placeholder + generation approach
