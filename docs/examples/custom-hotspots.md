---
description: "Live example: custom hotspot variants and badges added with renderHotspot."
---

<script setup>
import { shapes } from "./stories/shapes";

// Same hotspots as the shapes example, drawn as numbered markers.
const markers = {
  ...shapes,
  scenes: {
    shapes: {
      ...shapes.scenes.shapes,
      events: shapes.scenes.shapes.events.map((event) => ({ ...event, variant: "marker" })),
    },
  },
};

const icons = { door: "🚪", sun: "☀️", mountain: "⛰️", key: "🔑" };

function renderMarker(hotspot, button) {
  const badge = document.createElement("span");
  badge.className = "marker-badge";
  badge.textContent = icons[hotspot.id] ?? "•";
  badge.style.cssText = `
    position: absolute; top: -14px; right: -14px;
    display: grid; place-items: center;
    width: 32px; height: 32px; border-radius: 50%;
    background: #fff; box-shadow: 0 2px 8px rgb(0 0 0 / 0.35);
    font-size: 18px; pointer-events: auto;`;
  button.append(badge);
}
</script>

# Custom hotspot content

Two tools let you draw hotspots your own way:

- A **custom variant**. Any `variant` name you choose gets its own part, `hotspot-<variant>`, which you can style from the page.
- **`renderHotspot`**, a function called for every hotspot button right after it's created, to add or replace its content.

Here every hotspot from the [shapes example](./hotspot-shapes) uses a `marker` variant with a dashed outline, plus a badge added by `renderHotspot`. Even the hidden key has a marker now.

<div class="markers">
  <PlayerDemo :story="markers" :render-hotspot="renderMarker" log />
</div>

## Variant styles

```ts
{ type: "hotspot", id: "door", variant: "marker", /* ... */ }
```

```css
.markers ivkit-player::part(hotspot-marker) {
  --iv-hotspot-fill: rgb(91 91 214 / 0.18);
  --iv-hotspot-fill-hover: rgb(91 91 214 / 0.4);
  --iv-hotspot-stroke: #a5a5ff;
  --iv-hotspot-stroke-dasharray: 6 4;
}
```

## Adding a badge

```ts
const icons = { door: "🚪", sun: "☀️", mountain: "⛰️", key: "🔑" };

player.renderHotspot = (hotspot, button) => {
  const badge = document.createElement("span");
  badge.className = "marker-badge";
  badge.textContent = icons[hotspot.id] ?? "•";
  // The badge sits outside the shape, so it needs its own pointer events.
  badge.style.cssText = `
    position: absolute; top: -14px; right: -14px;
    display: grid; place-items: center;
    width: 32px; height: 32px; border-radius: 50%;
    background: #fff; box-shadow: 0 2px 8px rgb(0 0 0 / 0.35);
    font-size: 18px; pointer-events: auto;`;
  button.append(badge);
};
```

The player keeps positioning and sizing each button, including animated ones. Elements inside the button live in the player's shadow root, where the page's CSS doesn't reach, so style them inline as above, or give them a `part` and style it with `::part()`.

Learn more: [Custom content](/guide/hotspots#custom-content) · [Styling hotspots](/guide/styling#hotspots) · [`renderHotspot`](/reference/player#properties)

<style>
.markers ivkit-player::part(hotspot-marker) {
  --iv-hotspot-fill: rgb(91 91 214 / 0.18);
  --iv-hotspot-fill-hover: rgb(91 91 214 / 0.4);
  --iv-hotspot-stroke: #a5a5ff;
  --iv-hotspot-stroke-dasharray: 6 4;
}
</style>
