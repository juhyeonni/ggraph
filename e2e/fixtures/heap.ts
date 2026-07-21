import type { Page } from "@playwright/test";

const BYTES_PER_MB = 1024 * 1024;

// Playwright has no Puppeteer-style page.metrics(); the CDP equivalent is a
// per-page session's Performance domain. This measures the *page's* JS heap
// (GitHub's own fixture JS included, not just the extension's contribution —
// see e2e/extension.spec.ts's heap-budget test for how the before/after
// delta isolates the extension's share despite that noise).
export async function readHeapMB(page: Page): Promise<number> {
  const client = await page.context().newCDPSession(page);
  try {
    try {
      await client.send("HeapProfiler.enable");
      await client.send("HeapProfiler.collectGarbage");
    } catch {
      // best-effort GC to cut noise; not every Chromium build exposes it
    }
    await client.send("Performance.enable");
    const { metrics } = await client.send("Performance.getMetrics");
    const used = metrics.find((metric) => metric.name === "JSHeapUsedSize")?.value ?? 0;
    return used / BYTES_PER_MB;
  } finally {
    await client.detach().catch(() => {});
  }
}
