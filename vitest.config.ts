import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Each package under packages/* provides its own vitest.config.ts
    // (e.g. core runs in "node", player in a DOM environment).
    projects: ["packages/*"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**"],
      exclude: ["**/*.test.ts", "**/*.d.ts"],
    },
  },
});
