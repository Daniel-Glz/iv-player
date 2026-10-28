---
description: "Reference for the IVKit story format: Story, Scene, Question, Choice, Hotspot, Cue, keyframes, areas, points and data."
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
| `vars?` | `Record<string, VarValue>` | [Variables](#variables) and their initial values. Conditions and `set` can only use these. |
| `data?` | `Data` | Free-form JSON for apps and plugins. See [Data](#data). |

`SceneId` is a `string`.

## `Scene`

| Field | Type | Description |
| --- | --- | --- |
| `src` | `string` | URL of the scene's video. |
| `events?` | `SceneEvent[]` | Questions, hotspots and cues, in any order. |
| `next?` | `SceneId` | Scene to play when the video ends without branching. Without it, the story ends. |
| `branches?` | `Branch[]` | Checked before `next` when the video ends. The first that holds is played instead. |
| `set?` | `VarChanges` | Changes variables each time the scene is entered. |
| `data?` | `Data` | Free-form JSON for apps and plugins. See [Data](#data). |

`SceneEvent` is `Question | Hotspot | Cue`, discriminated by `type`.

## `Question`

Pauses the video at `at` and asks the viewer to pick one of `options`, or several with `multiple`.

| Field | Type | Description |
| --- | --- | --- |
| `type` | `"question"` | |
| `id` | `string` | Unique within the story. |
| `at` | `number` | Second at which the video pauses and the question shows. |
| `text` | `string` | Prompt shown to the viewer. |
| `options` | `Choice[]` | At least one. |
| `multiple?` | `boolean` | Lets the viewer pick several options and confirm. Its options can't have `goto`, `branches` or `seek`: the question's decide. Default `false`. |
| `min?` | `number` | Fewest options a `multiple` answer takes, a whole number from 1 to the number of options. Default 1. If fewer options are offered because of their `if`, all of them are enough. |
| `max?` | `number` | Most options a `multiple` answer takes, from `min` to the number of options. Default: all of them. |
| `goto?` | `SceneId` | Scene to branch to when the picked option doesn't branch or seek. |
| `branches?` | `Branch[]` | Checked before `goto`, after the options' `set`. The first that holds is branched to instead. |
| `seek?` | `number` | Second of the current scene to resume from when nothing branches. |
| `timeout?` | `number` | Seconds the question waits for an answer, greater than 0. They count in real time, since the video is paused. Then it answers with `default`, or else the question's `branches`, `goto` and `seek` decide, or else the scene resumes. |
| `default?` | `string \| string[]` | Option picked when `timeout` runs out. A list for a `multiple` question, within its `min` and `max`. If it isn't offered because of its `if`, the question decides as if there were no `default`. |
| `data?` | `Data` | Free-form JSON for apps and plugins. See [Data](#data). |

### `Choice`

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique within its question. |
| `label` | `string` | Text shown to the viewer. |
| `goto?` | `SceneId` | Scene to branch to. Without it, the question's `goto` applies, if any, or else the current scene resumes. |
| `branches?` | `Branch[]` | Checked before `goto`, after `set`. The first that holds is branched to instead. |
| `set?` | `VarChanges` | Changes variables when the option is picked. In a `multiple` answer, each picked option's `set` applies in option order. |
| `if?` | `Conditions` | Offers the option only while this holds. A question with no options left is skipped. |
| `correct?` | `boolean` | Marks a right answer of a quiz. The `answer` event reports whether exactly the right options were picked: score it with `set`. |
| `seek?` | `number` | Second of the current scene to resume from when the option doesn't branch. Questions from there on are asked again. |
| `data?` | `Data` | Free-form JSON for apps and plugins. See [Data](#data). |

## `Hotspot`

A clickable area shown between `from` and `to`. It doesn't pause playback unless `pause` is set.

| Field | Type | Description |
| --- | --- | --- |
| `type` | `"hotspot"` | |
| `id` | `string` | Unique within the story. |
| `from` | `number` | Second at which it appears. |
| `to?` | `number` | Second at which it disappears. Without it, it lasts until the scene ends. |
| `label` | `string` | Accessible name of the area. |
| `goto?` | `SceneId` | Scene to branch to when activated. Without it, activation is only reported. |
| `branches?` | `Branch[]` | Checked before `goto`, after `set`. The first that holds is branched to instead. |
| `set?` | `VarChanges` | Changes variables when the hotspot is activated. |
| `if?` | `Conditions` | Shows the hotspot only while this holds. |
| `seek?` | `number` | Second of the current scene to jump to when the hotspot doesn't branch. Questions from there on are asked again. |
| `href?` | `string` | Link the player opens in a new tab when the hotspot is activated. Only `http:` and `https:` URLs open. |
| `pause?` | `boolean` | Pauses the video at `from`, once per visit, until the hotspot is activated or the viewer resumes. Default `false`. |
| `shape?` | `HotspotShape` | `"rect"` (default), `"ellipse"` or `"polygon"`. |
| `area?` | `Area` | Bounds of a static `rect` or `ellipse`. |
| `points?` | `Point[]` | Vertices of a static `polygon`. |
| `keyframes?` | `HotspotKeyframe[]` | Animated geometry. Takes precedence over `area` and `points`. |
| `variant?` | `string` | How the player draws it: `"outline"` (default), `"pulse"`, `"label"`, `"hidden"`, or a custom name. |
| `data?` | `Data` | Free-form JSON for apps and plugins. See [Data](#data). |

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

## `Cue`

Marks a span of the scene for plugins and apps, such as a chapter, a subtitle or a moment to track. IVKit does nothing else with it: it doesn't pause, and the player draws nothing. The engine reports the active cues in its `cues` event, and plugins pick theirs by `kind`.

| Field | Type | Description |
| --- | --- | --- |
| `type` | `"cue"` | |
| `id` | `string` | Unique within the story. |
| `kind` | `string` | What the cue is for, e.g. `"chapter"`. |
| `from` | `number` | Second at which it becomes active. |
| `to?` | `number` | Second at which it stops being active. Without it, it lasts until the scene ends. |
| `if?` | `Conditions` | Makes it active only while this holds. |
| `data?` | `Data` | Free-form JSON for apps and plugins. See [Data](#data). |

```json
{ "type": "cue", "id": "intro", "kind": "chapter", "from": 0, "to": 12, "data": { "title": "Introduction" } }
```

## Data

The story, scenes, questions, options, hotspots and cues take a `data` field: a JSON object for apps and plugins, such as a chapter title, tags or analytics names. Events carry it along with the object it's on, but IVKit never reads it, and `validateStory` only checks that it's JSON: `null`, booleans, strings, finite numbers, and arrays and objects of them.

```ts
type Data = Readonly<Record<string, unknown>>;
```

Unknown fields are allowed too, but `data` is the place for them: future versions of the format won't add fields inside it.

## Variables

```ts
type VarValue = number | string | boolean;
```

Variables are declared in `Story.vars` with their initial value, and reset when the story starts again.

### `VarChanges`

```ts
type VarChanges = Record<string, VarValue | { add: number }>;
```

A new value for each variable, or `{ add }` to add to a number. Use a negative `add` to subtract. Only numeric variables can be added to.

### `Condition`

| Field | Type | Description |
| --- | --- | --- |
| `var` | `string` | Variable to test. |
| `eq?` | `VarValue` | Equal to. |
| `ne?` | `VarValue` | Not equal to. |
| `gt?`, `gte?` | `number` | Greater than, greater than or equal to. |
| `lt?`, `lte?` | `number` | Less than, less than or equal to. |

Every operator given must hold, so `{ "var": "score", "gte": 1, "lt": 3 }` is a range. A condition needs at least one operator.

`Conditions` is a `Condition` or a list of them, which must all hold.

### `Branch`

| Field | Type | Description |
| --- | --- | --- |
| `if` | `Conditions` | When to take the branch. |
| `goto` | `SceneId` | Scene to branch to. |

In a list of branches, the first that holds wins. For "or", add one branch for each case.

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
