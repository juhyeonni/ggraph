import { drawGraph, laneX, railWidth } from "../lib/draw/draw";
import { type HitNode, hitTest } from "../lib/draw/hit-test";
import { getCacheEntry, isFresh, setCacheEntry } from "../lib/github/cache";
import { type Commit, type FetchCommitsError, fetchCommits } from "../lib/github/fetch-commits";
import {
  type CommitsPath,
  findCommitRowEls,
  getPageTheme,
  getRowSha,
  parseCommitsPath,
} from "../lib/github/selectors";
import { computeLayout } from "../lib/layout/compute-layout";
import { log } from "../lib/log";
import { removeNotice, showNotice } from "../lib/ui/notice";
import { hideTooltip, removeTooltip, showTooltip } from "../lib/ui/tooltip";
import { formatResetIn } from "../lib/util/relative-time";

const RAIL_ID = "ggraph-rail";
const MIN_VIEWPORT_WIDTH = 768;
const RETRY_INTERVAL_MS = 250;
const MAX_RETRIES = 20;
const RESIZE_DEBOUNCE_MS = 150;
const HIT_RADIUS = 8;

type NodeData = { commit: Commit; row: number };

function safe<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void {
  return (...args: A): void => {
    try {
      fn(...args);
    } catch (error) {
      log.error("handler failed", error);
    }
  };
}

function dedupeBySha(commits: Commit[]): Commit[] {
  const seen = new Set<string>();
  const out: Commit[] = [];
  for (const commit of commits) {
    if (seen.has(commit.sha)) continue;
    seen.add(commit.sha);
    out.push(commit);
  }
  return out;
}

