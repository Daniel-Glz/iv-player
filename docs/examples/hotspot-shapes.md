---
description: "Live example: clickable rectangle, ellipse and polygon hotspots with the outline, pulse, label and hidden variants."
---

<script setup>
import { shapes } from "./stories/shapes";
</script>

# Hotspot shapes

Hotspots are clickable areas over the video that don't pause it. This one scene has four, one for each built-in variant:

- **The door** is a `rect` with the default `outline` variant.
- **The sun** is an `ellipse` with the `pulse` variant.
- **The mountain** is a `polygon` with the `label` variant, which shows its label.
- **The key** in the top right corner uses the `hidden` variant: invisible, but still clickable. Can you find it?

<PlayerDemo :story="shapes" log />

None of these hotspots has a `goto`, so clicking them only reports an `iv-hotspot` event, shown in the log. Clicks follow the exact shape: try clicking just outside the sun's circle, or beside the mountain's slopes.

Hotspots are real buttons, so you can also reach them with <kbd>Tab</kbd> and activate them with <kbd>Enter</kbd>.

## Story

<<< @/examples/stories/shapes.ts

## Reacting to clicks

```ts
player.addEventListener("iv-hotspot", (event) => {
  const { hotspot } = event.detail;
  if (hotspot.id === "key") showToast("You found the hidden key!");
});
```

Learn more: [Shapes](/guide/hotspots#shapes) · [Variants](/guide/hotspots#variants) · [Player events](/reference/player#events)
