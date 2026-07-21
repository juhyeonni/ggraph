# Chrome Web Store Listing — ggraph v1.0.0

Ready-to-paste listing content. Everything in this document is buildable
without a Chrome Web Store developer account. Account creation, uploading
these assets, and submitting for review are **maintainer actions**, not
performed by this document — see `docs/RELEASE-CHECKLIST.md`.

## Title

```
ggraph — commit graph for GitHub
```

## Category

Developer Tools

## Short summary (≤132 chars, CWS limit — verify against current CWS
developer docs at submission time)

```
Commit graph on GitHub's commits page
```

(37 chars — reused verbatim from `wxt.config.ts`'s manifest `description`,
per story 008's technical note, so the listing and the installed
extension's own description never drift apart.)

## Full description

```
See how branches actually merged — right on GitHub's commits page.

GitHub's commits page is a flat list: you can't see how work from
different branches came together. ggraph overlays an interactive
git-log-graph-style diagram directly onto github.com/{owner}/{repo}/commits,
so the branch and merge structure is visible where you're already looking.

• Zero configuration — install and it just works on any public repo
• Hover a commit for its message, author, and date; click to open it
• Matches GitHub's light/dark theme automatically
• Fast: graphs of 500+ commits render in single-digit milliseconds
• Small: under 15KB of shipped code (gzip)

Optional "Sign in with GitHub" (secure OAuth device flow — enter a code on
github.com, no password or token ever typed into this extension) unlocks
private repositories and raises your rate limit from 60 to 5,000
requests/hour.

Privacy: this extension only talks to github.com and api.github.com. It
sends no data to any other server, has no analytics or tracking of any
kind, and stores nothing except your commit cache, sign-in state, and one
setting — all locally in your browser, never synced or transmitted
elsewhere.
```

## Screenshot shot-list

Three shots, captured against the built extension on a real repository
with realistic commit/merge history (a maintainer/Construction task — this
document defines *what* to capture, not the images themselves):

1. **Signed-out graph on a public repo** — the commits page of a public
   repository with visible branch/merge structure, extension active,
   default (unauthenticated) state. Purpose: show the zero-config value
   prop first, since most visitors will never sign in.
2. **Hover tooltip** — same page, mouse hovering a merge-commit node so the
   tooltip (message/author/date/SHA) is visible mid-interaction. Purpose:
   show the graph is interactive, not a static overlay.
3. **Sign-in / settings panel** — the extension's popup, either mid
   device-flow (code + verification link shown) or the signed-in state
   with the commit-depth setting visible. Purpose: show the optional
   sign-in path exists and is lightweight (one popup, no forms).

## Icon asset spec

| Size | File | Status |
|---|---|---|
| 16px | `public/icons/16.png` | Placeholder (flat `#242938`, no logo) |
| 32px | `public/icons/32.png` | Placeholder |
| 48px | `public/icons/48.png` | Placeholder |
| 128px | `public/icons/128.png` | Placeholder (CWS store-listing icon reuses this size) |

Generation approach: hand-encoded flat-color PNGs via Node's built-in
`zlib`, no image library or new dependency — see
`memory-bank/bolts/009-release/icon-spec.md` for the full generation and
manifest-wiring notes. **MANUAL-PENDING**: replacing these four files with
real designed artwork is a maintainer/design step; no further
`wxt.config.ts` change is needed to swap them in, since `manifest.icons`
and `manifest.action.default_icon` already point at these paths.

## Privacy disclosure

Exactly what the code audit confirmed
(`memory-bank/bolts/009-release/privacy-audit.md`) — no broader or
narrower claim:

- The only outbound network destinations in the entire codebase are
  `api.github.com` (fetching commit data) and `github.com` (the OAuth
  device-flow endpoints). No other host is ever contacted.
- All persisted data uses `chrome.storage.local` only — the commit cache,
  the sign-in token, and the commit-depth setting. `chrome.storage.sync`
  is never used (and is actively test-guarded at zero calls).
- There is no analytics, telemetry, or third-party SDK anywhere in the
  code or dependencies.
- No token, credential, or personal data is ever logged.

## Permissions justification

| Permission | Why it's requested |
|---|---|
| `storage` | Local-only cache of fetched commits (10-minute TTL, capped entry count), the optional sign-in token, and the commit-depth setting. Never synced off-device. |
| `host_permissions: https://github.com/*` | Inject the graph rail on commits pages, and reach the two OAuth device-flow endpoints (`github.com/login/device/code`, `github.com/login/oauth/access_token`) for optional sign-in. |
| `host_permissions: https://api.github.com/*` | Fetch commit data (`GET /repos/{owner}/{repo}/commits`) to build the graph. |

No permission beyond these three is requested; this matches exactly what
the FR-5 privacy/security audit found actually in use in the code
(`wxt.config.ts`'s `permissions`/`host_permissions` are unchanged from what
the audit verified).

## Out of scope (maintainer actions)

- Creating a Chrome Web Store developer account
- Capturing the three screenshots above
- Designing and swapping in final icon artwork
- Uploading assets and submitting the listing for review
