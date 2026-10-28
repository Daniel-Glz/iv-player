---
description: "Reference for StoryEngine: states, properties, methods, events and the timing rules for questions and hotspots."
---

# `StoryEngine`

```ts
import { StoryEngine } from "@ivkit/core";
```

Drives a story from playback time alone. It never touches media or the DOM. You feed it the playback time, react to its events, and report the viewer's actions.

## Constructor

```ts
new StoryEngine(story: Story)
```

Throws if `story.start` isn't a scene of the story. Otherwise, the story is trusted as-is: a reference to a missing scene throws when it's reached. Use [`validateStory`](/guide/validation) for untrusted input.

## State

```ts
type EngineState = "idle" | "playing" | "interacting" | "ended";
```

| State | Meaning |
| --- | --- |
| `idle` | Created, `start()` not called yet. |
| `playing` | A scene is active and its video should be playing. |
| `interacting` | A question is showing, and the video should stay paused. |
| `ended` | The story finished. |

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `story` | `Story` | Read-only. The story passed to the constructor. |
| `state` | `EngineState` | Read-only. |
| `currentSceneId` | `SceneId \| null` | Read-only. `null` before `start()`. |
| `activeQuestion` | `Question \| null` | Read-only. The question waiting for an answer. |
| `visibleHotspots` | `readonly Hotspot[]` | Read-only. Hotspots currently on screen. |
| `activeCues` | `readonly Cue[]` | Read-only. [Cues](/reference/story-format#cue) currently active. |
| `vars` | `Readonly<Vars>` | Read-only. Current values of the story's [variables](/reference/story-format#variables). |

## Methods

### `start(): void`

Enters the start scene with the initial variables. Calling it again restarts the story.

### `goTo(sceneId: SceneId, time?: number): void`

Enters `sceneId` from any state, dismissing the question on screen, if any, and plays it from `time` seconds (default 0). Only the scene's questions at or after `time` are asked. Works before `start()` too, e.g. to resume a saved story. Throws if the scene doesn't exist.

### `seek(time: number): boolean`

Resumes the current scene from `time` seconds, as a `seek` in the story does: it emits `resume`, and the questions at or after `time` are asked again. Returns `false`, and does nothing, unless `state` is `playing`.

### `pauseTimeout(): void`

Stops counting the `timeout` of the question on screen, e.g. while the player is off the page. Does nothing if there's no timed question.

### `resumeTimeout(): void`

Goes on counting a timeout stopped with `pauseTimeout()`, with the time it had left.

### `destroy(): void`

Cancels the question's timeout and removes every listener. Call it when you stop using the engine, e.g. before replacing it with another story's.

### `setVar(name: string, value: VarValue): void`

Sets the variable `name` and emits `vars`. Conditions see the new value from then on. Use it to restore a saved story before `goTo()`.

### `update(currentTime: number): void`

Reports the playback time, in seconds, of the active scene's video. Call it on every frame or `timeupdate`. Ignored unless `state` is `playing`.

### `mediaEnded(): void`

Reports that the active scene's video reached its end. Asks any questions still pending, then moves to the first of the scene's `branches` that holds, or to `next`, or ends the story.

### `answer(choiceIds: string | string[]): boolean`

Answers the active question, applying each picked option's `set` in option order. Then it branches or seeks as the option says, or else as the question says, or else resumes where the question paused. A `multiple` question takes a list of ids, within its `min` and `max`; any other question takes one id, alone or in a list. Returns `false`, and does nothing, if no question is active, an option doesn't exist, repeats or isn't offered because its `if` doesn't hold, or the number of options is out of bounds.

### `activate(hotspotId: string): boolean`

Activates a visible hotspot, applying its `set` and branching to the first of its `branches` that holds, or to its `goto`. Without a branch, a `seek` resumes the scene from there. Returns `false`, and does nothing, if no such hotspot is on screen.

### `on(event, listener): () => void`

Subscribes to an event. Returns a function that unsubscribes.

### `off(event, listener): void`

Removes a listener added with `on`.

## Events

```ts
const off = engine.on("answer", ({ question, choices, correct }) => { /* ... */ });
off();
```

| Event | Payload | What to do |
| --- | --- | --- |
| `scene` | `{ sceneId, scene, time }` | Load and play `scene.src` from `time`, which is 0 unless `goTo()` gave one. |
| `interaction` | `{ sceneId, question, options }` | Pause the video and show `question` with `options`, the ones whose `if` holds. |
| `answer` | `{ sceneId, question, choice, choices, correct, goto }` | Hide the question. `choices` are the picked options in option order, and `choice` is the first of them. `correct` is whether exactly the options marked `correct` were picked, or `undefined` if no offered option has `correct`. `goto` is the scene it branches to, if any. Followed by `scene`, `resume` or `end`. |
| `timeout` | `{ sceneId, question }` | Nobody answered within the question's `timeout`. Hide the question. Followed by `answer` with its `default`, or else by `scene`, `resume` or `end` as the question decides. |
| `resume` | `{ sceneId, time }` | The answer or hotspot didn't branch: resume the current video from `time`. That's the question's `at`, or the `seek` of the option, question or hotspot. |
| `hotspots` | `{ sceneId, hotspots }` | Render exactly `hotspots`, possibly none. Only fires when the set changes. |
| `cues` | `{ sceneId, cues }` | The active cues changed: `cues` are exactly the active ones, possibly none. Only fires when the set changes. |
| `pause` | `{ sceneId, hotspot }` | A hotspot with `pause` appeared: pause the video at `hotspot.from`. |
| `hotspot` | `{ sceneId, hotspot, goto }` | The viewer activated `hotspot`. `goto` is the scene it branches to, if any. Followed by `scene` if it branches, or `resume` if it has a `seek`. If neither, resume playback if it has `pause`. |
| `vars` | `{ vars }` | Variables changed, through `set` or `setVar()`. Emitted before the `answer`, `hotspot` or `scene` event that caused it. |
| `end` | `{ sceneId }` | The story finished on `sceneId`. |

The payload types are available as `EngineEvents["scene"]`, `EngineEvents["answer"]`, and so on.

## Timing rules

- Each question fires once per visit to its scene, as soon as playback reaches its `at`. Re-entering a scene re-arms its questions; `goTo()` with a time re-arms only those at or after it.
- Seeking past several questions fires only the earliest. The rest follow after it's answered.
- Hotspots are visible while `from <= currentTime < to`, recomputed on every update, so they stay correct after seeking in either direction.
- Hotspots hide while a question is showing and when leaving the scene.
- Cues are active while `from <= currentTime < to`, like hotspots, and their `if` is checked on every update too. Unlike hotspots, they stay active while a question is showing. They clear when leaving the scene and when the story ends.
- A hotspot with `pause` emits `pause` the first time it shows in each visit, not when a seek skips it entirely. The engine stays `playing`, so the hotspot can be activated.
- A question's `timeout` counts in real time with `setTimeout`, not with `update()`, because the video stays paused. Answering, `goTo()`, `start()` and `destroy()` cancel it, `pauseTimeout()` stops it, and the count starts over every time the question is asked.
- A `seek`, in the story or through `seek()`, re-arms the questions at or after it, and the pausing hotspots from it on, so they happen again. Questions before it don't.
- A hotspot's `if` is checked on every update, so it appears or hides as soon as variables change. An option's `if` is checked when its question shows, and a question with no options left is skipped.
