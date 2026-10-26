import { fileURLToPath } from "node:url";
import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    // Test against core's sources so it doesn't need to be built first.
    alias: {
      "@iv-player/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
    },
  },
  test: {
    name: "player",
    environment: "happy-dom",
    include: ["test/**/*.test.ts"],
  },
});
