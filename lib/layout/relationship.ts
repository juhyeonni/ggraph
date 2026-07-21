import type { GraphEdge, GraphLayout } from "../../types/graph";

export interface RowClassification {
  parentCount: number;
  childCount: number;
  isMerge: boolean;
  isBranchPoint: boolean;
}

export interface RelationshipHighlight {
  rows: ReadonlySet<number>;
  edges: ReadonlySet<GraphEdge>;
}

// Counted directly from edges (fromRow = parent link, toRow = child link) so
// this is the single source of truth for "merge"/"branch point", shared by
// the highlight walk below and story 005's tooltip badge decision.
export function classifyRow(layout: GraphLayout, row: number): RowClassification {
  let parentCount = 0;
  let childCount = 0;
  for (const edge of layout.edges) {
    if (edge.fromRow === row) parentCount++;
    if (edge.toRow === row) childCount++;
  }
  return { parentCount, childCount, isMerge: parentCount > 1, isBranchPoint: childCount > 1 };
}

// ponytail: linear scans over layout.edges per visited row — fine at the
// bounded ~200-commit default depth (matches the existing scan precedent in
// hit-test.ts/draw.ts). Index by fromRow/toRow if commitDepth ever grows
// into the thousands.
export function computeRelationshipHighlight(
  layout: GraphLayout,
  focusedRow: number,
): RelationshipHighlight {
  const rows = new Set<number>([focusedRow]);
  const edges = new Set<GraphEdge>();

  // The FOCUSED commit's own direct parent edges — including a merge's extra
  // (non-first-parent) parents, so focusing a merge lights up the branch it
  // brought in. Only the focused commit gets this: other merges reached along
  // the base line below must NOT light up their own other branches.
  for (const edge of layout.edges) {
    if (edge.fromRow !== focusedRow) continue;
    edges.add(edge);
    if (edge.toRow !== null) rows.add(edge.toRow);
  }

  // Toward ancestors: follow the single first-parent edge out of each row (the
  // base line), marking rows/edges but never expanding other merges' extra parents.
  let current = focusedRow;
  for (;;) {
    const edge = layout.edges.find((e) => e.fromRow === current && e.isFirstParent);
    if (edge === undefined) break;
    edges.add(edge);
    if (edge.toRow === null) break;
    rows.add(edge.toRow);
    current = edge.toRow;
  }

  // Toward descendants: fan out to every child whose first parent is this
  // row (a branch point has more than one), each continuing its own search.
  const queue: number[] = [focusedRow];
  const seen = new Set<number>([focusedRow]);
  while (queue.length > 0) {
    const row = queue.shift();
    if (row === undefined) continue;
    for (const edge of layout.edges) {
      if (edge.toRow !== row || !edge.isFirstParent) continue;
      edges.add(edge);
      if (seen.has(edge.fromRow)) continue;
      seen.add(edge.fromRow);
      rows.add(edge.fromRow);
      queue.push(edge.fromRow);
    }
  }

  return { rows, edges };
}
