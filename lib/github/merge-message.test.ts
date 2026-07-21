import { describe, expect, it } from "vitest";
import { parseMergeSource } from "./merge-message";

describe("parseMergeSource", () => {
  it("parses the exact GitHub PR-merge format", () => {
    expect(parseMergeSource("Merge pull request #79 from juhyeonni/dev")).toEqual({
      branch: "juhyeonni/dev",
      prNumber: 79,
    });
  });

  it("preserves a branch name that itself contains additional slashes", () => {
    expect(parseMergeSource("Merge pull request #12 from someorg/feature/nested-thing")).toEqual({
      branch: "someorg/feature/nested-thing",
      prNumber: 12,
    });
  });

  it("parses a plain local merge with no PR", () => {
    expect(parseMergeSource("Merge branch 'foo'")).toEqual({ branch: "foo", prNumber: null });
  });

  it("returns null for a non-merge commit message", () => {
    expect(parseMergeSource("Fix off-by-one error in pagination")).toBeNull();
  });

  it("returns null for an empty string without throwing", () => {
    expect(() => parseMergeSource("")).not.toThrow();
    expect(parseMergeSource("")).toBeNull();
  });

  it("ignores trailing text after the recognized prefix on later lines", () => {
    const message = "Merge pull request #7 from acme/fix\n\nResolved merge conflicts.";
    expect(parseMergeSource(message)).toEqual({ branch: "acme/fix", prNumber: 7 });
  });

  it("parses a PR number with leading zeros as a plain integer", () => {
    expect(parseMergeSource("Merge pull request #007 from acme/fix")).toEqual({
      branch: "acme/fix",
      prNumber: 7,
    });
  });
});
