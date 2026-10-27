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

## Methods

### `start(): void`

Enters the start scene. Calling it again restarts the story.

### `goTo(sceneId: SceneId): void`

Enters `sceneId` from any state, dismissing the question on screen, if any. Works before `start()` too, e.g. to resume a saved story. Throws if the scene doesn't exist.

### `update(currentTime: number): void`

Reports the playback time, in seconds, of the active scene's video. Call it on every frame or `timeupdate`. Ignored unless `state` is `playing`.

### `mediaEnded(): void`

Reports that the active scene's video reached its end. Asks any questions still pending, then moves to `next` or ends the story.

### `answer(choiceId: string): boolean`

Answers the active question. Returns `false`, and does nothing, if no question is active or the option doesn't exist.

### `activate(hotspotId: string): boolean`

Activates a visible hotspot, branching if it has a `goto`. Returns `false`, and does nothing, if no such hotspot is on screen.

### `on(event, listener): () => void`

Subscribes to an event. Returns a function that unsubscribes.

### `off(event, listener): void`

Removes a listener added with `on`.

## Events

```ts
const off = engine.on("answer", ({ question, choice }) => { /* ... */ });
off();
```

| Event | Payload | What to do |
| --- | --- | --- |
| `scene` | `{ sceneId, scene }` | Load and play `scene.src` from the beginning. |
| `interaction` | `{ sceneId, question }` | Pause the video and show `question`. |
| `answer` | `{ sceneId, question, choice }` | Hide the question. Followed by `scene`, `resume` or `end`. |
| `resume` | `{ sceneId, time }` | The answer didn't branch: resume the current video from `time`. |
| `hotspots` | `{ sceneId, hotspots }` | Render exactly `hotspots`, possibly none. Only fires when the set changes. |
| `hotspot` | `{ sceneId, hotspot }` | The viewer activated `hotspot`. Followed by `scene` if it has a `goto`. |
| `end` | `{ sceneId }` | The story finished on `sceneId`. |

The payload types are available as `EngineEvents["scene"]`, `EngineEvents["answer"]`, and so on.

## Timing rules

- Each question fires once per visit to its scene, as soon as playback reaches its `at`. Re-entering a scene re-arms its questions.
- Seeking past several questions fires only the earliest. The rest follow after it's answered.
- Hotspots are visible while `from <= currentTime < to`, recomputed on every update, so seeking in either direction just works.
- Hotspots hide while a question is showing and when leaving the scene.
