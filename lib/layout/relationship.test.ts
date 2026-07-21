import { describe, expect, it } from "vitest";
import type { GraphEdge, LayoutCommit } from "../../types/graph";
import { computeLayout } from "./compute-layout";
import { classifyRow, computeRelationshipHighlight } from "./relationship";

function edgeBetween(
  edges: readonly GraphEdge[],
  fromRow: number,
  toRow: number | null,
): GraphEdge {
  const edge = edges.find((e) => e.fromRow === fromRow && e.toRow === toRow);
  if (edge === undefined) throw new Error(`no edge ${fromRow}->${toRow}`);
  return edge;
}

describe("classifyRow", () => {
  it("classifies a normal single-parent, single-child row as neither", () => {
    const commits: LayoutCommit[] = [
      { sha: "c", parents: ["b"] },
      { sha: "b", parents: ["a"] },
      { sha: "a", parents: [] },
    ];
    const layout = computeLayout(commits);
    expect(classifyRow(layout, 1)).toEqual({
      parentCount: 1,
      childCount: 1,
      isMerge: false,
      isBranchPoint: false,
    });
  });

  it("classifies a 2-parent row as isMerge (not a branch point when it has no children)", () => {
    const commits: LayoutCommit[] = [
      { sha: "m", parents: ["a", "f"] },
      { sha: "f", parents: ["a"] },
      { sha: "a", parents: [] },
    ];
    const layout = computeLayout(commits);
    expect(classifyRow(layout, 0)).toEqual({
      parentCount: 2,
      childCount: 0,
      isMerge: true,
      isBranchPoint: false,
    });
  });

  it("classifies a row referenced as parent by two rows as isBranchPoint (not a merge)", () => {
    const commits: LayoutCommit[] = [
      { sha: "x", parents: ["p"] },
      { sha: "y", parents: ["p"] },
      { sha: "p", parents: [] },
    ];
    const layout = computeLayout(commits);
    expect(classifyRow(layout, 2)).toEqual({
      parentCount: 0,
      childCount: 2,
      isMerge: false,
      isBranchPoint: true,
    });
  });

  it("classifies a row that is both a merge and a branch point", () => {
    const commits: LayoutCommit[] = [
      { sha: "x", parents: ["m"] },
      { sha: "y", parents: ["m"] },
      { sha: "m", parents: ["a", "b"] },
      { sha: "a", parents: [] },
      { sha: "b", parents: [] },
    ];
    const layout = computeLayout(commits);
    expect(classifyRow(layout, 2)).toEqual({
      parentCount: 2,
      childCount: 2,
      isMerge: true,
      isBranchPoint: true,
    });
  });
});

describe("computeRelationshipHighlight", () => {
  it("highlights the full chain for a linear history with no merges", () => {
    const commits: LayoutCommit[] = [
      { sha: "c", parents: ["b"] },
      { sha: "b", parents: ["a"] },
      { sha: "a", parents: [] },
    ];
    const layout = computeLayout(commits);
    const highlight = computeRelationshipHighlight(layout, 1);
    expect(highlight.rows).toEqual(new Set([0, 1, 2]));
    expect(highlight.edges).toEqual(
      new Set([edgeBetween(layout.edges, 0, 1), edgeBetween(layout.edges, 1, 2)]),
    );
  });

  it("stops cleanly with no error at the root and at the head", () => {
    const commits: LayoutCommit[] = [
      { sha: "c", parents: ["b"] },
      { sha: "b", parents: ["a"] },
      { sha: "a", parents: [] },
    ];
    const layout = computeLayout(commits);
    expect(() => computeRelationshipHighlight(layout, 0)).not.toThrow();
    expect(() => computeRelationshipHighlight(layout, 2)).not.toThrow();
    expect(computeRelationshipHighlight(layout, 0).rows).toEqual(new Set([0, 1, 2]));
    expect(computeRelationshipHighlight(layout, 2).rows).toEqual(new Set([0, 1, 2]));
  });

  it("includes both parent edges of a merge that is itself the focused row", () => {
    const commits: LayoutCommit[] = [
      { sha: "m", parents: ["a", "f"] },
      { sha: "f", parents: ["a"] },
      { sha: "a", parents: [] },
    ];
    const layout = computeLayout(commits);
    const highlight = computeRelationshipHighlight(layout, 0);
    // f's row lights up (the merged-in tip) but the walk does not continue
    // past it: f->a is f's own edge, not part of m's chain, and is excluded.
    expect(highlight.rows).toEqual(new Set([0, 1, 2]));
    expect(highlight.edges).toEqual(
      new Set([edgeBetween(layout.edges, 0, 2), edgeBetween(layout.edges, 0, 1)]),
    );
    expect(highlight.edges.has(edgeBetween(layout.edges, 1, 2))).toBe(false);
  });

  it("fans out to the union of every first-parent child at a branch point", () => {
    const commits: LayoutCommit[] = [
      { sha: "x", parents: ["p"] },
      { sha: "y", parents: ["p"] },
      { sha: "p", parents: [] },
    ];
    const layout = computeLayout(commits);
    const highlight = computeRelationshipHighlight(layout, 2);
    expect(highlight.rows).toEqual(new Set([0, 1, 2]));
    expect(highlight.edges).toEqual(
      new Set([edgeBetween(layout.edges, 0, 2), edgeBetween(layout.edges, 1, 2)]),
    );
  });

  it("crosses a merge on the first-parent chain without lighting up its other branch", () => {
    const commits: LayoutCommit[] = [
      { sha: "h", parents: ["m"] },
      { sha: "m", parents: ["main1", "side"] },
      { sha: "side", parents: ["sideRoot"] },
      { sha: "main1", parents: ["root"] },
      { sha: "root", parents: [] },
      { sha: "sideRoot", parents: [] },
    ];
    const layout = computeLayout(commits);
    const highlight = computeRelationshipHighlight(layout, 0);
    // h -> m -> main1 -> root is the first-parent chain (the base line). m is a
    // merge on the chain but NOT the focused commit, so its extra parent "side"
    // (the branch merged into m) must NOT light up — only the focused commit's
    // own merge expands into its other branch.
    expect(highlight.rows).toEqual(new Set([0, 1, 3, 4]));
    expect(highlight.rows.has(2)).toBe(false);
    expect(highlight.rows.has(5)).toBe(false);
    expect(highlight.edges.has(edgeBetween(layout.edges, 1, 2))).toBe(false);
  });

  it("stops the ancestor walk at a dangling edge without crashing", () => {
    const commits: LayoutCommit[] = [
      { sha: "c", parents: ["b"] },
      { sha: "b", parents: ["a"] },
    ];
    const layout = computeLayout(commits);
    const highlight = computeRelationshipHighlight(layout, 1);
    expect(highlight.rows).toEqual(new Set([0, 1]));
    expect(highlight.edges).toEqual(
      new Set([edgeBetween(layout.edges, 0, 1), edgeBetween(layout.edges, 1, null)]),
    );
  });
});
