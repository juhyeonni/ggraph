import type { MergeSource } from "../github/merge-message";
import type { RowClassification } from "../layout/relationship";

const TOOLTIP_ID = "ggraph-tooltip";
const EDGE_PAD = 12;

export interface RelationshipBadge {
  parentCount: number;
  childCount: number;
  mergeSource: MergeSource | null;
  marker: "merge-point" | "branch-point";
}

let tooltipEl: HTMLElement | null = null;

function ensureTooltip(): HTMLElement {
  if (tooltipEl !== null && document.body.contains(tooltipEl)) return tooltipEl;
  const el = document.createElement("div");
  el.id = TOOLTIP_ID;
  el.style.cssText =
    "position:fixed;z-index:2147483647;max-width:320px;pointer-events:none;" +
    "padding:6px 8px;border-radius:6px;font-size:12px;line-height:1.4;" +
    "background:#1f2328;color:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);display:none;";
  document.body.appendChild(el);
  tooltipEl = el;
  return el;
}

// Marker precedence mirrors lib/layout/relationship.ts's classifyRow: a row
// that is both a merge and a branch point reads primarily as a merge point.
// mergeSource is only ever carried through for a merge row, even if a caller
// passed one in for a non-merge classification (defensive).
export function buildRelationshipBadge(
  classification: RowClassification,
  mergeSource: MergeSource | null,
): RelationshipBadge {
  return {
    parentCount: classification.parentCount,
    childCount: classification.childCount,
    mergeSource: classification.isMerge ? mergeSource : null,
    marker: classification.isMerge ? "merge-point" : "branch-point",
  };
}

export function formatRelationshipBadge(badge: RelationshipBadge): string {
  if (badge.marker === "branch-point") return `branch point · ${badge.childCount} children`;
  const parts = [`${badge.parentCount} parents`];
  if (badge.mergeSource !== null) {
    parts.push(`from ${badge.mergeSource.branch}`);
    if (badge.mergeSource.prNumber !== null) parts.push(`PR #${badge.mergeSource.prNumber}`);
  }
  if (badge.childCount > 1) parts.push(`${badge.childCount} children`);
  return `merge · ${parts.join(" · ")}`;
}

// nodeX/nodeY is the graph node's screen position (in the rail gutter). The
// badge opens to the LEFT of the node so it never covers the commit-list row
// text, which sits to the right of the rail. If the left gutter is too narrow,
// it falls back to sitting just above the node instead.
export function showTooltip(badge: RelationshipBadge, nodeX: number, nodeY: number): void {
  const el = ensureTooltip();
  el.textContent = formatRelationshipBadge(badge);
  el.style.display = "block";
  const rect = el.getBoundingClientRect();

  let left = nodeX - EDGE_PAD - rect.width;
  let top = nodeY - rect.height / 2;
  if (left < EDGE_PAD) {
    // Not enough room on the left: place it above the node (flip below near the top edge).
    left = nodeX;
    top = nodeY - EDGE_PAD - rect.height;
    if (top < EDGE_PAD) top = nodeY + EDGE_PAD;
  }
  left = Math.max(EDGE_PAD, Math.min(left, window.innerWidth - rect.width - EDGE_PAD));
  top = Math.max(EDGE_PAD, Math.min(top, window.innerHeight - rect.height - EDGE_PAD));
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

export function hideTooltip(): void {
  if (tooltipEl !== null) tooltipEl.style.display = "none";
}

export function removeTooltip(): void {
  tooltipEl?.remove();
  tooltipEl = null;
}
