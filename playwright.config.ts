import { defineConfig } from "@playwright/test";

// One suite, one shared persistent extension context (see e2e/extension.spec.ts) —
// workers must stay at 1 so the whole file runs in a single process/session.
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
});
