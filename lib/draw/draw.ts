import type { GraphLayout } from "../../types/graph";

const LANE_WIDTH = 12;
const NODE_RADIUS = 3.5;
const EDGE_WIDTH = 2;
const DANGLING_STUB = 16;
const CLIP_BUFFER = 40;
const EDGE_CURVE = 10;

export type Theme = "light" | "dark";

const LANE_COLORS: Record<Theme, string[]> = {
  light: ["#0969da", "#1a7f37", "#bc4c00", "#8250df", "#bf3989", "#9a6700"],
  dark: ["#1f6feb", "#3fb950", "#db6d28", "#a371f7", "#f778ba", "#d29922"],
};

export interface DrawOptions {
  theme: Theme;
  visibleTop: number;
  visibleBottom: number;
  highlightRow?: number;
}

export function laneX(lane: number): number {
  return LANE_WIDTH / 2 + lane * LANE_WIDTH;
}

function laneColor(colors: string[], lane: number): string {
  return colors[lane % colors.length] ?? "#1f6feb";
}

export function railWidth(laneCount: number): number {
  return Math.max(laneCount, 1) * LANE_WIDTH;
}

function curveTo(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  if (x1 === x2) {
    ctx.lineTo(x2, y2);
    return;
  }
  const midY = (y1 + y2) / 2;
  ctx.bezierCurveTo(x1, midY, x2, midY, x2, y2);
}

// An edge leaves its child at fromX, travels down its reserved lane (travelX),
// then curves into the lane where its parent node is actually drawn (landX).
// travelX and landX differ when a parent awaited in several lanes lands in the
// lowest one: the rail stays in its own column and only curves in at the end.
function drawEdge(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  travelX: number,
  landX: number,
  toY: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.moveTo(fromX, fromY);
  const span = Math.min(EDGE_CURVE, Math.max(0, (toY - fromY) / 2));
  const railTop = fromX === travelX ? fromY : fromY + span;
  const railBottom = landX === travelX ? toY : toY - span;
  curveTo(ctx, fromX, fromY, travelX, railTop);
  if (railBottom > railTop) ctx.lineTo(travelX, railBottom);
  curveTo(ctx, travelX, railBottom, landX, toY);
  ctx.stroke();
}

export function drawGraph(
  canvas: HTMLCanvasElement,
  layout: GraphLayout,
  rowCenters: number[],
  options: DrawOptions,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  const deviceWidth = Math.round(width * dpr);
  const deviceHeight = Math.round(height * dpr);
  if (canvas.width !== deviceWidth || canvas.height !== deviceHeight) {
    canvas.width = deviceWidth;
    canvas.height = deviceHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const top = Math.max(0, options.visibleTop - CLIP_BUFFER);
  const bottom = Math.min(height, options.visibleBottom + CLIP_BUFFER);
  if (bottom <= top) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, width, bottom - top);
  ctx.clip();
  ctx.clearRect(0, top, width, bottom - top);
  ctx.lineWidth = EDGE_WIDTH;
  const colors = LANE_COLORS[options.theme];

  // ponytail: linear scan over all edges/rows per draw is fine at the 200-commit
  // default depth; index rows by y if depth ever grows into the thousands.
  for (const edge of layout.edges) {
    const y1 = rowCenters[edge.fromRow];
    if (y1 === undefined) continue;
    const target = edge.toRow === null ? undefined : rowCenters[edge.toRow];
    const y2 = target ?? y1 + DANGLING_STUB;
    if (Math.max(y1, y2) < top || Math.min(y1, y2) > bottom) continue;
    const landLane =
      edge.toRow === null ? edge.toLane : (layout.rows[edge.toRow]?.lane ?? edge.toLane);
    drawEdge(
      ctx,
      laneX(edge.fromLane),
      y1,
      laneX(edge.toLane),
      laneX(landLane),
      y2,
      laneColor(colors, landLane),
    );
  }

  for (let i = 0; i < layout.rows.length; i++) {
    const row = layout.rows[i];
    const y = rowCenters[i];
    if (row === undefined || y === undefined) continue;
    if (y < top || y > bottom) continue;
    const color = laneColor(colors, row.lane);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(laneX(row.lane), y, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    if (i === options.highlightRow) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(laneX(row.lane), y, NODE_RADIUS + 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = EDGE_WIDTH;
    }
  }
  ctx.restore();
}
