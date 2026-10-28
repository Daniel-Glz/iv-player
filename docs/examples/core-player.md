---
description: "Live example: an interactive video player built in Vue on @ivkit/core, without the Web Component."
---

<script setup>
import { adventure } from "./stories/adventure";
</script>

# Player built with core

This player doesn't use `<ivkit-player>` at all. It's a Vue component built on `@ivkit/core`: the questions are drawn as cards, and the trail under the video lists the scenes you've visited. The same approach works in React, Svelte, on a canvas, or in a game engine.

<CoreDemo :story="adventure" />

`StoryEngine` decides what happens and when. `MediaController` plays it on two stacked `<video>` elements, preloading the next scene and swapping without a black frame. The component only draws the interface and reports clicks back to the engine.

## Component

<<< @/.vitepress/theme/components/CoreDemo.vue

See [Custom players with core](/guide/core) for a walkthrough.