export default defineContentScript({
  matches: ["https://github.com/*"],
  main(ctx) {
    let generation = 0;
    let retries = 0;
    let cleanupDraw: (() => void) | null = null;

    const detachRail = (): void => {
      cleanupDraw?.();
      cleanupDraw = null;
      document.getElementById(RAIL_ID)?.remove();
      removeNotice();
    };

    const render = (rowEls: HTMLElement[], commits: Commit[], path: CommitsPath): void => {
      detachRail();
      const first = rowEls[0];
      const last = rowEls[rowEls.length - 1];
      if (first === undefined || last === undefined) return;

      const deduped = dedupeBySha(commits);
      const layout = computeLayout(deduped);
      const indexBySha = new Map(deduped.map((commit, i) => [commit.sha, i]));

      const firstRect = first.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      const width = railWidth(layout.laneCount);
      const top = firstRect.top + window.scrollY;
      const left = Math.max(0, firstRect.left + window.scrollX - width);
      const height = lastRect.bottom + window.scrollY - top;

      const canvas = document.createElement("canvas");
      canvas.id = RAIL_ID;
      canvas.style.cssText =
        `position:absolute;top:${top}px;left:${left}px;` +
        `width:${width}px;height:${height}px;z-index:1;`;
      document.body.appendChild(canvas);

      // Align DOM rows to fetched commits by sha, not by index: on paginated
      // "Older" pages the visible rows are an offset window while the fetch
      // still starts at HEAD. Unmatched rows simply get no node.
      const rowCenters: number[] = [];
      const nodes: HitNode<NodeData>[] = [];
      for (const el of rowEls) {
        const sha = getRowSha(el);
        if (sha === null) continue;
        const idx = indexBySha.get(sha);
        if (idx === undefined) continue;
        const row = layout.rows[idx];
        const commit = deduped[idx];
        if (row === undefined || commit === undefined) continue;
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2 + window.scrollY - top;
        rowCenters[idx] = center;
        nodes.push({ x: laneX(row.lane), y: center, data: { commit, row: idx } });
      }

      let highlight: number | undefined;
      const draw = (): void => {
        const visibleTop = window.scrollY - top;
        drawGraph(canvas, layout, rowCenters, {
          theme: getPageTheme(),
          visibleTop,
          visibleBottom: visibleTop + window.innerHeight,
          highlightRow: highlight,
        });
      };
      draw();

      const localPoint = (event: MouseEvent): { x: number; y: number } => {
        const rect = canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
      };

      const onMove = safe((event: MouseEvent): void => {
        const { x, y } = localPoint(event);
        const hit = hitTest(nodes, x, y, HIT_RADIUS);
        if (hit?.row !== highlight) {
          highlight = hit?.row;
          draw();
        }
        if (hit === null) {
          hideTooltip();
          canvas.style.cursor = "default";
          return;
        }
        const { commit } = hit;
        showTooltip(
          {
            message: commit.message,
            authorName: commit.authorName,
            date: commit.date,
            sha: commit.sha.slice(0, 7),
          },
          event.clientX,
          event.clientY,
        );
        canvas.style.cursor = "pointer";
      });

      const onLeave = safe((): void => {
        if (highlight !== undefined) {
          highlight = undefined;
          draw();
        }
        hideTooltip();
      });

      const onClick = safe((event: MouseEvent): void => {
        const { x, y } = localPoint(event);
        const hit = hitTest(nodes, x, y, HIT_RADIUS);
        if (hit === null) return;
        event.preventDefault();
        const url = `/${path.owner}/${path.repo}/commit/${hit.commit.sha}`;
        if (event.metaKey || event.ctrlKey || event.button === 1) {
          window.open(url, "_blank", "noopener");
        } else {
          window.location.assign(url);
        }
      });

      let rafId = 0;
      const onScroll = safe((): void => {
        if (rafId !== 0) return;
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          draw();
        });
      });

      canvas.addEventListener("mousemove", onMove);
      canvas.addEventListener("mouseleave", onLeave);
      canvas.addEventListener("click", onClick);
      canvas.addEventListener("auxclick", onClick);
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanupDraw = (): void => {
        window.removeEventListener("scroll", onScroll);
        if (rafId !== 0) cancelAnimationFrame(rafId);
        canvas.removeEventListener("mousemove", onMove);
        canvas.removeEventListener("mouseleave", onLeave);
        canvas.removeEventListener("click", onClick);
        canvas.removeEventListener("auxclick", onClick);
        hideTooltip();
      };
    };

    const degrade = (error: FetchCommitsError, rowEls: HTMLElement[]): void => {
      if (error.kind === "not-found") return;
      const anchor = rowEls[0]?.getBoundingClientRect();
      if (anchor === undefined) return;
      const text =
        error.kind === "rate-limited"
          ? `rate limit reached, resets in ${formatResetIn(error.resetAt, Date.now())}`
          : "couldn't load the commit graph";
      showNotice(text, anchor.top + window.scrollY, Math.max(0, anchor.left + window.scrollX));
    };

    const attach = async (gen: number): Promise<boolean> => {
      const parsed = parseCommitsPath(location.pathname);
      if (parsed === null || parsed.filePath !== undefined) return true;
      if (window.innerWidth < MIN_VIEWPORT_WIDTH) return true;
      const rowEls = findCommitRowEls();
      if (rowEls.length === 0) return false;

      const { owner, repo, ref } = parsed;
      const cached = await getCacheEntry(owner, repo, ref);
      if (gen !== generation) return true;
      if (cached !== null) render(rowEls, cached.commits, parsed);
      if (cached !== null && isFresh(cached)) return true;

      const result = await fetchCommits(owner, repo, ref);
      if (gen !== generation) return true;
      if (!result.ok) {
        degrade(result.error, rowEls);
        return true;
      }
      void setCacheEntry(owner, repo, ref, result.commits);
      render(rowEls, result.commits, parsed);
      return true;
    };

    const sync = async (gen: number): Promise<void> => {
      try {
        detachRail();
        if (await attach(gen)) return;
        if (gen !== generation || retries >= MAX_RETRIES) return;
        retries += 1;
        ctx.setTimeout(() => {
          void sync(gen);
        }, RETRY_INTERVAL_MS);
      } catch (error) {
        log.error("sync failed", error);
      }
    };

    const start = (): void => {
      generation += 1;
      retries = 0;
      void sync(generation);
    };

    let resizeTimer: number | undefined;
    const onResize = (): void => {
      if (resizeTimer !== undefined) clearTimeout(resizeTimer);
      resizeTimer = ctx.setTimeout(start, RESIZE_DEBOUNCE_MS);
    };

    start();
    ctx.addEventListener(window, "wxt:locationchange", start);
    ctx.addEventListener(window, "resize", onResize);
    ctx.onInvalidated(() => {
      detachRail();
      removeTooltip();
    });
  },
});
