export interface LayoutCommit {
  sha: string;
  parents: string[];
}

export interface GraphRow {
  lane: number;
}

export interface GraphEdge {
  fromRow: number;
  fromLane: number;
  toRow: number | null;
  toLane: number;
}

export interface GraphLayout {
  rows: GraphRow[];
  edges: GraphEdge[];
  laneCount: number;
}
