export interface HitNode<T> {
  x: number;
  y: number;
  data: T;
}

// Nearest node within radius wins; ties resolve to the last candidate scanned.
// ponytail: linear scan over visible nodes is fine at ~40 rows/page; bucket by y
// if a single page ever renders thousands of nodes.
export function hitTest<T>(nodes: HitNode<T>[], x: number, y: number, radius: number): T | null {
  let best: T | null = null;
  let bestDist = radius * radius;
  for (const node of nodes) {
    const dx = node.x - x;
    const dy = node.y - y;
    const dist = dx * dx + dy * dy;
    if (dist <= bestDist) {
      bestDist = dist;
      best = node.data;
    }
  }
  return best;
}
