# Server-side rendering

You can import `@iv-player/player` in code that also runs on the server, such as Next.js, Nuxt, SvelteKit or Astro. On the server, the import doesn't register anything and doesn't touch the DOM. The page HTML just includes an empty `<iv-player>` tag. Once the same import runs in the browser, it defines the element, and the player starts up with the `story` you gave it.

So the rule is the same in every framework: **import the package in code that also runs in the browser**, and set `story` as a property.

## Avoid layout shift

Until the element is defined in the browser, `<iv-player>` is an unknown inline element with no size. Reserve its space with `:not(:defined)`, so the page doesn't jump when it upgrades:

```css
iv-player:not(:defined) {
  display: block;
  aspect-ratio: 16 / 9;
  background: #000;
}
```

## Next.js

In the App Router, render the player from a **client component**. A server component can output the `<iv-player>` tag, but none of its code ships to the browser, so the element would never be defined there.

```tsx
// app/player.tsx
"use client";

import "@iv-player/player";
import type { IvPlayer } from "@iv-player/player";
import type { Story } from "@iv-player/core";
import { useEffect, useRef } from "react";

export function Player({ story }: { story: Story }) {
  const ref = useRef<IvPlayer>(null);

  useEffect(() => {
    const player = ref.current;
    if (!player) return;
    const onAnswer = (event: HTMLElementEventMap["iv-answer"]) => {
      console.log("Picked", event.detail.choice.id);
    };
    player.addEventListener("iv-answer", onAnswer);
    return () => player.removeEventListener("iv-answer", onAnswer);
  }, []);

  return <iv-player ref={ref} controls story={story} />;
}
```

```tsx
// app/page.tsx (a server component)
import { Player } from "./player";
import { story } from "./story";

export default function Page() {
  return <Player story={story} />;
}
```

The story is a plain object, so a server component can load it, for example from a CMS, and pass it down as a prop. React 19 sets `story` as a property once the element is defined. See [`<iv-player>` → TypeScript and JSX](/reference/player#typescript-and-jsx) to type the element in JSX.

## Nuxt

Tell Vue that `iv-player` is a custom element, then bind `story` with `.prop`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag === "iv-player",
    },
  },
});
```

```vue
<script setup lang="ts">
import "@iv-player/player";
import { story } from "~/stories/intro";
</script>

<template>
  <iv-player controls :story.prop="story" />
</template>
```

`.prop` bindings are skipped on the server and applied when the page hydrates.

## SvelteKit

```svelte
<script lang="ts">
  import "@iv-player/player";
  import { story } from "$lib/story";
</script>

<iv-player controls {story}></iv-player>
```

When the element is defined in the browser, Svelte sets `story` as a property.

## Astro

Astro components render only on the server, so load the player in a `<script>`, which Astro bundles for the browser:

```astro
---
import { story } from "../stories/intro";
---

<iv-player id="player" controls data-story={JSON.stringify(story)}></iv-player>

<script>
  import "@iv-player/player";

  const player = document.getElementById("player")!;
  player.story = JSON.parse(player.dataset.story!);
</script>
```

## Using core on the server

`@iv-player/core` has no DOM dependencies, so all of it runs on the server. That's useful for running [`validateStory`](/guide/validation) in an API route or at build time, before a story ever reaches the browser.
