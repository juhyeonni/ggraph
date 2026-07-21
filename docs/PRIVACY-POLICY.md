# Privacy Policy — ggraph

**Effective date:** 2026-07-21

ggraph ("the extension") is a browser extension that draws a commit graph on
GitHub's commits page. This policy explains exactly what data the extension
touches. It is grounded in a line-by-line audit of the source code
(`memory-bank/bolts/009-release/privacy-audit.md`); the claims below are what
the code actually does, no broader and no narrower.

## Short version

The extension sends **no data to anyone except GitHub**, has **no analytics or
tracking of any kind**, and stores everything **locally in your browser**. There
is no ggraph server; there is no account with us.

## What the extension accesses

To draw the graph, the extension reads the public commit data of the repository
whose commits page you are viewing, via GitHub's REST API.

- **Network requests are made only to two hosts:**
  - `api.github.com` — to fetch commit data (`GET /repos/{owner}/{repo}/commits`).
  - `github.com` — only if you choose to sign in, for GitHub's OAuth device-flow
    endpoints (`/login/device/code`, `/login/oauth/access_token`).
- No other server, domain, or endpoint is ever contacted.

## What the extension stores (locally only)

All persistence uses `chrome.storage.local` — data stays on your device, is
never synced across devices (`chrome.storage.sync` is never used), and is never
transmitted anywhere except as described below.

| Data | Purpose | Where it goes |
|------|---------|----------------|
| Commit cache (short TTL, capped size) | Avoid refetching the same commits | Local only |
| Commit-depth setting | Your chosen graph depth | Local only |
| GitHub access token (only if you sign in) | Authenticate API requests for private repos and a higher rate limit | Local only; sent solely as an `Authorization` header to `api.github.com` |

## Sign-in (optional)

Signing in is optional and off by default. It uses **GitHub's OAuth device
flow**: you enter a short code on github.com — you never type a password or
paste a token into this extension. The resulting access token is stored locally
and used only to authorize requests to `api.github.com`. It is transmitted to no
one else and is never logged.

## What the extension does NOT do

- **No analytics, telemetry, tracking, or third-party SDKs** — anywhere in the
  code or its dependencies.
- **No selling, sharing, or transmission** of your data to any third party.
- **No logging** of tokens, credentials, or personal information.
- No collection of browsing history, and no access to pages other than GitHub
  commits pages.

## Your control

- **Sign out** (in the extension's settings) immediately clears the stored
  access token.
- **Uninstalling** the extension removes all locally stored data (cache, token,
  and setting).

## Permissions and why

| Permission | Why |
|------------|-----|
| `storage` | Local-only cache, the optional sign-in token, and your depth setting. |
| host access to `github.com` | Inject the graph on commits pages; reach the OAuth device-flow endpoints if you sign in. |
| host access to `api.github.com` | Fetch commit data to build the graph. |

No permission beyond these is requested.

## Changes

If this policy changes, the updated version will be published at this document's
URL with a new effective date.

## Contact

Questions about this policy: open an issue at
<https://github.com/juhyeonni/ggraph/issues>.
