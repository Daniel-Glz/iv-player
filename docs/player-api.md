[Documentation](README.md) · [Quick start](getting-started.md) · [Stories](stories.md) · [Player API](player-api.md) · [Validation](validation.md) · [Core & development](development.md)

---

# Player API

Import `@iv-player/player` in a bundler application to register `<iv-player>`, or import the standalone browser module. The element uses Shadow DOM and includes its own styles.

## Attributes

```html
<iv-player controls autoplay muted></iv-player>
```

| Attribute | Behavior |
| --- | --- |
| `controls` | Shows the control bar and enables keyboard shortcuts. |
| `autoplay` | Attempts playback when a story is assigned; set it before assigning the story. |
| `muted` | Mutes both video elements. |

Autoplay can be blocked by the browser. When that happens, the player displays the Play button. Boolean attributes are enabled by presence: omit `muted` to disable it, rather than writing `muted="false"`.

## Properties and methods

| Member | Purpose |
| --- | --- |
| `story: Story | null` | Assigning a story resets playback. Set `null` to clear it. |
| `engine` | Read-only access to the current `StoryEngine`, or `null`. |
| `renderHotspot` | Optional `(hotspot, button) => void` callback for new hotspot buttons. |
| `isFullscreen` | Read-only fullscreen state, including the viewport fallback. |
| `play()` | Start the story or resume playback. |
| `pause()` | Pause playback. |
| `restart()` | Play again from the start scene. |
| `toggleFullscreen()` | Enter or leave fullscreen for the whole player. |

Fullscreen includes overlays and hotspots. When element fullscreen is unavailable, the player fills the viewport instead and sets `pseudo-fullscreen`. Picture-in-picture is disabled because it would omit interactive overlays.

## Events

All events bubble and cross the Shadow DOM boundary. Read the payload through `event.detail`.

| Event | Detail | Trigger |
| --- | --- | --- |
| `iv-scene` | `{ sceneId, scene }` | A scene starts. |
| `iv-interaction` | `{ sceneId, question }` | A question appears. |
| `iv-answer` | `{ sceneId, question, choice }` | A choice is selected. |
| `iv-hotspot` | `{ sceneId, hotspot }` | A hotspot is activated. |
| `iv-end` | `{ sceneId }` | The story ends. |

```js
player.addEventListener('iv-answer', ({ detail }) => {
  console.log(detail.sceneId, detail.question.id, detail.choice.id);
});
```

## Keyboard controls

With `controls` enabled and focus inside the player:

| Key | Action |
| --- | --- |
| Space or K | Play / pause. |
| M | Toggle mute. |
| F | Toggle fullscreen. |
| Left / right arrows | Seek five seconds within the current scene. |
| Escape | Exit viewport fallback fullscreen. |

Focused sliders and buttons retain their native keyboard behavior. Seeking is disabled while a question is visible. Controls are hidden on the start, question, and end screens.

## Appearance

```css
iv-player {
  --iv-accent: #7c3aed;
  --iv-accent-contrast: #fff;
  --iv-radius: 12px;
  --iv-aspect-ratio: 16 / 9;
  --iv-hotspot-stroke: #facc15;
  --iv-hotspot-fill: rgb(250 204 21 / 0.15);
}

iv-player::part(question-text) { font-size: 1.5rem; }
iv-player::part(option) { border-radius: 8px; }
```

Other useful variables include `--iv-background`, `--iv-color`, `--iv-font`, `--iv-overlay-background`, `--iv-focus-ring`, and `--iv-controls-background`. See [the style source](../packages/player/src/styles.ts) for the complete list.

Exposed parts include `stage`, `video`, `hotspots`, `hotspot`, `hotspot-shape`, `hotspot-label`, `question`, `question-text`, `options`, `option`, `start`, `start-button`, `end`, `replay-button`, `controls`, `control`, `play-button`, `progress`, `time`, `mute-button`, `volume`, and `fullscreen-button`.

### Slots

```html
<iv-player controls>
  <span slot="start">Start the adventure</span>
  <div slot="end">Thanks for watching!</div>
</iv-player>
```

The `start` slot changes the Play button's content. The `end` slot replaces the default replay screen, including its button. Call `player.restart()` from your own button if you want replay.

### Custom hotspot content

```js
player.renderHotspot = (hotspot, button) => {
  button.title = `Explore: ${hotspot.label}`;
};
```

Set the callback before playback. It runs when a hotspot button is created; existing buttons are not immediately redrawn when the callback changes. The player still controls position and size. If you replace the default SVG, give your replacement content `pointer-events: auto` so it receives clicks.

**Next:** [Use the core engine →](development.md)
