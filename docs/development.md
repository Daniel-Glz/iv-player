[Documentation](README.md) · [Quick start](getting-started.md) · [Stories](stories.md) · [Player API](player-api.md) · [Validation](validation.md) · [Core & development](development.md)

---

# Core and development

## Use the engine without the player

`StoryEngine` manages story state without touching the DOM or playing media. Connect its events to your own video and interface, or use `MediaController` to handle media playback.

```ts
import { StoryEngine, type Story } from '@iv-player/core';

const story: Story = {
  version: '0.1',
  start: 'intro',
  scenes: { intro: { src: '/videos/intro.mp4' } },
};
const engine = new StoryEngine(story);
engine.on('scene', ({ scene }) => console.log('Load:', scene.src));
engine.on('end', ({ sceneId }) => console.log('Finished:', sceneId));
engine.start();
```

This example reports events only. To play videos, connect these operations:

| Engine API | Your integration |
| --- | --- |
| `start()` | Begin or restart the story. |
| `update(currentTime)` | Report video time as playback advances. |
| `mediaEnded()` | Report the end of the current clip. |
| `answer(choiceId)` | Submit an option; returns whether it was accepted. |
| `activate(hotspotId)` | Activate a visible hotspot; returns whether it was accepted. |
| `on(event, listener)` | Subscribe; returns an unsubscribe function. |

React to `scene` by loading the clip, `interaction` by pausing and showing a question, `resume` by resuming playback, and `hotspots` by updating visible areas. The engine also emits `answer`, `hotspot`, and `end`.

Read `state` (`idle`, `playing`, `interacting`, or `ended`), `currentSceneId`, `activeQuestion`, and `visibleHotspots` to inspect progress. Engine state is story state; pausing a media element does not introduce a separate engine state.

### MediaController

`new MediaController(engine, [videoA, videoB])` connects an engine to two media elements. Create it before calling `engine.start()`. It coordinates playback, preloading, and swapping between clips. Listen to `swap` to make the active element visible and `blocked` to handle rejected playback. Call `destroy()` when disposing the integration.

The Web Component already handles this wiring. For details, see [the controller source](../packages/core/src/media.ts).

### Geometry helpers

The core exports `hotspotGeometryAt(hotspot, time)`, `boundsOf(geometry)`, and `isAnimated(hotspot)` for custom renderers. [Type definitions](../packages/core/src/types.ts) describe the full story format.

## Development commands

Use Node.js 24 and the pnpm version pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm test:watch
pnpm test:coverage
pnpm build
pnpm check:size
```

`check:size` builds both packages and checks runtime dependencies, raw and gzip budgets, and whether unused validation is removed from playback bundles.

| Artifact | Raw budget | Gzip budget |
| --- | ---: | ---: |
| Standalone player, including core and CSS | 24 KiB | 8 KiB |
| Full core | 11 KiB | 4 KiB |
| Engine-only bundle | 4 KiB | 1.5 KiB |
| Validator-only bundle | 5 KiB | 2 KiB |

Gzip is measured at level 9. Maps, declarations, story data, and media are excluded. Actual network transfer depends on server compression. Videos and the two-element preload strategy can use much more memory and bandwidth than the JavaScript itself; bundle size is not a device-performance benchmark.

## Repository layout

- `packages/core/src`: types, engine, media controller, geometry, and validation.
- `packages/player/src`: Web Component, layout, styles, and icons.
- `packages/*/test`: unit tests.
- `scripts/check-size.mjs`: production bundle budget checks.
- `.github/workflows/ci.yml`: automated checks and coverage artifact.
- `docs`: these private, GitHub-rendered documentation pages.

CI runs on pull requests, pushes to `main`, and manual dispatch. It checks types, runs tests with coverage, builds packages, and checks size budgets. Coverage is retained as a downloadable artifact for seven days.

## Contributing

Keep optional features removable through tree shaking. Avoid new runtime dependencies unless their benefit justifies their cost. Add tests for behavior changes and run the checks above before submitting a pull request. Documentation changes should use relative links so they work in both local checkouts and GitHub.
