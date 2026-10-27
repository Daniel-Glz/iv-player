---
description: "Live example: an interactive video where a question branches the story into one of two scenes."
---

<script setup>
import { adventure } from "./stories/adventure";
</script>

# Branching story

The simplest interactive video: at second 4, the video pauses and asks where to go. Each option jumps to a different scene, and the story ends when that scene finishes.

<PlayerDemo :story="adventure" log />

The log under the player shows the events `<iv-player>` dispatches. Use them for analytics, or to react to the viewer's choices elsewhere on the page.

## Story

<<< @/examples/stories/adventure.ts

## Page

```html
<iv-player id="player" controls></iv-player>

<script type="module">
  import "@iv-player/player";
  import { adventure } from "./adventure.js";

  const player = document.getElementById("player");
  player.story = adventure;
  player.addEventListener("iv-answer", (event) => {
    console.log("Picked", event.detail.choice.id);
  });
</script>
```

While the question is showing, the player preloads the scene of the first option, and switches to the chosen scene without a black frame.
