import { defineConfig, type UserConfig } from "tsdown";
import { minifyCss } from "./build/minify-css.ts";

/** Minifies the CSS template of `src/styles.ts`, which the JS minifier leaves as is. */
const minifyStyles = {
  name: "ivkit:minify-styles",
  transform(code: string, id: string) {
    if (!/[\\/]src[\\/]styles\.ts$/.test(id)) return null;
    let found = false;
    const result = code.replace(/\/\* css \*\/ `([^`]*)`/, (_, css: string) => {
      if (css.includes("${")) throw new Error("styles.ts: the CSS can't hold interpolations");
      found = true;
      return `\`${minifyCss(css)}\``;
    });
    if (!found) throw new Error("styles.ts: no /* css */ template to minify");
    // Only the inside of one string changes, so the code around it keeps its positions.
    return { code: result, map: null };
  },
};

const shared = {
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  sourcemap: true,
  tsconfig: "tsconfig.build.json",
  plugins: [minifyStyles],
} satisfies UserConfig;

export default defineConfig([
  // For bundlers and npm: imports @ivkit/core like any other dependency.
  {
    ...shared,
    entry: ["src/index.ts", "src/element.ts", "src/server.ts"],
    dts: true,
  },
  // For a <script type="module"> straight from a CDN: everything in one file.
  {
    ...shared,
    entry: { "ivkit-player.min": "src/index.ts" },
    deps: { alwaysBundle: ["@ivkit/core"] },
    dts: false,
    clean: false,
  },
]);
