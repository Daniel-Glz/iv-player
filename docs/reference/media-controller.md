---
description: "Reference for MediaController: scene swaps without a black frame, preloading, frame-accurate timing and the MediaElement interface."
---

# `MediaController`

```ts
import { MediaController } from "@ivkit/core";
```

Plays a [`StoryEngine`](/reference/engine) on two stacked media elements, preloading the next scene and swapping without a black frame.

- The visible ("front") element plays the current scene, while the hidden ("back") one preloads the most likely next scene: the scene's first branch or `next`, or else the first branch or `goto` of its questions, options and hotspots. While a question shows, it preloads the first option that branches.
- On a scene change, the front element pauses on its last frame and stays visible until the back one can draw its first frame. Only then are they swapped.
- Playback time reaches the engine through `requestVideoFrameCallback`, once per presented frame with its exact media time. `timeupdate` takes over whenever frames stop arriving, for example in background tabs.
- On each question, it pauses on the question's exact frame. On `resume`, it plays again.
- On each `pause` from a hotspot, it pauses on the hotspot's `from` frame, preloading its `goto`, if any. Activating that hotspot without a `goto` plays again.

## Constructor

```ts
new MediaController<M extends MediaElement>(engine: StoryEngine, media: readonly [M, M])
```

Create it **before** calling `engine.start()`, so it sees the first `scene` event.

## Properties and methods

| Member | Description |
| --- | --- |
| `active: M` | Read-only. The element currently on top. |
| `play(): void` | Plays the active element, e.g. after a `blocked` event or a user pause. Does nothing while the next scene loads, since the active element only holds the previous scene's last frame, or unless the engine's `state` is `playing`. |
| `retry(): void` | Loads the scene of the last `error` again, from the second it failed at. |
| `pause(): void` | Pauses the active element. |
| `preload(sceneId): void` | Starts buffering a scene in the hidden element, replacing any previous preload. The controller already preloads on its own; call this for stronger hints, such as when the viewer hovers an option. |
| `destroy(): void` | Detaches from the engine and the media elements. Its own listeners stay subscribed. |
| `on(event, listener): () => void` | Subscribes to an event. Returns a function that unsubscribes. |
| `off(event, listener): void` | Removes a listener added with `on`. |

## Events

| Event | Payload | What to do |
| --- | --- | --- |
| `swap` | `{ active, inactive }` | Put `active` on top and hide `inactive`. The first swap reveals the first scene. |
| `blocked` | `{ media, error }` | `play()` was rejected by the autoplay policy (a `NotAllowedError`). Ask for a user gesture, then call `play()`. |
| `error` | `{ media, sceneId, error }` | The scene's video couldn't be loaded or played, e.g. it's missing or in a format the browser can't play. `error` is the element's, a `MediaError` for a `<video>`. The previous frame stays on screen. Tell the viewer, then call `retry()`, or go elsewhere with `engine.goTo()`. A failed preload isn't reported: it's loaded again when its scene comes. |
| `time` | `{ media, time }` | The active element reached `time`, just reported to the engine: once per presented frame, or on `timeupdate` while frames don't arrive. Use it to sync anything drawn over the video, like animated hotspots. |

Showing and hiding the elements is left to you, so core stays free of the DOM. Hide the inactive element with `opacity: 0` rather than `display: none`, so it keeps decoding its first frame.

## `MediaElement`

The controller only uses a subset of `HTMLMediaElement`, so an `HTMLVideoElement` works as-is, and you can also pass your own implementation, for example to test or to wrap another player:

```ts
interface MediaElement {
  src: string;
  preload: string;
  currentTime: number;
  readonly readyState: number;
  readonly seeking: boolean;
  readonly error?: unknown;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  requestVideoFrameCallback?(callback: VideoFrameCallback): number;
  cancelVideoFrameCallback?(handle: number): void;
}
```

The controller listens to `timeupdate`, `ended`, `error` and the events that tell it a frame can be drawn. `requestVideoFrameCallback` is optional: without it, the controller relies on `timeupdate`, which fires about 4 times per second.
