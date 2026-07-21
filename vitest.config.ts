import { defineConfig } from "vitest/config";

// Vitest's default `include` pattern (`**/*.{test,spec}.*`) would otherwise
// also pick up Playwright's `e2e/**/*.spec.ts` files. Playwright has its own
// runner (`playwright.config.ts`) and must stay separate.
export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/.output/**", "**/.wxt/**", "e2e/**"],
  },
});
