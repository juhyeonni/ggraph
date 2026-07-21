import type { Page } from "@playwright/test";
import { commitsPageHtml } from "./commits-page";
import { type FixtureCommit, toApiCommit } from "./gen-commits";

export const FIXTURE_OWNER = "testowner";
// Must match lib/github/fetch-commits.ts's own PER_PAGE — the fixture paginates
// the same way the real GitHub API does so fetchCommits's page-by-page loop works.
const PER_PAGE = 100;

// Routes the commits-page navigation itself (so the content script's
// `https://github.com/*` manifest match fires) and the resulting commit-click
// destination, to a local HTML fixture — keeping the whole test offline.
export async function routeCommitsPage(
  page: Page,
  repo: string,
  commits: FixtureCommit[],
): Promise<void> {
  await page.route(`https://github.com/${FIXTURE_OWNER}/${repo}/commits/**`, async (route) => {
    await route.fulfill({ contentType: "text/html", body: commitsPageHtml(commits) });
  });
  await page.route(`https://github.com/${FIXTURE_OWNER}/${repo}/commit/**`, async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>fixture commit page</title>",
    });
  });
}

// Routes api.github.com/repos/{owner}/{repo}/commits, paginating a static
// fixture array the same way the real REST API does. `delayMs` gives the
// heap-budget test a reliable window between "page loaded" and "graph
// rendered" so the before/after readings never race the fetch.
export async function routeCommitsApi(
  page: Page,
  repo: string,
  commits: FixtureCommit[],
  delayMs = 0,
): Promise<void> {
  await page.route(
    `https://api.github.com/repos/${FIXTURE_OWNER}/${repo}/commits**`,
    async (route) => {
      const url = new URL(route.request().url());
      const pageParam = Number(url.searchParams.get("page") ?? "1");
      const start = (pageParam - 1) * PER_PAGE;
      const slice = commits.slice(start, start + PER_PAGE).map(toApiCommit);
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(slice) });
    },
  );
}
