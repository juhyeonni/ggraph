const TOOLTIP_ID = "ggraph-tooltip";
const EDGE_PAD = 12;

export interface TooltipContent {
  message: string;
  authorName: string;
  date: string;
  sha: string;
}

let tooltipEl: HTMLElement | null = null;
let titleEl: HTMLElement | null = null;
let metaEl: HTMLElement | null = null;

function ensureTooltip(): HTMLElement {
  if (tooltipEl !== null && document.body.contains(tooltipEl)) return tooltipEl;
  const el = document.createElement("div");
  el.id = TOOLTIP_ID;
  el.style.cssText =
    "position:fixed;z-index:2147483647;max-width:320px;pointer-events:none;" +
    "padding:6px 8px;border-radius:6px;font-size:12px;line-height:1.4;" +
    "background:#1f2328;color:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);display:none;";
  const title = document.createElement("div");
  title.style.fontWeight = "600";
  const meta = document.createElement("div");
  meta.style.opacity = "0.8";
  el.append(title, meta);
  document.body.appendChild(el);
  tooltipEl = el;
  titleEl = title;
  metaEl = meta;
  return el;
}

function shortDate(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleDateString();
}

export function showTooltip(content: TooltipContent, clientX: number, clientY: number): void {
  const el = ensureTooltip();
  if (titleEl !== null) titleEl.textContent = content.message;
  if (metaEl !== null) {
    metaEl.textContent = `${content.authorName} · ${shortDate(content.date)} · ${content.sha}`;
  }
  el.style.display = "block";
  const rect = el.getBoundingClientRect();
  let left = clientX + EDGE_PAD;
  if (left + rect.width > window.innerWidth) left = clientX - EDGE_PAD - rect.width;
  let top = clientY + EDGE_PAD;
  if (top + rect.height > window.innerHeight) top = clientY - EDGE_PAD - rect.height;
  el.style.left = `${Math.max(0, left)}px`;
  el.style.top = `${Math.max(0, top)}px`;
}

export function hideTooltip(): void {
  if (tooltipEl !== null) tooltipEl.style.display = "none";
}

export function removeTooltip(): void {
  tooltipEl?.remove();
  tooltipEl = null;
  titleEl = null;
  metaEl = null;
}
