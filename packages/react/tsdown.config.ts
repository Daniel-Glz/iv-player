import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  sourcemap: true,
  dts: true,
  tsconfig: "tsconfig.build.json",
  // Bundling drops module directives; React Server Components need this one to
  // render the component from a server component.
  banner: { js: '"use client";' },
});
