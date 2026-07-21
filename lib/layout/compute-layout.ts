import type { GraphEdge, GraphLayout, GraphRow, LayoutCommit } from "../../types/graph";

function findOrAllocLane(lanes: (string | null)[], sha: string): number {
  const existing = lanes.indexOf(sha);
  if (existing !== -1) return existing;
  const free = lanes.indexOf(null);
  if (free !== -1) {
    lanes[free] = sha;
    return free;
  }
  lanes.push(sha);
  return lanes.length - 1;
}

export function computeLayout(commits: LayoutCommit[]): GraphLayout {
  const seen = new Set<string>();
  const deduped: LayoutCommit[] = [];
  for (const commit of commits) {
    if (seen.has(commit.sha)) continue;
    seen.add(commit.sha);
    deduped.push(commit);
  }

  const lanes: (string | null)[] = [];
  const waiting = new Map<string, GraphEdge[]>();
  const rows: GraphRow[] = [];
  const edges: GraphEdge[] = [];

  for (let row = 0; row < deduped.length; row++) {
    const commit = deduped[row];
    if (commit === undefined) continue;

    let lane = lanes.indexOf(commit.sha);
    if (lane === -1) {
      lane = lanes.indexOf(null);
      if (lane === -1) {
        lanes.push(null);
        lane = lanes.length - 1;
      }
    }
    rows.push({ lane });

    const waiters = waiting.get(commit.sha);
    if (waiters !== undefined) {
      for (const edge of waiters) edge.toRow = row;
      waiting.delete(commit.sha);
    }
    for (let l = 0; l < lanes.length; l++) {
      if (lanes[l] === commit.sha) lanes[l] = null;
    }

    for (let p = 0; p < commit.parents.length; p++) {
      const parentSha = commit.parents[p];
      if (parentSha === undefined) continue;
      let parentLane: number;
      if (p === 0) {
        parentLane = lane;
        lanes[parentLane] = parentSha;
      } else {
        parentLane = findOrAllocLane(lanes, parentSha);
      }
      const edge: GraphEdge = {
        fromRow: row,
        fromLane: lane,
        toRow: null,
        toLane: parentLane,
        isFirstParent: p === 0,
      };
      edges.push(edge);
      const list = waiting.get(parentSha);
      if (list !== undefined) list.push(edge);
      else waiting.set(parentSha, [edge]);
    }
  }

  return { rows, edges, laneCount: lanes.length };
}
