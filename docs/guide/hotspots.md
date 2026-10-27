# Hotspots

A hotspot is a clickable area over the video. Unlike a question, it **doesn't pause playback**.

```ts
{
  type: "hotspot",
  id: "map",
  from: 3,
  to: 9,
  label: "Open the map",
  goto: "map-scene",
  area: { x: 0.62, y: 0.2, width: 0.25, height: 0.3 },
}
```

- It's visible while `from <= time < to`. Without `to`, it stays until the scene ends.
- `label` is its accessible name, read by screen readers. The `label` variant also shows it as text.
- With `goto`, activating it branches to that scene. Without it, the activation is only reported through the `iv-hotspot` event.
- Hotspots hide while a question is showing.

Hotspots are rendered as real `<button>`s, so they can be reached with the keyboard.

## Coordinates

Coordinates are **fractions (0–1) of the video picture**, measured from its top-left corner. They're relative to the picture itself, not the `<video>` element, so letterboxing doesn't shift them, and they stay correct at any player size.

To convert from pixels, divide by the video's size: a box at `(1200, 200)` that's `480 × 320` in a 1920 × 1080 video becomes:

```ts
area: { x: 1200 / 1920, y: 200 / 1080, width: 480 / 1920, height: 320 / 1080 }
```

## Shapes

| `shape` | Geometry field | Notes |
| --- | --- | --- |
| `"rect"` (default) | `area` | |
| `"ellipse"` | `area` | The ellipse fits inside `area`. |
| `"polygon"` | `points` | At least three `[x, y]` points. |

```ts
{
  type: "hotspot",
  id: "lamp",
  from: 0,
  label: "The lamp",
  shape: "polygon",
  points: [[0.4, 0.1], [0.55, 0.1], [0.6, 0.45], [0.35, 0.45]],
}
```

Clicks follow the exact shape, so clicking the corner of an ellipse's bounding box doesn't activate it.

## Animation

To follow something that moves, use `keyframes`. Each keyframe gives the geometry at a second of the scene, and the player interpolates between them:

```ts
{
  type: "hotspot",
  id: "bird",
  from: 2,
  to: 8,
  label: "The bird",
  shape: "ellipse",
  keyframes: [
    { at: 2, area: { x: 0.1, y: 0.5, width: 0.1, height: 0.1 } },
    { at: 5, area: { x: 0.45, y: 0.2, width: 0.12, height: 0.12 }, easing: "ease-in-out" },
    { at: 8, area: { x: 0.8, y: 0.35, width: 0.1, height: 0.1 } },
  ],
}
```

- Keyframes take precedence over the hotspot's own `area` and `points`. Fields a keyframe leaves out fall back to the hotspot's.
- Before the first keyframe and after the last one, the hotspot holds still.
- `easing` sets the transition **from** that keyframe to the next: `"linear"` (default), `"ease-in-out"`, or `"step"` to jump at the next keyframe.
- Rectangles and ellipses morph into each other. Polygons morph into polygons with the same number of points. Any other change of shape happens at once, when the next keyframe is reached.

Animated hotspots are positioned with `requestVideoFrameCallback` when the browser supports it, so they move in step with each video frame instead of lagging behind fast motion.

## Variants

`variant` chooses how the player draws a hotspot:

| `variant` | Look |
| --- | --- |
| `"outline"` (default) | A translucent shape with an outline. |
| `"pulse"` | Like `outline`, but it breathes to draw attention. The animation stops for viewers who prefer reduced motion. |
| `"label"` | Shows `label` as text over the shape. |
| `"hidden"` | Invisible but clickable, for "find the object" games. |

Any other name works too: style it yourself with `::part(hotspot-<variant>)`. See [Styling the player](/guide/styling#hotspots).

## Custom content

For full control over a hotspot's content, set `renderHotspot`. It's called for each hotspot right after its button is created:

```ts
player.renderHotspot = (hotspot, button) => {
  if (hotspot.variant !== "product") return;
  const image = document.createElement("img");
  image.src = `/thumbnails/${hotspot.id}.png`;
  image.alt = "";
  button.append(image);
};
```

The player keeps positioning and sizing the button. Clicks are taken by the default SVG shape, so if you remove it, give your own content `pointer-events: auto`.
