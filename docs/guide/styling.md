---
description: "Theme the <ivkit-player> Web Component with --iv-* custom properties, ::part() selectors and slots."
---

# Styling the player

`<ivkit-player>` renders inside a shadow root, so page styles don't leak into it. You customize it in two ways:

1. **Custom properties** (`--iv-*`) for colors, fonts and sizes.
2. **`::part()`** for anything else.

## Custom properties

```css
ivkit-player {
  --iv-accent: #ffd166;
  --iv-accent-contrast: #1b1b1f;
  --iv-font: 600 1rem/1.4 "Inter", sans-serif;
  --iv-radius: 12px;
  --iv-aspect-ratio: 4 / 3;
}
```

| Property | Default | Used for |
| --- | --- | --- |
| `--iv-aspect-ratio` | `16 / 9` | Size of the player box. |
| `--iv-radius` | `0` | Corner radius of the player. |
| `--iv-background` | `#000` | Behind the video, including letterboxing. |
| `--iv-color` | `#fff` | Text color. |
| `--iv-font` | `500 1rem/1.4 system-ui, sans-serif` | The `font` shorthand. |
| `--iv-accent` | `#fff` | Buttons and progress. |
| `--iv-accent-contrast` | `#111` | Text on accent-colored buttons. |
| `--iv-button-radius` | `999px` | Corner radius of buttons. |
| `--iv-focus-ring` | `#4c9ffe` | Keyboard focus outline. |
| `--iv-overlay-background` | `rgb(0 0 0 / 0.55)` | Behind the question, start and end screens. |
| `--iv-question-font-size` | `1.25em` | Question text. |
| `--iv-controls-background` | `linear-gradient(transparent, rgb(0 0 0 / 0.7))` | Behind the control bar. |
| `--iv-hotspot-fill` | `rgb(255 255 255 / 0.12)` | Hotspot fill. |
| `--iv-hotspot-fill-hover` | `rgb(255 255 255 / 0.28)` | Hotspot fill on hover and focus. |
| `--iv-hotspot-stroke` | `rgb(255 255 255 / 0.85)` | Hotspot outline. |
| `--iv-hotspot-stroke-width` | `2px` | Hotspot outline width. |
| `--iv-hotspot-stroke-dasharray` | `none` | Dashed hotspot outlines, e.g. `6 4`. |
| `--iv-hotspot-label-color` | `#fff` | Text of `label` hotspots. |
| `--iv-hotspot-label-background` | `rgb(0 0 0 / 0.6)` | Behind the text of `label` hotspots. |
| `--iv-hotspot-label-font-size` | `0.85em` | Text size of `label` hotspots. |

## Parts

Every element is exposed as a part:

```css
ivkit-player::part(question) {
  backdrop-filter: blur(6px);
}

ivkit-player::part(option) {
  border-radius: 8px;
  text-transform: uppercase;
}
```

| Part | Element |
| --- | --- |
| `stage` | Wrapper of everything inside the player. |
| `video` | Both stacked `<video>` elements. |
| `question`, `question-text`, `options`, `option` | Question overlay, its text, the options group and each option button. |
| `start`, `start-button` | Start screen and its Play button. |
| `end`, `replay-button` | End screen and its default Replay button. |
| `controls` | The control bar. |
| `control` | Every control button. Also `play-button`, `mute-button` and `fullscreen-button`. |
| `progress`, `time`, `volume` | Seek slider, time display and volume slider. |
| `hotspots` | Layer holding the hotspots. |
| `hotspot`, `hotspot-<variant>` | Each hotspot button. |
| `hotspot-shape`, `hotspot-label` | The SVG shape and the label inside each hotspot. |

## Hotspots

Each hotspot gets the parts `hotspot` and `hotspot-<variant>`, so you can create your own variants:

```ts
{ type: "hotspot", id: "coin", from: 4, label: "A coin", variant: "gold", area: { x: 0.4, y: 0.6, width: 0.08, height: 0.08 } }
```

```css
ivkit-player::part(hotspot-gold) {
  --iv-hotspot-fill: rgb(255 209 102 / 0.35);
  --iv-hotspot-stroke: #ffd166;
  --iv-hotspot-stroke-dasharray: 4 3;
}
```

Variant names are lowercased, and characters other than letters, digits and `-` become `-`.

## Slots

Replace the content of the start and end screens with slots:

```html
<ivkit-player controls>
  <span slot="start">▶ Watch the story</span>
  <div slot="end">
    <p>Thanks for watching!</p>
    <a href="/next">Next episode</a>
  </div>
</ivkit-player>
```

The `end` slot replaces the default Replay button. Call `player.restart()` from your own button to play again.

## Fullscreen

The control bar's fullscreen button, the `f` key and `player.toggleFullscreen()` put the **whole player** in fullscreen, so questions and hotspots come along.

On iPhone, where elements can't go fullscreen, the player covers the viewport instead and sets the `pseudo-fullscreen` attribute. Style that state with:

```css
ivkit-player[pseudo-fullscreen] {
  /* e.g. hide page chrome that would show through */
}
```
