[Documentation](README.md) · [Quick start](getting-started.md) · [Stories](stories.md) · [Player API](player-api.md) · [Validation](validation.md) · [Core & development](development.md)

---

# Stories and interactions

A story is a plain JavaScript object. It can also be stored as JSON and loaded with `fetch()`. All times are in **seconds from the start of the current clip**.

## Story and scene fields

| Field | Required | Meaning |
| --- | --- | --- |
| `version` | Yes | Format label, for example `'0.1'`. |
| `start` | Yes | ID of the first scene. |
| `scenes` | Yes | Object keyed by scene ID. |
| `scene.src` | Yes | Video URL. |
| `scene.events` | No | Array of questions and hotspots. |
| `scene.next` | No | Scene to start when the clip finishes. Without it, the story ends. |

A branch starts the target clip from the beginning. Loops are allowed. Event order in the array does not need to match timeline order.

```js
const story = {
  version: '0.1',
  start: 'intro',
  scenes: {
    intro: { src: '/videos/intro.mp4', next: 'ending' },
    ending: { src: '/videos/ending.mp4' },
  },
};
```

## Questions

Add this object to a scene's `events` array:

```js
{
  type: 'question',
  id: 'learn-more',
  at: 5,
  text: 'Would you like more detail?',
  options: [
    { id: 'yes', label: 'Show me', goto: 'details' },
    { id: 'no', label: 'Keep watching' },
  ],
}
```

Add a `details` scene when using this example. An option with `goto` branches; an option without it resumes the current clip. Questions pause playback until an answer is selected.

Give each event a unique ID across the story and each option a unique ID within its question. A question runs once per visit to its scene. Re-entering the scene enables its questions again. Seeking past questions triggers the earliest pending question first; remaining questions follow as playback advances. Questions still pending when a clip ends are asked before leaving the scene.

## Hotspots

Hotspots are clickable areas that do not pause playback. They appear while `from <= time < to`. Without `to`, they last until the scene ends. They are hidden while a question is showing.

```js
{
  type: 'hotspot',
  id: 'door',
  from: 2,
  to: 8,
  label: 'Open the door',
  goto: 'hallway',
  shape: 'rect',
  area: { x: 0.6, y: 0.2, width: 0.2, height: 0.5 },
  variant: 'pulse',
}
```

Create a `hallway` scene for this example. Omit `goto` to report activation through `iv-hotspot` without changing scenes.

### Geometry

Coordinates are fractions from **0 to 1**, relative to the video picture's top-left corner. For example, `x: 0.6` means 60% across. Letterboxing is excluded from the coordinate space.

| Shape | Geometry |
| --- | --- |
| `'rect'` (default) | `area: { x, y, width, height }` |
| `'ellipse'` | The same `area` describes its bounding rectangle. |
| `'polygon'` | `points: [[x, y], ...]`, with at least three vertices. |

### Appearance

| Variant | Result |
| --- | --- |
| `'outline'` (default) | Outlined shape. |
| `'pulse'` | Animated emphasis; respects reduced-motion preferences. |
| `'label'` | Shows the hotspot's label. |
| `'hidden'` | Invisible but still clickable. |
| Custom string | Style it with `::part(hotspot-your-variant)`. |

Always provide a descriptive `label`; it is also the button's accessible name.

### Animation

Add `keyframes` to move or resize a hotspot:

```js
keyframes: [
  { at: 2, area: { x: 0.1, y: 0.2, width: 0.2, height: 0.3 }, easing: 'ease-in-out' },
  { at: 6, area: { x: 0.6, y: 0.2, width: 0.2, height: 0.3 } },
]
```

Each keyframe can specify `shape`, `area`, `points`, and `easing`. Omitted geometry fields fall back to the hotspot's fields, **not the previous keyframe**. Keyframes override static geometry; before the first and after the last, the geometry holds still.

Easing options are `'linear'` (default), `'ease-in-out'`, and `'step'`. Easing applies to the transition from that keyframe to the next. Boxes interpolate into boxes; polygons interpolate when they have the same number of vertices. Other shape changes switch at the next keyframe.

**Next:** [Validate your story →](validation.md)
