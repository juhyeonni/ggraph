import { defineConfig } from "wxt";

export default defineConfig({
  vite: () => ({
    esbuild: { jsx: "automatic", jsxImportSource: "preact" },
  }),
  manifest: {
    name: "ggraph",
    description: "Commit graph on GitHub's commits page",
    version: "1.0.0",
    permissions: ["storage"],
    host_permissions: ["https://github.com/*", "https://api.github.com/*"],
    action: {
      default_icon: {
        16: "icons/16.png",
        32: "icons/32.png",
        48: "icons/48.png",
        128: "icons/128.png",
      },
    },
  },
});
