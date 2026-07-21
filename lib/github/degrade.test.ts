import { describe, expect, it } from "vitest";
import { decideDegrade } from "./degrade";
import type { FetchCommitsError } from "./fetch-commits";

describe("decideDegrade", () => {
  it("is silent for a signed-in 404 (unchanged from intent 001)", () => {
    const error: FetchCommitsError = { kind: "not-found" };
    expect(decideDegrade(error, true)).toEqual({ kind: "silent" });
  });

  it("shows a sign-in notice for a signed-out 404", () => {
    const error: FetchCommitsError = { kind: "not-found" };
    expect(decideDegrade(error, false)).toEqual({
      kind: "notice",
      text: "sign in to view private repositories",
      clearToken: false,
    });
  });

  it("clears the token and shows a re-auth notice on 401", () => {
    const error: FetchCommitsError = { kind: "unauthorized" };
    expect(decideDegrade(error, true)).toEqual({
      kind: "notice",
      text: "session expired — sign in again",
      clearToken: true,
    });
  });

  it("states the 5,000/hr limit when a token was present", () => {
    const error: FetchCommitsError = { kind: "rate-limited", resetAt: 1000 };
    const action = decideDegrade(error, true, 0);
    expect(action.kind).toBe("notice");
    if (action.kind === "notice") {
      expect(action.text).toContain("5,000/hr");
      expect(action.clearToken).toBe(false);
    }
  });

  it("states the 60/hr limit when no token was present", () => {
    const error: FetchCommitsError = { kind: "rate-limited", resetAt: 1000 };
    const action = decideDegrade(error, false, 0);
    expect(action.kind).toBe("notice");
    if (action.kind === "notice") expect(action.text).toContain("60/hr");
  });

  it("includes the formatted reset time in the rate-limit notice", () => {
    const error: FetchCommitsError = { kind: "rate-limited", resetAt: 120 };
    const action = decideDegrade(error, false, 0);
    if (action.kind === "notice") expect(action.text).toContain("resets in 2 min");
  });

  it("falls back to a generic notice for an unknown error", () => {
    const error: FetchCommitsError = { kind: "unknown" };
    expect(decideDegrade(error, true)).toEqual({
      kind: "notice",
      text: "couldn't load the commit graph",
      clearToken: false,
    });
  });
});
