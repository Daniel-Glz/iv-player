import { fileURLToPath } from "node:url";
import { defineProject } from "vitest/config";

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineProject({
  resolve: {
    // Test against the other packages' sources so they don't need to be built first.
    alias: {
      "@ivkit/core": source("../core/src/index.ts"),
      "@ivkit/player": source("../player/src/index.ts"),
    },
  },
  test: {
    name: "react",
    environment: "happy-dom",
    include: ["test/**/*.test.ts"],
  },
});
