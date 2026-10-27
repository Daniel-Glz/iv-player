---
description: "Live example: restyling the whole <ivkit-player> with custom properties, ::part() and slots."
---

<script setup>
import { adventure } from "./stories/adventure";
</script>

# Custom theme

The same story as the [branching example](./branching), restyled with CSS only: custom properties for colors and fonts, `::part()` for the question layout, and slots for the start and end screens.

<div class="sunset">
  <PlayerDemo :story="adventure">
    <span slot="start">☀︎ Begin the journey</span>
    <div slot="end" class="sunset-end">
      <strong>The end</strong>
      <span>Thanks for playing.</span>
    </div>
  </PlayerDemo>
</div>

## CSS

```css
.sunset ivkit-player {
  --iv-radius: 20px;
  --iv-font: 600 1rem/1.4 Georgia, serif;
  --iv-accent: #ffb86b;
  --iv-accent-contrast: #3b1f0e;
  --iv-overlay-background: linear-gradient(160deg, rgb(200 90 60 / 0.85), rgb(50 15 60 / 0.95));
  --iv-controls-background: linear-gradient(transparent, rgb(60 20 70 / 0.8));
  --iv-focus-ring: #ffe0b3;
  --iv-question-font-size: 1.6em;
  --iv-button-radius: 10px;
}

/* Options as large cards, with more room between them. */
.sunset ivkit-player::part(options) {
  gap: 16px;
}

.sunset ivkit-player::part(option) {
  min-width: 10em;
  padding: 1em 1.4em;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.3);
}

.sunset ivkit-player::part(question-text) {
  font-style: italic;
}
```

## HTML

```html
<ivkit-player controls>
  <span slot="start">☀︎ Begin the journey</span>
  <div slot="end">
    <strong>The end</strong>
    <span>Thanks for playing.</span>
  </div>
</ivkit-player>
```

The `end` slot replaces the default Replay button. Add your own button that calls `player.restart()` to keep that option.

See [Styling the player](/guide/styling) for every custom property and part.

<style>
.sunset ivkit-player {
  --iv-radius: 20px;
  --iv-font: 600 1rem/1.4 Georgia, serif;
  --iv-accent: #ffb86b;
  --iv-accent-contrast: #3b1f0e;
  --iv-overlay-background: linear-gradient(160deg, rgb(200 90 60 / 0.85), rgb(50 15 60 / 0.95));
  --iv-controls-background: linear-gradient(transparent, rgb(60 20 70 / 0.8));
  --iv-focus-ring: #ffe0b3;
  --iv-question-font-size: 1.6em;
  --iv-button-radius: 10px;
}

.sunset ivkit-player::part(options) {
  gap: 16px;
}

.sunset ivkit-player::part(option) {
  min-width: 10em;
  padding: 1em 1.4em;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.3);
}

.sunset ivkit-player::part(question-text) {
  font-style: italic;
}

.sunset-end {
  display: grid;
  gap: 4px;
  text-align: center;
  font-family: Georgia, serif;
}

.sunset-end strong {
  font-size: 2em;
}
</style>
