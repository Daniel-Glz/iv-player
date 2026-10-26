import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "neutral",
  target: "es2022",
  minify: true,
  sourcemap: true,
  dts: true,
  tsconfig: "tsconfig.build.json",
});
