<script setup>
import { adventure } from "./stories/adventure";
</script>

# Player built with core

This player doesn't use `<iv-player>` at all. It's a Vue component built on `@iv-player/core`: the questions are drawn as cards, and the trail under the video lists the scenes you've visited. The same approach works in React, Svelte, on a canvas, or in a game engine.

<CoreDemo :story="adventure" />

`StoryEngine` decides what happens and when. `MediaController` plays it on two stacked `<video>` elements, with preloading and seamless swaps. The component only draws the interface and reports clicks back to the engine.

## Component

<<< @/.vitepress/theme/components/CoreDemo.vue

See [Custom players with core](/guide/core) for a walkthrough.
