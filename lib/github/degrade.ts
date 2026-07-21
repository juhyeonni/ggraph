import { formatResetIn } from "../util/relative-time";
import type { FetchCommitsError } from "./fetch-commits";

export type DegradeAction =
  | { kind: "silent" }
  | { kind: "notice"; text: string; clearToken: boolean };

// Pure branch logic for entrypoints/commits.content.ts's degrade() — kept
// separate from DOM/notice wiring so it's directly unit-testable (the
// content script itself has no WXT entrypoint test harness in this repo).
//
// hasToken is derived by the caller from local auth state (whether the
// fetch that produced `error` carried a token), per bolt.md: rate-limit
// messaging must not add a new field to FetchCommitsError.
export function decideDegrade(
  error: FetchCommitsError,
  hasToken: boolean,
  now: number = Date.now(),
): DegradeAction {
  if (error.kind === "not-found") {
    if (hasToken) return { kind: "silent" }; // signed-in 404: unchanged from intent 001
    return { kind: "notice", text: "sign in to view private repositories", clearToken: false };
  }
  if (error.kind === "unauthorized") {
    return { kind: "notice", text: "session expired — sign in again", clearToken: true };
  }
  if (error.kind === "rate-limited") {
    const limit = hasToken ? "5,000/hr" : "60/hr";
    const text = `rate limit reached (${limit}), resets in ${formatResetIn(error.resetAt, now)}`;
    return { kind: "notice", text, clearToken: false };
  }
  return { kind: "notice", text: "couldn't load the commit graph", clearToken: false };
}
