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
  const rows = new Set<number>();
  const edges = new Set<GraphEdge>();
  // Separate from `rows`: gates re-processing so a row only shallow-marked
  // as a merge's extra endpoint (below) can still be fully walked later if
  // it's independently reached as a real chain/fan-out member.
  const visited = new Set<number>();

  const visit = (row: number): void => {
    rows.add(row);
    if (visited.has(row)) return;
    visited.add(row);
    if (!classifyRow(layout, row).isMerge) return;
    for (const edge of layout.edges) {
      if (edge.fromRow !== row) continue;
      edges.add(edge);
      // The first-parent edge's endpoint is handled by the chain walk below;
      // only the extra (non-first-parent) parents' endpoints are highlighted
      // here, and without recursing into them ("don't continue the walk").
      if (!edge.isFirstParent && edge.toRow !== null) rows.add(edge.toRow);
    }
  };

  visit(focusedRow);

  // Toward ancestors: follow the single first-parent edge out of each row.
  let current = focusedRow;
  for (;;) {
    const edge = layout.edges.find((e) => e.fromRow === current && e.isFirstParent);
    if (edge === undefined) break;
    edges.add(edge);
    if (edge.toRow === null) break;
    visit(edge.toRow);
    current = edge.toRow;
  }

  // Toward descendants: fan out to every child whose first parent is this
  // row (a branch point has more than one), each continuing its own search.
  const queue: number[] = [focusedRow];
  while (queue.length > 0) {
    const row = queue.shift();
    if (row === undefined) continue;
    for (const edge of layout.edges) {
      if (edge.toRow !== row || !edge.isFirstParent) continue;
      edges.add(edge);
      if (visited.has(edge.fromRow)) continue;
      visit(edge.fromRow);
      queue.push(edge.fromRow);
    }
  }

  return { rows, edges };
}
