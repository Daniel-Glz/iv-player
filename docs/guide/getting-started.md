# Getting started

iv-player has two packages:

| Package | What it is | Use it when |
| --- | --- | --- |
| `@iv-player/player` | The `<iv-player>` Web Component: videos, questions, hotspots and controls. | You want a ready-made player. |
| `@iv-player/core` | A DOM-free engine, media controller and validator. | You're building your own interface. |

`@iv-player/player` depends on `@iv-player/core`, so you only install one of them.

## Install

::: code-group

```sh [pnpm]
pnpm add @iv-player/player
```

```sh [npm]
npm install @iv-player/player
```

```sh [yarn]
yarn add @iv-player/player
```

:::

Importing the package registers the `<iv-player>` element:

```ts
import "@iv-player/player";
```

### From a CDN

Without a bundler, load the standalone build. It's a single ES module that includes the core engine:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@iv-player/player/dist/iv-player.min.js"></script>
```

## Your first story

A story is a set of scenes. Each scene is a video, plus the questions and hotspots that appear while it plays.

```html
<iv-player id="player" controls></iv-player>

<script type="module">
  import "@iv-player/player";

  const player = document.getElementById("player");

  player.story = {
    version: "0.1",
    start: "intro",
    scenes: {
      intro: {
        src: "/videos/intro.mp4",
        events: [
          {
            type: "question",
            id: "path",
            at: 4,
            text: "Where should we go?",
            options: [
              { id: "forest", label: "Into the forest", goto: "forest" },
              { id: "city", label: "Back to the city", goto: "city" },
            ],
          },
        ],
      },
      forest: { src: "/videos/forest.mp4" },
      city: { src: "/videos/city.mp4" },
    },
  };
</script>
```

When the story is set, the player shows a **Play** button. When the viewer reaches second 4 of `intro`, the video pauses and the question appears. The answer branches to `forest` or `city`, and when that video ends, the story ends.

::: tip Autoplay
Add the `autoplay` attribute to start as soon as a story is set. Browsers usually block autoplay with sound, so combine it with `muted`. If playback is blocked, the player shows the Play button again.
:::

## Listening to the viewer

The player dispatches events that bubble and cross the shadow boundary:

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

`<iv-player>` is a standard custom element, so it works in any framework. Set `story` as a **property**, not an attribute, since it's an object.

::: code-group

```tsx [React 19]
import "@iv-player/player";
import { story } from "./story";

export function Player() {
  return <iv-player controls story={story} />;
}
```

```vue [Vue]
<script setup lang="ts">
import "@iv-player/player";
import { story } from "./story";
</script>

<template>
  <iv-player controls :story.prop="story" />
</template>
```

```svelte [Svelte]
<script lang="ts">
  import "@iv-player/player";
  import { story } from "./story";
</script>

<iv-player controls {story}></iv-player>
```

:::

In Vue, tell the compiler that `iv-player` is a custom element with `compilerOptions.isCustomElement`.

Importing the package is safe during server-side rendering. See [Server-side rendering](/guide/ssr) for Next.js, Nuxt, SvelteKit and Astro.

## Next steps

- [Writing stories](/guide/stories): scenes, questions and branching.
- [Hotspots](/guide/hotspots): clickable areas, shapes and animation.
- [Styling the player](/guide/styling): colors, fonts and `::part()`.
