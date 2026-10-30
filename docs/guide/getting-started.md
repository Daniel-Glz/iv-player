---
description: "Build your first interactive video with the <ivkit-player> Web Component: one HTML file, then npm, React, Vue or Svelte."
---

<script setup>
import { adventure } from "../examples/stories/adventure";
</script>

# Getting started

This page builds a video that stops and asks the viewer where to go, then plays the scene they picked:

<PlayerDemo :story="adventure" />

::: tip Building your own player?
This page uses `<ivkit-player>`, the ready-made player. To draw your own interface instead, go to [Custom players with core](/guide/core).
:::

## Try it in one HTML file

Save this as `index.html`. It loads the player from a CDN and uses the example videos of this site, so it works as is:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <script type="module" src="https://cdn.jsdelivr.net/npm/@ivkit/player@0.3/dist/ivkit-player.min.js"></script>
  </head>
  <body>
    <ivkit-player id="player" controls></ivkit-player>

    <script type="module">
      const videos = "https://daniel-glz.github.io/ivkit/examples/videos";
      const player = document.getElementById("player");

      player.story = {
        version: "0.1",
        start: "intro",
        scenes: {
          intro: {
            src: `${videos}/adventure-intro.mp4`,
            events: [
              {
                type: "question",
                id: "path",
                at: 4,
                text: "Where do you want to go?",
                options: [
                  { id: "forest", label: "Into the forest", goto: "forest" },
                  { id: "city", label: "To the city", goto: "city" },
                ],
              },
            ],
          },
          forest: { src: `${videos}/adventure-forest.mp4` },
          city: { src: `${videos}/adventure-city.mp4` },
        },
      };
    </script>
  </body>
</html>
```

Serve the folder with any local web server, for example `npx serve`, and open the page. You should see a **Play** button. At second 4 of `intro`, the video pauses and the question appears. Each option jumps to its own scene, and when that video ends, the story ends.

### How the story works

A story is a plain object:

- `scenes` are the videos, keyed by id, and `start` names the first one.
- A scene's `events` are what happens while it plays. Here, a `question` at second 4 (`at`).
- Each option's `goto` names the scene it branches to.

To use your own videos, replace each `src`. [Writing stories](/guide/stories) covers the rest: loops, scores, time limits and more.

## Install from npm

In a project with a bundler, such as Vite, install the package:

::: code-group

```sh [npm]
npm install @ivkit/player
```

```sh [pnpm]
pnpm add @ivkit/player
```

```sh [yarn]
yarn add @ivkit/player
```

:::

Then import it once, for example in your entry file. Importing it registers the `<ivkit-player>` element:

```ts
import "@ivkit/player";

const player = document.querySelector("ivkit-player")!;
player.story = story;
```

`@ivkit/player` includes the engine from `@ivkit/core`. To import from `@ivkit/core` in your own code, such as the `Story` type or [`validateStory`](/guide/validation), add it too, at the same version.

Until 1.0.0, minor versions may include breaking changes. The `^0.3.0` range that npm saves only accepts 0.3.x updates, and the CDN address above uses `@0.3` for the same reason. The [changelog](/changelog) lists what changes in each version.

::: tip Autoplay
Add the `autoplay` attribute to start as soon as a story is set. Browsers usually block autoplay with sound, so combine it with `muted`. If playback is blocked, the player shows the Play button again.
:::

## Listening to the viewer

The player fires DOM events whose names start with `iv-`. Listen to them like any other event, for example to send analytics:

```ts
player.addEventListener("iv-answer", (event) => {
  const { question, choice } = event.detail;
  analytics.track("answer", { question: question.id, choice: choice.id });
});

player.addEventListener("iv-end", (event) => {
  console.log("Finished on", event.detail.sceneId);
});
```

In TypeScript, `event.detail` is typed automatically. See the [full list of events](/reference/player#events).

## Using it from a framework

`<ivkit-player>` is a standard custom element, so it works in any framework. Set `story` as a **property**, not an attribute, since it's an object.

::: code-group

```tsx [React 19]
import "@ivkit/player";
import { story } from "./story";

export function Player() {
  return <ivkit-player controls story={story} />;
}
```

```vue [Vue]
<script setup lang="ts">
import "@ivkit/player";
import { story } from "./story";
</script>

<template>
  <ivkit-player controls :story.prop="story" />
</template>
```

```svelte [Svelte]
<script lang="ts">
  import "@ivkit/player";
  import { story } from "./story";
</script>

<ivkit-player controls {story}></ivkit-player>
```

:::

For React, [`@ivkit/react`](/guide/react) wraps the element in a component with typed props and event callbacks, and works in React 18 too.

In Vue, tell the compiler that `ivkit-player` is a custom element, in `vite.config.ts`:

```ts
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    vue({
      template: { compilerOptions: { isCustomElement: (tag) => tag === "ivkit-player" } },
    }),
  ],
});
```

Importing the package is safe during server-side rendering. See [Server-side rendering](/guide/ssr) for Next.js, Nuxt, SvelteKit and Astro.

## Next steps

- [Writing stories](/guide/stories): scenes, questions, branching, scores and time limits.
- [Hotspots](/guide/hotspots): clickable areas, shapes and animation.
- [Styling the player](/guide/styling): colors, fonts and `::part()`.
- [Examples](/examples/): live players with their stories and code.
- [Troubleshooting](/guide/troubleshooting): when something doesn't play or look as expected.
