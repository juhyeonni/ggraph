const NOTICE_ID = "ggraph-notice";

let noticeEl: HTMLElement | null = null;

function ensureNotice(): HTMLElement {
  if (noticeEl !== null && document.body.contains(noticeEl)) return noticeEl;
  const el = document.createElement("div");
  el.id = NOTICE_ID;
  el.style.cssText =
    "position:absolute;z-index:1;max-width:260px;padding:2px 6px;border-radius:4px;" +
    "font-size:11px;line-height:1.4;white-space:nowrap;pointer-events:none;" +
    "background:rgba(130,80,0,0.12);color:#9a6700;";
  document.body.appendChild(el);
  noticeEl = el;
  return el;
}

// Anchored in the rail gutter (document coords) so it never overlaps GitHub's
// content column, which sits to the right of the rail.
export function showNotice(text: string, top: number, left: number): void {
  const el = ensureNotice();
  el.textContent = `ggraph: ${text}`;
  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
  el.style.display = "block";
}

export function removeNotice(): void {
  noticeEl?.remove();
  noticeEl = null;
}
