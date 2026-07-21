# ggraph

Install the extension, open any public GitHub repository's commits page, and
instantly see an interactive branch-integration graph — zero configuration.
Optional "Sign in with GitHub" (device flow, no token pasting, no backend)
unlocks private repositories and a 5,000 req/hr rate limit.

GitHub's commits page is a flat list: you cannot see how branches merged
into each other. `ggraph` overlays a `git log --graph`-style DAG directly
where developers already look, as an inline canvas rail next to the commit
list.

## Install

**Chrome Web Store**: coming soon (not yet published — see
`docs/RELEASE-CHECKLIST.md` for release status).

**Load unpacked (development build)**:

1. `pnpm install`
2. `pnpm build` — produces `.output/chrome-mv3`
3. Open `chrome://extensions`
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked** and select the `.output/chrome-mv3` folder
6. Open any repo's commits page, e.g. `github.com/{owner}/{repo}/commits`

## Usage

Open a repository's `/commits` page (default branch or any ref/tag). A
canvas rail appears to the left of the commit list showing each commit as a
node, connected to its parent(s):

- A straight line down a lane is a commit continuing that branch.
- A line joining two lanes is a merge — the graph shows which branch fed
  into which.
- **Hover** a node to see a tooltip with the commit message, author, date,
  and short SHA.
- **Click** a node to navigate to that commit's page (Cmd/Ctrl-click or
  middle-click opens it in a new tab).
- The rail redraws on scroll and on GitHub's own commits-page navigation
  (e.g. paging to older commits), and matches the page's light/dark theme.
- If the graph can't load (rate limit, private repo, network error), a
  small inline notice appears instead of breaking the page — the extension
  never blocks or slows the host GitHub page.

## Sign-in

Signing in is optional. Unauthenticated, you get 60 requests/hr/IP against
public repos (cached to reduce repeat fetches). Signing in with GitHub
raises this to 5,000 req/hr and unlocks private repos:

1. Open the extension's popup (toolbar icon) and click **Sign in with
   GitHub**.
2. The popup shows a one-time code and a verification link
   (`github.com/login/device`). Open the link and enter the code.
3. Once you approve access on GitHub, the popup shows **Signed in**
   automatically — no token is ever typed into this extension.
4. **Sign out** from the same popup at any time.

This is the OAuth **Device Authorization Grant** — no client secret, no
backend server, and no pasted personal access token in this flow.

> **Maintainer note**: sign-in only works once a maintainer registers a
> real GitHub OAuth App and sets `CLIENT_ID` in
> `lib/github/auth-config.ts` (currently a placeholder). Until then, the
> popup shows "GitHub sign-in isn't configured yet" and the extension
> still works fully in unauthenticated mode.

The popup's **Commit depth** field controls how many commits are fetched
per graph (1–2000, default 200).

## Privacy

No data leaves the browser except requests to GitHub itself:

- The only network destinations anywhere in the code are `api.github.com`
  (fetching commits) and `github.com` (the OAuth device-flow endpoints).
- All storage uses `chrome.storage.local` only (the commit cache, the
  auth token, and the commit-depth setting) — never `chrome.storage.sync`.
- No analytics, telemetry, or third-party SDK of any kind.
- Tokens are never logged.

This is backed by a code audit, not just a claim — see
`memory-bank/bolts/009-release/privacy-audit.md`.

## Development

Requires [pnpm](https://pnpm.io).

| Command | What it does |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Run the WXT dev server (hot-reloading unpacked build) |
| `pnpm build` | Production build to `.output/chrome-mv3` |
| `pnpm test` | Run the Vitest unit suite |
| `pnpm test:e2e` | Build the extension and run the Playwright E2E suite |
| `pnpm bench` | Layout + draw performance benchmark |
| `pnpm bench:bundle-size` | Gzip bundle-size budget check against the production build |
| `pnpm lint` | Biome lint/format check |
| `pnpm typecheck` | `tsc --noEmit` |

Run `pnpm exec playwright install chromium` once per machine before the
first `pnpm test:e2e`.

## Performance

Measured, not assumed — recorded in
`memory-bank/bolts/007-release/test-walkthrough.md` and
`memory-bank/bolts/008-release/test-walkthrough.md`:

| Metric | Measured | Budget |
|---|---|---|
| Layout + draw, 500 commits | 2.80ms | <100ms |
| Layout + draw, 2000 commits | 9.20ms | <100ms |
| Shipped JS (gzip) | 14.29KB | ≤100KB |
| Extra JS heap, 600-commit graph | 0.57–1.13MB | ≤50MB |

## Tech stack

TypeScript (strict), [WXT](https://wxt.dev) (MV3 extension framework),
[Preact](https://preactjs.com) (popup UI), pnpm, Biome (lint/format),
Vitest (unit tests), Playwright (E2E).

## License

No license is currently declared for this repository (no `LICENSE` file,
no `license` field in `package.json`). Add one before public distribution
if that's intended.
