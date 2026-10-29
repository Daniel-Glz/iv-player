---
description: "Fixes for common IVKit problems: a player that stays empty, blocked autoplay, videos that fail, gaps between scenes and misplaced hotspots."
---

# Troubleshooting

## The player stays empty

- **The element isn't defined.** Something must import `@ivkit/player`, or load the [CDN build](/guide/getting-started#try-it-in-one-html-file), in the browser. In a plain HTML page without a bundler, `import "@ivkit/player"` fails, because browsers can't resolve package names: use the CDN build there.
- **`story` was set as an attribute.** A story is an object, so set it as a property: `player.story = story`. In React 19, `story={story}` does that. React 18 and earlier set it as an attribute instead, so set it from a ref in an effect.
- **The story is invalid.** Setting a story whose `start` isn't one of its scenes throws. Other mistakes, like a `goto` to a missing scene, only throw when playback reaches them. Run stories from JSON, an API or a CMS through [`validateStory`](/guide/validation) first.
- **Vue warns "Failed to resolve component".** Tell the compiler that `ivkit-player` is a custom element with [`isCustomElement`](/guide/getting-started#using-it-from-a-framework).

## The video doesn't start

Browsers block playback with sound until the viewer interacts with the page. When that happens, the player shows its Play button again, so the viewer can start it. To start without a click, combine `autoplay` with `muted`. The same applies to `play()` and `goTo()` called without a user gesture.

## "This video can't be played"

The player shows this error screen, and fires `iv-error`, when a scene's video can't be loaded or played. Check that the `src` URL loads in the browser and that the format plays there (H.264 in MP4 is the most widely supported). The **Try again** button, or `player.retry()`, loads it again from where it failed. To replace the screen, see the [`error` slot](/guide/styling#slots).

## There's a gap or a black frame between scenes

The player preloads the most likely next scene while the current one plays, and holds the last frame until the next one can draw its first. A gap usually means the next video is slow to load:

- Encode every scene with the same resolution and aspect ratio.
- Serve videos with `Accept-Ranges`, encoded fast-start (`ffmpeg -movflags +faststart`).
- Keep scenes short. Each video only needs to buffer a few seconds ahead.

A scene that's [not the likely next one](/guide/stories#scene-changes-without-a-black-frame), such as one picked by a later branch, may take a moment longer to start.

## A question doesn't appear

- Each question is asked **once per visit** to its scene. Scrubbing back with the control bar doesn't ask it again. It's asked again when the scene is entered again, or after a `seek` in the story back before it.
- If none of a question's options pass their `if`, the question is skipped.
- When the viewer seeks past several questions, only the earliest one is asked. The rest follow after it's answered.

## Hotspots are in the wrong place

Hotspot coordinates are fractions (0–1) of the video picture, not pixels, and not of the `<video>` element. Divide pixel positions by the video's width and height. See [Coordinates](/guide/hotspots#coordinates).

## TypeScript can't find `@ivkit/core`

`@ivkit/player` includes the engine, but to import from `@ivkit/core` in your own code, such as the `Story` type, install `@ivkit/core` too, at the same version. Package managers with strict `node_modules`, such as pnpm, don't let you import a dependency you haven't installed yourself.
