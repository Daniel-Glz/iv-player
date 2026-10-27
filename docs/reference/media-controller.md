---
description: "Reference for MediaController: seamless scene swaps, preloading, frame-accurate timing and the MediaElement interface."
---

# `MediaController`

```ts
import { MediaController } from "@iv-player/core";
```

Plays a [`StoryEngine`](/reference/engine) on two stacked media elements, with preloading and seamless scene changes.

- The visible ("front") element plays the current scene, while the hidden ("back") one preloads the most likely next scene: the scene's `next`, or else the first `goto` of its questions and hotspots. While a question shows, it preloads the first option that branches.
- On a scene change, the front element pauses on its last frame and stays visible until the back one can draw its first frame. Only then are they swapped.
- Playback time reaches the engine through `requestVideoFrameCallback`, once per presented frame with its exact media time. `timeupdate` takes over whenever frames stop arriving, for example in background tabs.
- On each question, it pauses on the question's exact frame. On `resume`, it plays again.

## Constructor

```ts
new MediaController<M extends MediaElement>(engine: StoryEngine, media: readonly [M, M])
```

Create it **before** calling `engine.start()`, so it sees the first `scene` event.

## Properties and methods

| Member | Description |
| --- | --- |
| `active: M` | Read-only. The element currently on top. |
| `play(): void` | Plays the active element, e.g. after a `blocked` event or a user pause. |
| `pause(): void` | Pauses the active element. |
| `preload(sceneId): void` | Starts buffering a scene in the hidden element, replacing any previous preload. The controller already preloads on its own; call this for stronger hints, such as when the viewer hovers an option. |
| `destroy(): void` | Detaches from the engine and the media elements. |
| `on(event, listener): () => void` | Subscribes to an event. Returns a function that unsubscribes. |

## Events

| Event | Payload | What to do |
| --- | --- | --- |
| `swap` | `{ active, inactive }` | Put `active` on top and hide `inactive`. The first swap reveals the first scene. |
| `blocked` | `{ media, error }` | `play()` was rejected, typically by the autoplay policy. Ask for a user gesture, then call `play()`. |

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
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  requestVideoFrameCallback?(callback: VideoFrameCallback): number;
  cancelVideoFrameCallback?(handle: number): void;
}
```

The controller listens to `timeupdate`, `ended` and the events that tell it a frame can be drawn. `requestVideoFrameCallback` is optional: without it, the controller relies on `timeupdate`, which fires about 4 times per second.
