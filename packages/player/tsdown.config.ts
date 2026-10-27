import { defineConfig } from "tsdown";

const shared = {
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  sourcemap: true,
  tsconfig: "tsconfig.build.json",
} as const;

export default defineConfig([
  // For bundlers and npm: imports @iv-player/core like any other dependency.
  {
    ...shared,
    entry: ["src/index.ts", "src/element.ts", "src/server.ts"],
    dts: true,
  },
  // For a <script type="module"> straight from a CDN: everything in one file.
  {
    ...shared,
    entry: { "iv-player.min": "src/index.ts" },
    deps: { alwaysBundle: ["@iv-player/core"] },
    dts: false,
    clean: false,
  },
]);
