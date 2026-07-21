import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BrowserContext, chromium, expect, type Page, test } from "@playwright/test";
import { genFixtureCommits } from "./fixtures/gen-commits";
import { readHeapMB } from "./fixtures/heap";
import { FIXTURE_OWNER, routeCommitsApi, routeCommitsPage } from "./fixtures/routes";

// chrome.storage is only reachable from the extension's own execution
// contexts (background service worker, content script) — never from
// page.evaluate, which runs in the host page's isolated world. Minimal local
// ambient type for the one call this file makes (no @types/chrome dependency
// for a single method).
declare const chrome: {
  storage: { local: { set(items: Record<string, unknown>): Promise<void> } };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, "../.output/chrome-mv3");
const SETTINGS_STORAGE_KEY = "ggraph:settings"; // contract: lib/github/settings-store.ts

async function setCommitDepth(context: BrowserContext, depth: number): Promise<void> {
  let [worker] = context.serviceWorkers();
  worker ??= await context.waitForEvent("serviceworker", { timeout: 10_000 });
  await worker.evaluate(
    ([key, value]) => chrome.storage.local.set({ [key]: { commitDepth: value } }),
    [SETTINGS_STORAGE_KEY, depth] as const,
  );
}

test.describe
  .serial("extension e2e", () => {
    let context: BrowserContext;
    let page: Page;
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    test.beforeAll(async () => {
      if (!existsSync(path.join(EXTENSION_PATH, "manifest.json"))) {
        throw new Error(
          `Built extension not found at ${EXTENSION_PATH} — run \`pnpm build\` first ` +
            "(or use `pnpm test:e2e`, which builds automatically before testing).",
        );
      }
      context = await chromium.launchPersistentContext("", {
        headless: false,
        viewport: { width: 1280, height: 900 },
        args: [
          `--disable-extensions-except=${EXTENSION_PATH}`,
          `--load-extension=${EXTENSION_PATH}`,
        ],
      });
      page = context.pages()[0] ?? (await context.newPage());
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(String(error)));
    });

    test.afterAll(async () => {
      await context?.close();
    });

    test("003: loads the built extension and renders the graph rail", async () => {
      const commits = genFixtureCommits(30);
      await routeCommitsPage(page, "smoke-repo", commits);
      await routeCommitsApi(page, "smoke-repo", commits);

      await page.goto(`https://github.com/${FIXTURE_OWNER}/smoke-repo/commits/main`);

      await expect(
        page.locator("#ggraph-rail"),
        "expected the ggraph rail canvas (#ggraph-rail) to be injected into the fixture " +
          "commits page within 5s, but it never appeared — check lib/github/selectors.ts " +
          "row detection against the fixture HTML in e2e/fixtures/commits-page.ts",
      ).toBeVisible({ timeout: 5_000 });
    });

    test("004: hovering a merge node shows the relationship badge, click navigates to the commit", async () => {
      // Reuses story 003's already-rendered page/session — no re-navigation.
      // Row 0 of genFixtureCommits is always a merge commit (2 parents) with
      // a parseable GitHub PR-merge message (see e2e/fixtures/gen-commits.ts).
      const canvasBox = await page.locator("#ggraph-rail").boundingBox();
      const rowBox = await page.locator('[data-testid="commit-row-item"]').first().boundingBox();
      if (canvasBox === null || rowBox === null) {
        throw new Error("expected both the rail canvas and the first commit row to be visible");
      }

      const x = canvasBox.x + 6; // laneX(0) from lib/draw/draw.ts (LANE_WIDTH=12 -> lane 0 center)
      const y = rowBox.y + rowBox.height / 2;

      await page.mouse.move(x, y);
      const tooltip = page.locator("#ggraph-tooltip");
      await expect(
        tooltip,
        "expected #ggraph-tooltip (now a relationship badge, bolt 012) to become visible on " +
          "hovering the first commit's merge node",
      ).toBeVisible({ timeout: 2_000 });
      // Old metadata content (message/author/date/sha) is gone entirely (story 005);
      // the badge shows parent count + the parsed merge-source branch/PR instead.
      await expect(tooltip).toContainText("merge");
      await expect(tooltip).toContainText("2 parents");
      await expect(tooltip).toContainText("from acme/feature-0");
      await expect(tooltip).toContainText("PR #100");

      await page.mouse.click(x, y);
      await page.waitForURL(/\/commit\//, { timeout: 5_000 });
      expect(
        new URL(page.url()).pathname,
        "expected the click to navigate to /commit/{sha}",
      ).toContain("/commit/");

      expect(
        pageErrors,
        `unexpected unhandled page errors during the interaction: ${pageErrors.join("; ")}`,
      ).toHaveLength(0);
      const extensionErrors = consoleErrors.filter((text) => text.includes("[ggraph]"));
      expect(
        extensionErrors,
        `unexpected "[ggraph]"-prefixed console errors (host-page-safety): ${extensionErrors.join("; ")}`,
      ).toHaveLength(0);
    });

    test("005: JS heap delta for a >=500-commit graph stays within the 50MB budget", async () => {
      const HEAP_REPO = "heap-repo";
      const COMMIT_COUNT = 600;
      const BUDGET_MB = 50;
      const SAMPLE_COUNT = 3;

      const commits = genFixtureCommits(COMMIT_COUNT);
      await routeCommitsPage(page, HEAP_REPO, commits);
      // Small artificial delay: guarantees the "before" reading below always
      // lands ahead of the render, rather than racing an occasionally-instant fetch.
      await routeCommitsApi(page, HEAP_REPO, commits, 120);
      await setCommitDepth(context, COMMIT_COUNT);

      const samples: { beforeMB: number; afterMB: number; deltaMB: number }[] = [];
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        await page.goto(`https://github.com/${FIXTURE_OWNER}/${HEAP_REPO}/commits/main`, {
          waitUntil: "domcontentloaded",
        });
        const beforeMB = await readHeapMB(page);

        await expect(
          page.locator("#ggraph-rail"),
          `expected the ${COMMIT_COUNT}-commit heap fixture to render`,
        ).toBeVisible({ timeout: 10_000 });
        // Let one draw settle (drawGraph runs synchronously off the render call,
        // but this gives layout/paint a frame before the "after" reading).
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        const afterMB = await readHeapMB(page);
        samples.push({ beforeMB, afterMB, deltaMB: afterMB - beforeMB });
      }

      const result = {
        commitCount: COMMIT_COUNT,
        budgetMB: BUDGET_MB,
        samples,
        pass: samples.every((sample) => sample.deltaMB <= BUDGET_MB),
      };
      const resultsDir = path.join(__dirname, "results");
      mkdirSync(resultsDir, { recursive: true });
      writeFileSync(
        path.join(resultsDir, "heap-budget.json"),
        `${JSON.stringify(result, null, 2)}\n`,
      );

      for (const sample of samples) {
        expect(
          sample.deltaMB,
          `heap delta ${sample.deltaMB.toFixed(2)}MB exceeded the ${BUDGET_MB}MB budget ` +
            `(recorded in e2e/results/heap-budget.json)`,
        ).toBeLessThanOrEqual(BUDGET_MB);
      }
    });

    test("006: hovering an ordinary commit shows no relationship badge (story 005)", async () => {
      const NO_BADGE_REPO = "no-badge-repo";
      const commits = genFixtureCommits(30);
      await routeCommitsPage(page, NO_BADGE_REPO, commits);
      await routeCommitsApi(page, NO_BADGE_REPO, commits);
      await page.goto(`https://github.com/${FIXTURE_OWNER}/${NO_BADGE_REPO}/commits/main`);
      await expect(page.locator("#ggraph-rail")).toBeVisible({ timeout: 5_000 });

      const canvasBox = await page.locator("#ggraph-rail").boundingBox();
      const mergeRowBox = await page
        .locator('[data-testid="commit-row-item"]')
        .nth(0)
        .boundingBox();
      const plainRowBox = await page
        .locator('[data-testid="commit-row-item"]')
        .nth(1)
        .boundingBox();
      if (canvasBox === null || mergeRowBox === null || plainRowBox === null) {
        throw new Error("expected the rail canvas and both commit rows to be visible");
      }
      const laneX = canvasBox.x + 6;
      const tooltip = page.locator("#ggraph-tooltip");

      // Row 0 is a merge — hover it first to prove the tooltip element does
      // get created/shown at all (a stronger check than "never appeared").
      await page.mouse.move(laneX, mergeRowBox.y + mergeRowBox.height / 2);
      await expect(tooltip).toBeVisible({ timeout: 2_000 });

      // Row 1 is an ordinary single-parent/single-child commit (story 005 AC1):
      // no tooltip at all, not merely hidden metadata.
      await page.mouse.move(laneX, plainRowBox.y + plainRowBox.height / 2);
      await expect(
        tooltip,
        "expected the relationship badge to hide on an ordinary (non-merge, non-branch-point) commit",
      ).toBeHidden({ timeout: 2_000 });
    });

    test("007: hovering a GitHub commit row highlights the same relationship as its canvas node (story 003)", async () => {
      const ROW_HOVER_REPO = "row-hover-repo";
      const commits = genFixtureCommits(30);
      await routeCommitsPage(page, ROW_HOVER_REPO, commits);
      await routeCommitsApi(page, ROW_HOVER_REPO, commits);
      await page.goto(`https://github.com/${FIXTURE_OWNER}/${ROW_HOVER_REPO}/commits/main`);
      await expect(page.locator("#ggraph-rail")).toBeVisible({ timeout: 5_000 });

      // Hover GitHub's own row element directly — not the canvas — for the
      // same merge commit test 004 hovers via the canvas node.
      const tooltip = page.locator("#ggraph-tooltip");
      await page.locator('[data-testid="commit-row-item"]').first().hover();
      await expect(
        tooltip,
        "expected row-hover to drive the same shared focus state as canvas-hover (story 003)",
      ).toBeVisible({ timeout: 2_000 });
      await expect(tooltip).toContainText("merge");
      await expect(tooltip).toContainText("2 parents");
      await expect(tooltip).toContainText("from acme/feature-0");
      await expect(tooltip).toContainText("PR #100");

      // Leaving the row (without entering the canvas) clears focus (story 003 AC3).
      await page.mouse.move(0, 0);
      await expect(tooltip).toBeHidden({ timeout: 2_000 });
    });

    test("008: rail is removed after SPA-navigating away from the commits page (#21)", async () => {
      const NAV_REPO = "nav-repo";
      const commits = genFixtureCommits(20);
      await routeCommitsPage(page, NAV_REPO, commits);
      await routeCommitsApi(page, NAV_REPO, commits);
      await page.goto(`https://github.com/${FIXTURE_OWNER}/${NAV_REPO}/commits/main`);
      await expect(page.locator("#ggraph-rail")).toBeVisible({ timeout: 5_000 });

      // Same-document (client-side) navigation to a non-commits page, as GitHub
      // does. The content script must detach the rail so it never lingers on the
      // destination page (issue #21).
      await page.evaluate((owner) => {
        history.pushState({}, "", `/${owner}/nav-repo`);
      }, FIXTURE_OWNER);
      await expect(
        page.locator("#ggraph-rail"),
        "the rail must be removed once the URL is no longer a commits page (#21)",
      ).toHaveCount(0, { timeout: 3_000 });
    });
  });
