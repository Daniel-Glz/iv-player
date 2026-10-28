# Changelog

All notable changes to `@ivkit/core` and `@ivkit/player` are documented here. Both packages are versioned together.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Until 1.0.0, minor versions may include breaking changes, which are always listed under **Changed** or **Removed**.

## [Unreleased]

### Added

- `@ivkit/core`: `StoryEngine.goTo(sceneId)`, which enters any scene from any state, dismissing the question on screen. It works before `start()`, e.g. to resume a saved story.
- `@ivkit/player`: `goTo(sceneId)` on `<ivkit-player>`, which jumps to a scene and plays it. Use it to branch on a score, resume where the viewer left off or build chapter menus.
- `@ivkit/core`: `pause` on hotspots, which pauses the video when the hotspot appears until it's activated. The engine emits a new `pause` event, and `MediaController` pauses on the hotspot's first frame and resumes when it's activated without a `goto`.
- `@ivkit/core`: variables and conditions in the story format. `Story.vars` declares variables, `set` changes them on choices, hotspots and scenes, `branches` pick a scene by condition before falling back to `goto` or `next`, and `if` offers a choice or shows a hotspot only while it holds. `validateStory` reports undeclared variables with the new `missing_variable` code.
- `@ivkit/core`: `StoryEngine.vars`, `StoryEngine.setVar()` and a `vars` event. The `interaction` event now includes the `options` offered, and `answer` and `hotspot` include the scene they branch to as `goto`.
- `@ivkit/player`: questions show only the options whose `if` holds, and `iv-interaction`, `iv-answer` and `iv-hotspot` carry the same new fields as the engine's events.
- `@ivkit/core`: a `time` event on `MediaController`, with each playback time it reports to the engine. `<ivkit-player>` now moves animated hotspots on it instead of keeping its own frame callbacks.

### Changed

- Size budgets: the standalone player now stays under 8.5 KiB gzip (was 8 KiB), and all of `@ivkit/core` under 5 KiB (was 4 KiB), to fit variables and conditions.

## [0.1.1] - 2026-10-27

The first release of `@ivkit/player`, which wasn't published as 0.1.0.

### Fixed

- `@ivkit/core`: `VERSION` reported `0.0.0` instead of the package's version. It's now read from `package.json` at build time.

## [0.1.0] - 2026-10-27

The first release of `@ivkit/core`.

### Added

#### `@ivkit/core`

- Story format: scenes with a video, a `next` scene, questions and hotspots.
- `StoryEngine`, a DOM-free state machine that drives a story from playback time, with events for scenes, questions, answers, hotspots and the end of the story.
- Questions that pause on their exact frame and branch, resume or continue to the next scene. They fire once per visit, and seeking past several asks only the earliest.
- Hotspots shaped as rectangles, ellipses or polygons, animated through keyframes with `linear`, `ease-in-out` or `step` easing, morphing between shapes.
- `MediaController`, which plays a story on two stacked media elements: it preloads the likely next scene and swaps only once its first frame can be drawn, so there's no black frame between scenes. It follows playback with `requestVideoFrameCallback`, falling back to `timeupdate`.
- `validateStory`, which reports every problem in untrusted story data with a JSON Pointer and an error code.
- `hotspotGeometryAt`, `boundsOf` and `isAnimated`, for drawing hotspots in custom players.

#### `@ivkit/player`

- The `<ivkit-player>` Web Component, with `controls`, `autoplay` and `muted` attributes.
- A control bar with play/pause, seeking within the scene, volume and fullscreen, plus keyboard shortcuts.
- Fullscreen for the whole player, including questions and hotspots, with a viewport-covering fallback on iPhone.
- Hotspot variants `outline`, `pulse`, `label` and `hidden`, custom variants styled through `::part(hotspot-<variant>)`, and `renderHotspot` for custom content.
- Theming through `--iv-*` custom properties, `::part()` for every element, and `start` and `end` slots.
- `iv-scene`, `iv-interaction`, `iv-answer`, `iv-hotspot` and `iv-end` events, typed through `HTMLElementEventMap`.
- `@ivkit/player/element`, which exports the element class and `defineIvkitPlayer()` without registering anything.
- Safe to import during server-side rendering. React Server Components, Cloudflare Workers and Vercel Edge get a server build without DOM code.
- A standalone build, `ivkit-player.min.js`, that includes core and loads straight from a CDN, under an 8 KiB gzip budget.

[Unreleased]: https://github.com/Daniel-Glz/ivkit/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/Daniel-Glz/ivkit/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Daniel-Glz/ivkit/releases/tag/v0.1.0
