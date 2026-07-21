---
id: 006-settings-panel-ui
unit: 001-auth
intent: 002-github-sign-in
status: complete
priority: must
created: '2026-07-21T04:35:00Z'
assigned_bolt: 006-auth
implemented: true
---

# Story: 006-settings-panel-ui

## User Story

**As a** developer using the extension
**I want** a settings panel showing my sign-in state with a sign-in control
**So that** I can control authentication without leaving the popup

## Acceptance Criteria

- [ ] **Given** the popup opens signed-out, **When** rendered, **Then** it shows a "Sign in with GitHub" action (replacing the current placeholder text in `entrypoints/popup/main.tsx`)
- [ ] **Given** sign-in is triggered from the popup, **When** the device code is available, **Then** the user code and verification link are shown inline in the popup
- [ ] **Given** the token becomes available (poll succeeds), **When** the popup is open, **Then** it updates to the signed-in state without the user closing/reopening it
- [ ] **Given** the popup opens signed-in, **When** rendered, **Then** it shows the signed-in state clearly (distinct from signed-out)

## Technical Notes

- Extends `entrypoints/popup/main.tsx` (currently a static `<p>` Preact
  render) into a small stateful component; reads auth state via the module
  from stories 001-003.
- Keep it a single small component — no router/framework needed for a
  popup this size.

## Dependencies

### Requires
- 003-token-storage

### Enables
- 007-commit-depth-setting, 008-sign-out

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Popup opened while a device-flow poll is already in progress | Shows the in-progress user code/link, not a fresh sign-in prompt |
| `chrome.storage` read fails when popup opens | Falls back to signed-out UI rather than an error state |
| Popup closed mid device-flow polling | Polling continues in the background (per the resolved background-worker default); reopening the popup shows current state |

## Out of Scope

- Commit-depth control (007), sign-out button behavior (008)
