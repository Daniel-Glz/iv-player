---
description: "Install ivkit-player, write your first interactive video story and use the <ivkit-player> Web Component from plain HTML, React, Vue or Svelte."
---

# Getting started

You can use IVKit with its ready-made player or without it. Each way has its own package:

| Package | What it is | Use it when |
| --- | --- | --- |
| `@ivkit/player` | The `<ivkit-player>` Web Component: videos, questions, hotspots and controls. | You want a ready-made player. |
| `@ivkit/core` | A DOM-free engine, media controller and validator. | You're building your own interface. |

`@ivkit/player` depends on `@ivkit/core`, so you only install one of them. Both play the same [stories](/guide/stories), so you can start with the player and switch to core later without rewriting them.

::: tip Building your own player?
This page sets up `<ivkit-player>`. To use IVKit without it, go to [Custom players with core](/guide/core), or see a [player built in Vue](/examples/core-player).
:::

## Install

::: code-group

```sh [pnpm]
pnpm add @ivkit/player
```

```sh [npm]
npm install @ivkit/player
```

```sh [yarn]
yarn add @ivkit/player
```

:::

Until 1.0.0, minor versions may include breaking changes, so a `^0.1.1` range only accepts 0.1.x updates, which is what npm and pnpm save by default. The [changelog](/changelog) lists what changes in each version.

Importing the package registers the `<ivkit-player>` element:

```ts
import "@ivkit/player";
```

### From a CDN

Without a bundler, load the standalone build. It's a single ES module that includes the core engine:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@ivkit/player@0.1/dist/ivkit-player.min.js"></script>
```

`@0.1` loads the latest 0.1.x release, so you get fixes without breaking changes. Use an exact version such as `@0.1.1` to never change, or the same path on [unpkg](https://unpkg.com/@ivkit/player@0.1/dist/ivkit-player.min.js).

## Your first story

A story is a set of scenes. Each scene is a video, plus the questions and hotspots that appear while it plays.

```html
<ivkit-player id="player" controls></ivkit-player>

<script type="module">
  import "@ivkit/player";

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

In Vue, tell the compiler that `ivkit-player` is a custom element with `compilerOptions.isCustomElement`.

Importing the package is safe during server-side rendering. See [Server-side rendering](/guide/ssr) for Next.js, Nuxt, SvelteKit and Astro.

## Next steps

- [Writing stories](/guide/stories): scenes, questions and branching.
- [Hotspots](/guide/hotspots): clickable areas, shapes and animation.
- [Styling the player](/guide/styling): colors, fonts and `::part()`.
- [Custom players with core](/guide/core): the same stories, with your own interface.
