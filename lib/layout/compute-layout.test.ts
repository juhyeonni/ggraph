import { describe, expect, it } from "vitest";
import type { GraphLayout, LayoutCommit } from "../../types/graph";
import { computeLayout } from "./compute-layout";

function dedupe(commits: LayoutCommit[]): LayoutCommit[] {
  const seen = new Set<string>();
  const out: LayoutCommit[] = [];
  for (const commit of commits) {
    if (seen.has(commit.sha)) continue;
    seen.add(commit.sha);
    out.push(commit);
  }
  return out;
}

// Connectivity is the "matches git log --graph" property: every parent pointer
// must be represented by exactly one edge from the child row to the parent's
// row (or a dangling edge when the parent is outside the fetched window).
function edgeTopology(commits: LayoutCommit[]): string[] {
  const deduped = dedupe(commits);
  const rowOf = new Map(deduped.map((c, i) => [c.sha, i]));
  const expected: string[] = [];
  deduped.forEach((commit, row) => {
    for (const parent of commit.parents) {
      const toRow = rowOf.has(parent) ? rowOf.get(parent) : null;
      expected.push(`${row}->${toRow}`);
    }
  });
  return expected.sort();
}

function actualTopology(layout: GraphLayout): string[] {
  return layout.edges.map((e) => `${e.fromRow}->${e.toRow}`).sort();
}

describe("computeLayout", () => {
  it("lays out a linear history in a single lane", () => {
    const commits: LayoutCommit[] = [
      { sha: "c", parents: ["b"] },
      { sha: "b", parents: ["a"] },
      { sha: "a", parents: [] },
    ];
    const layout = computeLayout(commits);
    expect(layout.rows.map((r) => r.lane)).toEqual([0, 0, 0]);
    expect(layout.laneCount).toBe(1);
    expect(actualTopology(layout)).toEqual(edgeTopology(commits));
  });

  it("routes a single merge and lands the parent in the lowest lane", () => {
    const commits: LayoutCommit[] = [
      { sha: "m", parents: ["a", "f"] },
      { sha: "f", parents: ["a"] },
      { sha: "a", parents: [] },
    ];
    const layout = computeLayout(commits);
    expect(layout.rows.map((r) => r.lane)).toEqual([0, 1, 0]);
    expect(layout.laneCount).toBe(2);
    expect(actualTopology(layout)).toEqual(edgeTopology(commits));

    // The merge-in edge f->a travels in lane 1 but the node `a` lands in lane 0:
    // its toLane must NOT equal the destination node's lane. This asymmetry is
    // exactly what the renderer has to curve into, so pin it down here.
    const mergeIn = layout.edges.find((e) => e.fromRow === 1 && e.toRow === 2);
    expect(mergeIn).toBeDefined();
    expect(mergeIn?.toLane).toBe(1);
    expect(layout.rows[2]?.lane).toBe(0);
  });

  it("handles a diamond where two children await the same parent", () => {
    const commits: LayoutCommit[] = [
      { sha: "d", parents: ["b", "c"] },
      { sha: "c", parents: ["a"] },
      { sha: "b", parents: ["a"] },
      { sha: "a", parents: [] },
    ];
    const layout = computeLayout(commits);
    expect(actualTopology(layout)).toEqual(edgeTopology(commits));

    // Regression guard: both b->a and c->a must survive. A per-lane pending-edge
    // slot would drop one when the second child registers to wait on `a`.
    const intoA = layout.edges.filter((e) => e.toRow === 3);
    expect(intoA).toHaveLength(2);
    expect(intoA.map((e) => e.fromRow).sort()).toEqual([1, 2]);
  });

  it("routes every parent of an octopus merge", () => {
    const commits: LayoutCommit[] = [
      { sha: "o", parents: ["a", "b", "c"] },
      { sha: "a", parents: [] },
      { sha: "b", parents: [] },
      { sha: "c", parents: [] },
    ];
    const layout = computeLayout(commits);
    const fromMerge = layout.edges.filter((e) => e.fromRow === 0);
    expect(fromMerge).toHaveLength(3);
    expect(fromMerge.map((e) => e.toRow).sort()).toEqual([1, 2, 3]);
    expect(layout.laneCount).toBe(3);
    expect(actualTopology(layout)).toEqual(edgeTopology(commits));
  });

  it("marks parents outside the fetched window as dangling", () => {
    const commits: LayoutCommit[] = [
      { sha: "c", parents: ["b"] },
      { sha: "b", parents: ["a"] },
    ];
    const layout = computeLayout(commits);
    const dangling = layout.edges.filter((e) => e.toRow === null);
    expect(dangling).toHaveLength(1);
    expect(dangling[0]?.fromRow).toBe(1);
  });

  it("reuses a freed lane for a later independent root", () => {
    const commits: LayoutCommit[] = [
      { sha: "x", parents: ["y"] },
      { sha: "z", parents: [] },
      { sha: "y", parents: [] },
      { sha: "w", parents: [] },
    ];
    const layout = computeLayout(commits);
    // y occupies lane 0 until it is placed; once closed, w reuses lane 0.
    expect(layout.rows.map((r) => r.lane)).toEqual([0, 1, 0, 0]);
    expect(actualTopology(layout)).toEqual(edgeTopology(commits));
  });

  it("deduplicates repeated shas defensively", () => {
    const commits: LayoutCommit[] = [
      { sha: "a", parents: ["b"] },
      { sha: "a", parents: ["b"] },
      { sha: "b", parents: [] },
    ];
    const layout = computeLayout(commits);
    expect(layout.rows).toHaveLength(2);
    expect(actualTopology(layout)).toEqual(edgeTopology(commits));
  });

  it("returns an empty layout for no commits", () => {
    const layout = computeLayout([]);
    expect(layout.rows).toEqual([]);
    expect(layout.edges).toEqual([]);
    expect(layout.laneCount).toBe(0);
  });

  it("lays out a single root commit", () => {
    const layout = computeLayout([{ sha: "a", parents: [] }]);
    expect(layout.rows).toEqual([{ lane: 0 }]);
    expect(layout.edges).toEqual([]);
    expect(layout.laneCount).toBe(1);
  });

  it("starts every edge at its child node lane", () => {
    const commits: LayoutCommit[] = [
      { sha: "d", parents: ["b", "c"] },
      { sha: "c", parents: ["a"] },
      { sha: "b", parents: ["a"] },
      { sha: "a", parents: [] },
    ];
    const layout = computeLayout(commits);
    for (const edge of layout.edges) {
      expect(edge.fromLane).toBe(layout.rows[edge.fromRow]?.lane);
    }
  });
});
