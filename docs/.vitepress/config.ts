import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";

const site = "https://daniel-glz.github.io/ivkit/";
const source = (path: string) => fileURLToPath(new URL(`../../packages/${path}`, import.meta.url));
// Both packages share a version, shown in the nav.
const { version } = JSON.parse(readFileSync(source("player/package.json"), "utf8")) as {
  version: string;
};

export default defineConfig({
  title: "IVKit",
  description:
    "A lightweight TypeScript library for interactive videos: branching stories, questions and animated hotspots, in a Web Component under 8 KiB gzip.",
  // Served from https://daniel-glz.github.io/ivkit/
  base: "/ivkit/",
  cleanUrls: true,
  // The examples run the packages from source, so the site needs no build of them.
  vite: {
    resolve: {
      alias: {
        "@ivkit/core": source("core/src/index.ts"),
        "@ivkit/player": source("player/src/index.ts"),
      },
    },
  },
  vue: {
    template: { compilerOptions: { isCustomElement: (tag) => tag === "ivkit-player" } },
  },
  lastUpdated: true,
  sitemap: { hostname: site },
  head: [
    ["link", { rel: "icon", href: "/ivkit/favicon.svg", type: "image/svg+xml" }],
    ["meta", { name: "theme-color", content: "#5b5bd6" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "IVKit" }],
    ["meta", { property: "og:image", content: `${site}og-image.png` }],
    ["meta", { property: "og:image:width", content: "1200" }],
    ["meta", { property: "og:image:height", content: "630" }],
    ["meta", { property: "og:image:alt", content: "ivkit-player: interactive videos for the web" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
  ],
  // Per-page title, description and address for link previews and search engines.
  transformHead({ pageData, siteData }) {
    if (pageData.isNotFound) return [["meta", { name: "robots", content: "noindex" }]];
    const path = pageData.relativePath.replace(/(^|\/)index\.md$/, "$1").replace(/\.md$/, "");
    const url = `${site}${path}`;
    // Pages with `titleTemplate: false` (the home page) use their title as is.
    const title = !pageData.title
      ? siteData.title
      : pageData.frontmatter["titleTemplate"] === false
        ? pageData.title
        : `${pageData.title} | ${siteData.title}`;
    const description = pageData.description || siteData.description;
    return [
      ["link", { rel: "canonical", href: url }],
      ["meta", { property: "og:url", content: url }],
      ["meta", { property: "og:title", content: title }],
      ["meta", { property: "og:description", content: description }],
      ["meta", { name: "twitter:title", content: title }],
      ["meta", { name: "twitter:description", content: description }],
    ];
  },
  themeConfig: {
    logo: "/favicon.svg",
    nav: [
      { text: "Guide", link: "/guide/getting-started", activeMatch: "/guide/" },
      { text: "Examples", link: "/examples/", activeMatch: "/examples/" },
      { text: "Reference", link: "/reference/story-format", activeMatch: "/reference/" },
      {
        text: `v${version}`,
        items: [
          { text: "Changelog", link: "/changelog" },
          { text: "Releases", link: "https://github.com/Daniel-Glz/ivkit/releases" },
          { text: "@ivkit/player on npm", link: "https://www.npmjs.com/package/@ivkit/player" },
          { text: "@ivkit/core on npm", link: "https://www.npmjs.com/package/@ivkit/core" },
        ],
      },
      {
        text: "About",
        items: [
          { text: "Contributing", link: "/contributing" },
          { text: "License", link: "/license" },
        ],
      },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "Writing stories", link: "/guide/stories" },
            { text: "Hotspots", link: "/guide/hotspots" },
            { text: "Validating stories", link: "/guide/validation" },
          ],
        },
        {
          text: "With the player",
          items: [
            { text: "Styling the player", link: "/guide/styling" },
            { text: "Server-side rendering", link: "/guide/ssr" },
          ],
        },
        {
          text: "Without the player",
          items: [{ text: "Custom players with core", link: "/guide/core" }],
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
            { text: "<ivkit-player>", link: "/reference/player" },
            { text: "StoryEngine", link: "/reference/engine" },
            { text: "MediaController", link: "/reference/media-controller" },
            { text: "Utilities", link: "/reference/utilities" },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/Daniel-Glz/ivkit" },
      { icon: "npm", link: "https://www.npmjs.com/package/@ivkit/player" },
    ],
    editLink: {
      pattern: "https://github.com/Daniel-Glz/ivkit/edit/main/docs/:path",
    },
    search: { provider: "local" },
    footer: {
      message: 'Released under the <a href="/ivkit/license">MIT License</a>.',
      copyright: "Copyright © 2026 Alexis Gonzalez",
    },
  },
});
