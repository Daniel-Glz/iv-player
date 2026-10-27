import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";

const source = (path: string) => fileURLToPath(new URL(`../../packages/${path}`, import.meta.url));

export default defineConfig({
  title: "iv-player",
  description: "Lightweight TypeScript library for interactive videos",
  // Served from https://daniel-glz.github.io/iv-player/
  base: "/iv-player/",
  cleanUrls: true,
  // The examples run the packages from source, so the site needs no build of them.
  vite: {
    resolve: {
      alias: {
        "@iv-player/core": source("core/src/index.ts"),
        "@iv-player/player": source("player/src/index.ts"),
      },
    },
  },
  vue: {
    template: { compilerOptions: { isCustomElement: (tag) => tag === "iv-player" } },
  },
  lastUpdated: true,
  head: [["link", { rel: "icon", href: "/iv-player/favicon.svg", type: "image/svg+xml" }]],
  themeConfig: {
    logo: "/favicon.svg",
    nav: [
      { text: "Guide", link: "/guide/getting-started", activeMatch: "/guide/" },
      { text: "Examples", link: "/examples/", activeMatch: "/examples/" },
      { text: "Reference", link: "/reference/story-format", activeMatch: "/reference/" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "Server-side rendering", link: "/guide/ssr" },
            { text: "Writing stories", link: "/guide/stories" },
            { text: "Hotspots", link: "/guide/hotspots" },
            { text: "Styling the player", link: "/guide/styling" },
            { text: "Validating stories", link: "/guide/validation" },
            { text: "Custom players with core", link: "/guide/core" },
          ],
        },
      ],
      "/examples/": [
        {
          text: "Examples",
          items: [
            { text: "Overview", link: "/examples/" },
            { text: "Branching story", link: "/examples/branching" },
            { text: "Quiz with retries", link: "/examples/quiz" },
            { text: "Hotspot shapes", link: "/examples/hotspot-shapes" },
            { text: "Tracking a moving object", link: "/examples/tracking" },
            { text: "Custom theme", link: "/examples/theming" },
            { text: "Custom hotspot content", link: "/examples/custom-hotspots" },
            { text: "Player built with core", link: "/examples/core-player" },
            { text: "Validation playground", link: "/examples/validation" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Story format", link: "/reference/story-format" },
            { text: "<iv-player>", link: "/reference/player" },
            { text: "StoryEngine", link: "/reference/engine" },
            { text: "MediaController", link: "/reference/media-controller" },
            { text: "Utilities", link: "/reference/utilities" },
          ],
        },
      ],
    },
    socialLinks: [{ icon: "github", link: "https://github.com/Daniel-Glz/iv-player" }],
    editLink: {
      pattern: "https://github.com/Daniel-Glz/iv-player/edit/main/docs/:path",
    },
    search: { provider: "local" },
    footer: { message: "Released under the MIT License." },
  },
});
