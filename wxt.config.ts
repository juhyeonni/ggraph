import { defineConfig } from "wxt";

export default defineConfig({
  vite: () => ({
    esbuild: { jsx: "automatic", jsxImportSource: "preact" },
  }),
  manifest: {
    // name, description, and version are derived from package.json by WXT.
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
