import { drawGraph, laneX, railWidth } from "../lib/draw/draw";
import { type HitNode, hitTest } from "../lib/draw/hit-test";
import { getCacheEntry, isFresh, setCacheEntry } from "../lib/github/cache";
import { decideDegrade } from "../lib/github/degrade";
import { type Commit, type FetchCommitsError, fetchCommits } from "../lib/github/fetch-commits";
import { parseMergeSource } from "../lib/github/merge-message";
import {
  type CommitsPath,
  findCommitRowEls,
  getPageTheme,
  getRowSha,
  parseCommitsPath,
} from "../lib/github/selectors";
import { getSettings } from "../lib/github/settings-store";
import { clearToken, getToken } from "../lib/github/token-store";
import { computeLayout } from "../lib/layout/compute-layout";
import { classifyRow, computeRelationshipHighlight } from "../lib/layout/relationship";
import { log } from "../lib/log";
import { removeNotice, showNotice } from "../lib/ui/notice";
import { buildRelationshipBadge, hideTooltip, removeTooltip, showTooltip } from "../lib/ui/tooltip";

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

      let focusedRow: number | undefined;
      let clearRafId = 0;

      const draw = (): void => {
        const visibleTop = window.scrollY - top;
        drawGraph(canvas, layout, rowCenters, {
          theme: getPageTheme(),
          visibleTop,
          visibleBottom: visibleTop + window.innerHeight,
          highlightRow: focusedRow,
          highlight:
            focusedRow === undefined ? undefined : computeRelationshipHighlight(layout, focusedRow),
        });
      };
      draw();

      // Only merge/branch-point rows (story 005) get a tooltip; ordinary
      // commits hide it, fully replacing the old always-on metadata tooltip.
      const updateBadge = (row: number | undefined, clientX: number, clientY: number): void => {
        if (row === undefined) {
          hideTooltip();
          return;
        }
        const classification = classifyRow(layout, row);
        if (!classification.isMerge && !classification.isBranchPoint) {
          hideTooltip();
          return;
        }
        const commit = deduped[row];
        if (commit === undefined) {
          hideTooltip();
          return;
        }
        const mergeSource = classification.isMerge ? parseMergeSource(commit.message) : null;
        showTooltip(buildRelationshipBadge(classification, mergeSource), clientX, clientY);
      };

      // Single shared focus source for both hover surfaces (story 003): set
      // cancels any pending hand-off clear (below) so moving directly from a
      // row to its own canvas node — or vice versa — never flashes full color
      // in between; redraw only fires on an actual row change.
      const focus = (row: number | undefined, clientX: number, clientY: number): void => {
        if (clearRafId !== 0) {
          cancelAnimationFrame(clearRafId);
          clearRafId = 0;
        }
        if (row !== focusedRow) {
          focusedRow = row;
          draw();
        }
        updateBadge(row, clientX, clientY);
      };

      // Leaving a surface defers the clear by one animation frame: the DOM
      // doesn't guarantee mouseleave-then-mouseenter ordering across two
      // different elements, so only clear if nothing re-focused first.
      const scheduleClear = (): void => {
        if (clearRafId !== 0) cancelAnimationFrame(clearRafId);
        clearRafId = requestAnimationFrame(() => {
          clearRafId = 0;
          if (focusedRow === undefined) return;
          focusedRow = undefined;
          draw();
          hideTooltip();
        });
      };

      const localPoint = (event: MouseEvent): { x: number; y: number } => {
        const rect = canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
      };

      const onMove = safe((event: MouseEvent): void => {
        const { x, y } = localPoint(event);
        const hit = hitTest(nodes, x, y, HIT_RADIUS);
        focus(hit?.row, event.clientX, event.clientY);
        canvas.style.cursor = hit === null ? "default" : "pointer";
      });

      const onLeave = safe((): void => {
        scheduleClear();
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

      // Second hover source (story 003): GitHub's own commit rows drive the
      // same shared focus as canvas nodes. A row with no indexBySha match
      // (GitHub DOM drift) is silently skipped — canvas-only focus remains.
      const rowCleanups: Array<() => void> = [];
      for (const el of rowEls) {
        const sha = getRowSha(el);
        const idx = sha === null ? undefined : indexBySha.get(sha);
        if (idx === undefined) continue;
        const onRowEnter = safe((event: MouseEvent): void => {
          focus(idx, event.clientX, event.clientY);
        });
        const onRowLeave = safe((): void => {
          scheduleClear();
        });
        el.addEventListener("mouseenter", onRowEnter);
        el.addEventListener("mouseleave", onRowLeave);
        rowCleanups.push(() => {
          el.removeEventListener("mouseenter", onRowEnter);
          el.removeEventListener("mouseleave", onRowLeave);
        });
      }

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
        if (clearRafId !== 0) cancelAnimationFrame(clearRafId);
        canvas.removeEventListener("mousemove", onMove);
        canvas.removeEventListener("mouseleave", onLeave);
        canvas.removeEventListener("click", onClick);
        canvas.removeEventListener("auxclick", onClick);
        for (const cleanup of rowCleanups) cleanup();
        hideTooltip();
      };
    };

    const degrade = (error: FetchCommitsError, rowEls: HTMLElement[], hasToken: boolean): void => {
      const action = decideDegrade(error, hasToken);
      if (action.kind === "silent") return;
      if (action.clearToken) void clearToken();
      const anchor = rowEls[0]?.getBoundingClientRect();
      if (anchor === undefined) return;
      showNotice(
        action.text,
        anchor.top + window.scrollY,
        Math.max(0, anchor.left + window.scrollX),
      );
    };

    const attach = async (gen: number): Promise<boolean> => {
      const parsed = parseCommitsPath(location.pathname);
      if (parsed === null || parsed.filePath !== undefined) return true;
      if (window.innerWidth < MIN_VIEWPORT_WIDTH) return true;
      const rowEls = findCommitRowEls();
      if (rowEls.length === 0) return false;

      const { owner, repo, ref } = parsed;
      const [cached, auth, settings] = await Promise.all([
        getCacheEntry(owner, repo, ref),
        getToken(),
        getSettings(),
      ]);
      if (gen !== generation) return true;
      if (cached !== null) render(rowEls, cached.commits, parsed);
      if (cached !== null && isFresh(cached)) return true;

      const result = await fetchCommits(
        owner,
        repo,
        ref,
        settings.commitDepth,
        auth?.access_token,
        cached?.etag,
      );
      if (gen !== generation) return true;
      if (!result.ok) {
        degrade(result.error, rowEls, auth !== null);
        return true;
      }
      if ("notModified" in result) {
        if (cached !== null) void setCacheEntry(owner, repo, ref, cached.commits, cached.etag);
        return true;
      }
      void setCacheEntry(owner, repo, ref, result.commits, result.etag);
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
