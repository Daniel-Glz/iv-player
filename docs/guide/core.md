---
description: "Build your own interactive video player in any framework with StoryEngine and MediaController from @ivkit/core."
---

# Custom players with core

You don't need `<ivkit-player>` to use IVKit. The player is built on `@ivkit/core`, and you can build your own interface the same way: in React, on a canvas, in a game engine, or anywhere else. Stories, [validation](/guide/validation) and hotspot geometry work exactly as they do with the player.

```sh
pnpm add @ivkit/core
```

Core has three pieces:

- **[`StoryEngine`](/reference/engine)** decides what happens, based only on playback time. It never touches media or the DOM.
- **[`MediaController`](/reference/media-controller)** connects the engine to two video elements, with preloading and seamless swaps.
- **[Utilities](/reference/utilities)** compute where to draw hotspots at a given time.

## The engine on its own

The engine is a state machine. You tell it the playback time, it tells you what to show, and you report what the viewer does:

```ts
import { StoryEngine } from "@ivkit/core";

const engine = new StoryEngine(story);

engine.on("scene", ({ scene }) => {
  video.src = scene.src;
  video.play();
});
engine.on("interaction", ({ question }) => {
  video.pause();
  showQuestion(question); // calls engine.answer(choice.id) on click
});
engine.on("resume", ({ time }) => {
  video.currentTime = time;
  video.play();
});
engine.on("hotspots", ({ hotspots }) => renderHotspots(hotspots));
engine.on("end", () => showEndScreen());

video.addEventListener("timeupdate", () => engine.update(video.currentTime));
video.addEventListener("ended", () => engine.mediaEnded());

engine.start();
```

This works with a single `<video>`, but there's a short gap at each scene change while the new video loads.

## With the media controller

`MediaController` takes care of the video side: it plays scenes, preloads the next one in a second element, pauses on each question's exact frame, and resumes after answers. It feeds the engine once per presented frame with `requestVideoFrameCallback` when available.

You only show and hide the elements:

```ts
import { MediaController, StoryEngine } from "@ivkit/core";

const engine = new StoryEngine(story);
const front = document.querySelector<HTMLVideoElement>("#a")!;
const back = document.querySelector<HTMLVideoElement>("#b")!;

// Create the controller before starting the engine.
const controller = new MediaController(engine, [front, back]);

controller.on("swap", ({ active, inactive }) => {
  active.style.opacity = "1";
  inactive.style.opacity = "0";
});
controller.on("blocked", () => {
  // Autoplay was blocked: show a button that calls controller.play().
  playButton.hidden = false;
});

engine.on("interaction", ({ question }) => showQuestion(question));
engine.on("answer", () => hideQuestion());

engine.start();
```

Keep both videos rendered, stacked on top of each other, and switch them with `opacity` rather than `display: none`: browsers don't decode the first frame of a video that isn't rendered, which brings back the black frame.

## Drawing hotspots

The engine tells you which hotspots are visible. To know where to draw one at the current time, including animated ones, use `hotspotGeometryAt`:

```ts
import { boundsOf, hotspotGeometryAt, isAnimated } from "@ivkit/core";

function place(element: HTMLElement, hotspot: Hotspot, time: number) {
  const geometry = hotspotGeometryAt(hotspot, time);
  if (!geometry) return;
  const { x, y, width, height } = boundsOf(geometry);
  Object.assign(element.style, {
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: `${width * 100}%`,
    height: `${height * 100}%`,
    borderRadius: geometry.kind === "box" ? `${geometry.roundness * 50}%` : "0",
  });
}
```

Coordinates are fractions of the video picture, so position the hotspot layer over the picture itself, excluding any letterboxing. Redraw on every frame only while `isAnimated(hotspot)` is true for a visible hotspot.

## Tree-shaking

Core is marked side-effect free, so bundlers only include what you import. Approximate gzip sizes:

| Import | Size |
| --- | --- |
| `StoryEngine` only | ~1 KiB |
| `validateStory` only | ~1.6 KiB |
| Everything in core | ~3.8 KiB |
