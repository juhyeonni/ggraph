import { defineConfig } from "wxt";

export default defineConfig({
  vite: () => ({
    esbuild: { jsx: "automatic", jsxImportSource: "preact" },
  }),
  manifest: {
    name: "ggraph",
    description: "Commit graph on GitHub's commits page",
    permissions: ["storage"],
    host_permissions: ["https://github.com/*", "https://api.github.com/*"],
  },
});
