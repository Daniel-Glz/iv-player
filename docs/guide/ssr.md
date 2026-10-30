---
description: "Use IVKit with server-side rendering in Next.js, Nuxt, SvelteKit and Astro, and see which build each runtime loads."
---

# Server-side rendering

You can import `@ivkit/player` in code that also runs on the server, such as Next.js, Nuxt, SvelteKit or Astro. On the server, the import doesn't register anything and doesn't touch the DOM. The page HTML just includes an empty `<ivkit-player>` tag. Once the same import runs in the browser, it defines the element, and the player starts up with the `story` you gave it.

So the rule is the same in every framework: **import the package in code that also runs in the browser**, and set `story` as a property.

## What the server loads

| Runtime | Gets |
| --- | --- |
| Browsers and bundlers for the browser | The full player. |
| Node, used by Nuxt, SvelteKit, Astro and Next.js's Node runtime | The full player. On import it sees there's no DOM and registers nothing. |
| React Server Components (`react-server`) | A server build with no DOM code. |
| Cloudflare Workers (`workerd`) and Vercel Edge (`edge-light`) | The same server build. |

Bundlers pick the server build through `package.json` [export conditions](https://nodejs.org/api/packages.html#conditional-exports), so you don't need to configure anything. It has the same exports, with an empty `IvkitPlayer` class and a `defineIvkitPlayer` that does nothing. See [Server builds](/reference/player#server-builds).

## Avoid layout shift

Until the element is defined in the browser, `<ivkit-player>` is an unknown inline element with no size. Reserve its space with `:not(:defined)`, so the page doesn't jump when it upgrades:

```css
ivkit-player:not(:defined) {
  display: block;
  aspect-ratio: 16 / 9;
  background: #000;
}
```

## Next.js

In the App Router, render the player from a **client component**. A server component can output the `<ivkit-player>` tag, and importing the package there loads the server build. But none of a server component's code ships to the browser, so the element would never be defined.

```tsx
// app/player.tsx
"use client";

import "@ivkit/player";
import type { IvkitPlayer } from "@ivkit/player";
import type { Story } from "@ivkit/core";
import { useEffect, useRef } from "react";

export function Player({ story }: { story: Story }) {
  const ref = useRef<IvkitPlayer>(null);

  useEffect(() => {
    const player = ref.current;
    if (!player) return;
    const onAnswer = (event: HTMLElementEventMap["iv-answer"]) => {
      console.log("Picked", event.detail.choice.id);
    };
    player.addEventListener("iv-answer", onAnswer);
    return () => player.removeEventListener("iv-answer", onAnswer);
  }, []);

  return <ivkit-player ref={ref} controls story={story} />;
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

With [`@ivkit/react`](/guide/react#next-js-and-server-components), a server component can render the player directly, and event callbacks are props instead of listeners.

The story is a plain object, so a server component can load it, for example from a CMS, and pass it down as a prop. React 19 sets `story` as a property once the element is defined. See [`<ivkit-player>` → TypeScript and JSX](/reference/player#typescript-and-jsx) to type the element in JSX.

## Nuxt

Tell Vue that `ivkit-player` is a custom element, then bind `story` with `.prop`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag === "ivkit-player",
    },
  },
});
```

```vue
<script setup lang="ts">
import "@ivkit/player";
import { story } from "~/stories/intro";
</script>

<template>
  <ivkit-player controls :story.prop="story" />
</template>
```

`.prop` bindings are skipped on the server and applied when the page hydrates.

## SvelteKit

```svelte
<script lang="ts">
  import "@ivkit/player";
  import { story } from "$lib/story";
</script>

<ivkit-player controls {story}></ivkit-player>
```

When the element is defined in the browser, Svelte sets `story` as a property.

## Astro

Astro components render only on the server, so load the player in a `<script>`, which Astro bundles for the browser:

```astro
---
import { story } from "../stories/intro";
---

<ivkit-player id="player" controls data-story={JSON.stringify(story)}></ivkit-player>

<script>
  import "@ivkit/player";

  const player = document.querySelector("ivkit-player")!;
  player.story = JSON.parse(player.dataset["story"]!);
</script>
```

## Using core on the server

`@ivkit/core` has no DOM dependencies, so all of it runs on the server. That's useful for running [`validateStory`](/guide/validation) in an API route or at build time, before a story ever reaches the browser.
