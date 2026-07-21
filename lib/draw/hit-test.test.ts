import { describe, expect, it } from "vitest";
import { type HitNode, hitTest } from "./hit-test";

const nodes: HitNode<string>[] = [
  { x: 10, y: 10, data: "a" },
  { x: 10, y: 40, data: "b" },
  { x: 40, y: 40, data: "c" },
];

describe("hitTest", () => {
  it("returns the node under the pointer within the radius", () => {
    expect(hitTest(nodes, 11, 12, 8)).toBe("a");
  });

  it("returns null when nothing is within the radius", () => {
    expect(hitTest(nodes, 100, 100, 8)).toBeNull();
  });

  it("returns null for an empty node list", () => {
    expect(hitTest([], 10, 10, 8)).toBeNull();
  });

  it("picks the closest node when several are near", () => {
    // Closer to c (40,40) than b (10,40).
    expect(hitTest(nodes, 34, 40, 20)).toBe("c");
    expect(hitTest(nodes, 16, 40, 20)).toBe("b");
  });

  it("includes nodes exactly on the radius boundary", () => {
    expect(hitTest([{ x: 0, y: 0, data: "edge" }], 8, 0, 8)).toBe("edge");
  });
});
