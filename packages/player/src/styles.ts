/**
 * Default look. Everything themable goes through `--iv-*` custom properties;
 * for deeper changes, every element is exposed via `::part()`.
 */
export const styles = /* css */ `
:host {
  display: block;
  position: relative;
  overflow: hidden;
  container-type: inline-size;
  aspect-ratio: var(--iv-aspect-ratio, 16 / 9);
  border-radius: var(--iv-radius, 0);
  background: var(--iv-background, #000);
  color: var(--iv-color, #fff);
  font: var(--iv-font, 500 1rem/1.4 system-ui, sans-serif);
}

/* Real fullscreen of the whole player, so overlays and hotspots come along. */
:host(:fullscreen) {
  aspect-ratio: auto;
  width: 100%;
  height: 100%;
  border-radius: 0;
}

/* Fallback where elements can't go fullscreen (iPhone): cover the viewport. */
:host([pseudo-fullscreen]) {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  aspect-ratio: auto;
  border-radius: 0;
}

[hidden] {
  display: none !important;
}

.stage {
  position: absolute;
  inset: 0;
}

/* Both videos stay rendered (just transparent) so the hidden one keeps decoding its first frame. */
video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
}

video.front {
  opacity: 1;
  z-index: 1;
}

.hotspots {
  position: absolute;
  z-index: 2;
}

.hotspots button {
  position: absolute;
  padding: 0;
  border: var(--iv-hotspot-border, 2px solid rgb(255 255 255 / 0.8));
  border-radius: var(--iv-hotspot-radius, 8px);
  background: var(--iv-hotspot-background, rgb(255 255 255 / 0.12));
  cursor: pointer;
}

.hotspots button:hover,
.hotspots button:focus-visible {
  background: var(--iv-hotspot-background-hover, rgb(255 255 255 / 0.28));
}

.overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1em;
  padding: 1em;
  background: var(--iv-overlay-background, rgb(0 0 0 / 0.55));
  text-align: center;
}

.question-text {
  margin: 0;
  font-size: var(--iv-question-font-size, 1.25em);
}

.options {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75em;
}

.overlay button {
  font: inherit;
  padding: 0.6em 1.4em;
  border: 0;
  border-radius: var(--iv-button-radius, 999px);
  background: var(--iv-accent, #fff);
  color: var(--iv-accent-contrast, #111);
  cursor: pointer;
}

.overlay button:hover {
  filter: brightness(0.9);
}

button:focus-visible,
input:focus-visible {
  outline: 3px solid var(--iv-focus-ring, #4c9ffe);
  outline-offset: 2px;
}

.controls {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 1.5em 0.75em 0.5em;
  background: var(--iv-controls-background, linear-gradient(transparent, rgb(0 0 0 / 0.7)));
  transition: opacity 0.2s;
}

.controls button {
  display: grid;
  place-items: center;
  flex: none;
  width: 2.25em;
  height: 2.25em;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: none;
  color: inherit;
  cursor: pointer;
}

.controls svg {
  width: 1.4em;
  height: 1.4em;
}

.controls input {
  margin: 0;
  accent-color: var(--iv-accent, #fff);
  cursor: pointer;
}

.progress {
  flex: 1;
  min-width: 0;
}

.volume {
  flex: none;
  width: 5em;
}

.time {
  flex: none;
  font-size: 0.85em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.stage.idle {
  cursor: none;
}

.stage.idle .controls {
  opacity: 0;
  pointer-events: none;
}

@container (max-width: 480px) {
  .volume,
  .time {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .controls {
    transition: none;
  }
}
`;
