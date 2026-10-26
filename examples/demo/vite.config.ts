import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    // Use the packages' sources so edits show up without rebuilding them.
    alias: {
      "@iv-player/core": source("../../packages/core/src/index.ts"),
      "@iv-player/player": source("../../packages/player/src/index.ts"),
    },
  },
});
