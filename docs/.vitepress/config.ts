import { defineConfig } from "vitepress";

export default defineConfig({
  title: "iv-player",
  description: "Lightweight TypeScript library for interactive videos",
  // Served from https://daniel-glz.github.io/iv-player/
  base: "/iv-player/",
  cleanUrls: true,
  lastUpdated: true,
  head: [["link", { rel: "icon", href: "/iv-player/favicon.svg", type: "image/svg+xml" }]],
  themeConfig: {
    logo: "/favicon.svg",
    nav: [
      { text: "Guide", link: "/guide/getting-started", activeMatch: "/guide/" },
      { text: "Reference", link: "/reference/story-format", activeMatch: "/reference/" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "Writing stories", link: "/guide/stories" },
            { text: "Hotspots", link: "/guide/hotspots" },
            { text: "Styling the player", link: "/guide/styling" },
            { text: "Validating stories", link: "/guide/validation" },
            { text: "Custom players with core", link: "/guide/core" },
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
