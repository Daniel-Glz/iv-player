---
description: "Reference for the IVKit story format: Story, Scene, Question, Choice, Hotspot, keyframes, areas and points."
---

# Story format

All types are exported from `@ivkit/core`:

```ts
import type { Story, Scene, Question, Hotspot } from "@ivkit/core";
```

All times are in seconds, relative to the start of the scene's video. All coordinates are fractions (0–1) of the video picture, from its top-left corner.

## `Story`

| Field | Type | Description |
| --- | --- | --- |
| `version` | `string` | Format version, e.g. `"0.1"`. |
| `start` | `SceneId` | Scene the story starts at. Must be a key of `scenes`. |
| `scenes` | `Record<SceneId, Scene>` | Every scene, keyed by id. |

`SceneId` is a `string`.

## `Scene`

| Field | Type | Description |
| --- | --- | --- |
| `src` | `string` | URL of the scene's video. |
| `events?` | `SceneEvent[]` | Questions and hotspots, in any order. |
| `next?` | `SceneId` | Scene to play when the video ends without branching. Without it, the story ends. |

`SceneEvent` is `Question | Hotspot`, discriminated by `type`.

## `Question`

Pauses the video at `at` and asks the viewer to pick one of `options`.

| Field | Type | Description |
| --- | --- | --- |
| `type` | `"question"` | |
| `id` | `string` | Unique within the story. |
| `at` | `number` | Second at which the video pauses and the question shows. |
| `text` | `string` | Prompt shown to the viewer. |
| `options` | `Choice[]` | At least one. |

### `Choice`

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique within its question. |
| `label` | `string` | Text shown to the viewer. |
| `goto?` | `SceneId` | Scene to branch to. Without it, the current scene resumes. |

## `Hotspot`

A clickable area shown between `from` and `to`. It doesn't pause playback.

| Field | Type | Description |
| --- | --- | --- |
| `type` | `"hotspot"` | |
| `id` | `string` | Unique within the story. |
| `from` | `number` | Second at which it appears. |
| `to?` | `number` | Second at which it disappears. Without it, it lasts until the scene ends. |
| `label` | `string` | Accessible name of the area. |
| `goto?` | `SceneId` | Scene to branch to when activated. Without it, activation is only reported. |
| `shape?` | `HotspotShape` | `"rect"` (default), `"ellipse"` or `"polygon"`. |
| `area?` | `Area` | Bounds of a static `rect` or `ellipse`. |
| `points?` | `Point[]` | Vertices of a static `polygon`. |
| `keyframes?` | `HotspotKeyframe[]` | Animated geometry. Takes precedence over `area` and `points`. |
| `variant?` | `string` | How the player draws it: `"outline"` (default), `"pulse"`, `"label"`, `"hidden"`, or a custom name. |

### `HotspotKeyframe`

| Field | Type | Description |
| --- | --- | --- |
| `at` | `number` | Second of the scene. |
| `shape?` | `HotspotShape` | Falls back to the hotspot's `shape`. |
| `area?` | `Area` | Falls back to the hotspot's `area`. |
| `points?` | `Point[]` | Falls back to the hotspot's `points`. |
| `easing?` | `Easing` | Transition to the next keyframe: `"linear"` (default), `"ease-in-out"` or `"step"`. |

### `Area`

```ts
interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

A rectangle from its top-left corner, relative to the picture, not the `<video>` element.

### `Point`

```ts
type Point = readonly [x: number, y: number];
```

## JSON example

```json
{
  "version": "0.1",
  "start": "intro",
  "scenes": {
    "intro": {
      "src": "https://example.com/intro.mp4",
      "next": "outro",
      "events": [
        {
          "type": "hotspot",
          "id": "logo",
          "from": 1,
          "to": 5,
          "label": "Visit our site",
          "shape": "ellipse",
          "variant": "pulse",
          "area": { "x": 0.05, "y": 0.05, "width": 0.15, "height": 0.15 }
        },
        {
          "type": "question",
          "id": "continue",
          "at": 6,
          "text": "Ready for more?",
          "options": [
            { "id": "yes", "label": "Yes!" },
            { "id": "skip", "label": "Skip to the end", "goto": "outro" }
          ]
        }
      ]
    },
    "outro": { "src": "https://example.com/outro.mp4" }
  }
}
```
