---
id: 009-readme-user-docs
unit: 001-release
intent: 003-release-hardening
status: complete
priority: must
created: '2026-07-21T06:35:00Z'
assigned_bolt: 010-release
implemented: true
---

# Story: 009-readme-user-docs

## User Story

**As a** developer discovering the extension (on GitHub or the Chrome Web Store)
**I want** a README covering install, usage, sign-in, privacy, and how to build it myself
**So that** I can use or contribute to the extension without asking the maintainer directly

## Acceptance Criteria

- [ ] **Given** the README, **When** read, **Then** it has an Install section covering both "load unpacked" (today) and "Chrome Web Store" (once published, with a placeholder link/note)
- [ ] **Given** the README, **When** read, **Then** it has a Usage section explaining what the graph shows (branch/merge topology on the commits page) and how to read it
- [ ] **Given** the README, **When** read, **Then** it has a Sign-in section walking through the device-flow experience (trigger sign-in, enter the code at the verification URL, what changes once signed in)
- [ ] **Given** story 006's privacy audit, **When** the README's Privacy section is written, **Then** it states exactly what the audit confirmed, consistent with story 008's listing disclosure (no drift between the two)
- [ ] **Given** `package.json`'s `scripts`, **When** the Development section lists commands, **Then** every command mentioned (`pnpm dev`, `pnpm build`, `pnpm test`, `pnpm bench`, `pnpm lint`, `pnpm typecheck`, plus any new scripts from stories 001/002/003) actually exists in `package.json`

## Technical Notes

- Root-level `README.md` — no existing README to migrate from (repo
  currently has none based on the file listing).
- Keep sign-in section consistent with intent 002's actual UX (device-flow
  code + verification link, settings panel for sign-out/commit-depth).

## Dependencies

### Requires
- 006-privacy-security-audit (privacy section source)

### Enables
- 010-release-checklist (cites README as done)

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| A `pnpm` script is renamed/added by stories 001-003 after README is drafted | README updated in the same story/bolt pass, or flagged for a quick follow-up before bolt 010 closes |
| Reader has never used a browser extension before | Install section is explicit about `chrome://extensions`, developer mode, "load unpacked" steps — not assumed knowledge |
| Store link doesn't exist yet at README-writing time | Use a clearly marked placeholder (e.g. "Chrome Web Store: coming soon") rather than a broken link |

## Out of Scope

- API/contributor architecture docs beyond a brief dev/build section (not requested by the roadmap's "README + user docs" scope)
- Localization (English only, per project convention)
