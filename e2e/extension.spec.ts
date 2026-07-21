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

    test("004: hover shows the tooltip, click navigates to the commit", async () => {
      // Reuses story 003's already-rendered page/session — no re-navigation.
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
        "expected #ggraph-tooltip to become visible on hovering the first commit node",
      ).toBeVisible({ timeout: 2_000 });
      await expect(tooltip).toContainText("Fixture commit 0");
      await expect(tooltip).toContainText("Fixture Author");

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
  });
