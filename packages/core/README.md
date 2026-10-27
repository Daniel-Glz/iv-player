# @ivkit/core

The framework-agnostic engine behind [`@ivkit/player`](https://www.npmjs.com/package/@ivkit/player): the interactive video story format, a DOM-free engine, a media controller with seamless scene swaps, and validation for untrusted stories. Use it to build your own player in any framework, on a canvas or in a game engine. It has no runtime dependencies.

**[Documentation](https://daniel-glz.github.io/ivkit/guide/core)** · **[Live examples](https://daniel-glz.github.io/ivkit/examples/)**

If you want a ready-made player, install [`@ivkit/player`](https://www.npmjs.com/package/@ivkit/player) instead. It includes core and plays the same stories, so you can start with the player and move to core later without rewriting them.

## Install

```sh
npm install @ivkit/core
```

## Usage

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
engine.on("hotspots", ({ hotspots }) => renderHotspots(hotspots));
```

- `MediaController` plays a story on two stacked video elements, preloading the next scene so there's no black frame between scenes.
- `validateStory` reports every problem in story data with a JSON Pointer and an error code.
- `hotspotGeometryAt`, `boundsOf` and `isAnimated` compute where to draw hotspots at a given time.

## License

[MIT](https://github.com/Daniel-Glz/ivkit/blob/main/LICENSE) © Alexis Gonzalez
