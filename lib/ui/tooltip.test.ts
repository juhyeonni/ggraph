import { describe, expect, it } from "vitest";
import { buildRelationshipBadge, formatRelationshipBadge } from "./tooltip";

describe("buildRelationshipBadge", () => {
  it("classifies a non-merge branch point and drops any mergeSource passed in", () => {
    const badge = buildRelationshipBadge(
      { parentCount: 1, childCount: 2, isMerge: false, isBranchPoint: true },
      { branch: "should-be-ignored", prNumber: 1 },
    );
    expect(badge.marker).toBe("branch-point");
    expect(badge.mergeSource).toBeNull();
  });

  it("classifies a merge row (even when also a branch point) primarily as merge-point", () => {
    const badge = buildRelationshipBadge(
      { parentCount: 2, childCount: 2, isMerge: true, isBranchPoint: true },
      { branch: "release", prNumber: 12 },
    );
    expect(badge.marker).toBe("merge-point");
    expect(badge.mergeSource).toEqual({ branch: "release", prNumber: 12 });
  });
});

describe("formatRelationshipBadge", () => {
  it("formats a non-merge branch point with child count only", () => {
    const badge = buildRelationshipBadge(
      { parentCount: 1, childCount: 3, isMerge: false, isBranchPoint: true },
      null,
    );
    expect(formatRelationshipBadge(badge)).toBe("branch point · 3 children");
  });

  it("falls back to parent count when the merge message doesn't parse", () => {
    const badge = buildRelationshipBadge(
      { parentCount: 2, childCount: 1, isMerge: true, isBranchPoint: false },
      null,
    );
    expect(formatRelationshipBadge(badge)).toBe("merge · 2 parents");
  });

  it("includes the branch and PR number when the merge message parses", () => {
    const badge = buildRelationshipBadge(
      { parentCount: 2, childCount: 1, isMerge: true, isBranchPoint: false },
      { branch: "juhyeonni/dev", prNumber: 79 },
    );
    expect(formatRelationshipBadge(badge)).toBe("merge · 2 parents · from juhyeonni/dev · PR #79");
  });

  it("omits the PR segment for a plain branch merge with no PR", () => {
    const badge = buildRelationshipBadge(
      { parentCount: 2, childCount: 1, isMerge: true, isBranchPoint: false },
      { branch: "foo", prNumber: null },
    );
    expect(formatRelationshipBadge(badge)).toBe("merge · 2 parents · from foo");
  });

  it("appends child count when a merge row is also a branch point", () => {
    const badge = buildRelationshipBadge(
      { parentCount: 2, childCount: 2, isMerge: true, isBranchPoint: true },
      { branch: "release", prNumber: 12 },
    );
    expect(formatRelationshipBadge(badge)).toBe(
      "merge · 2 parents · from release · PR #12 · 2 children",
    );
  });
});
