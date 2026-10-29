---
description: "Reference for <ivkit-player>: entry points, attributes, properties, methods, events, keyboard shortcuts, slots and server builds."
---

# `<ivkit-player>`

```ts
import { IvkitPlayer } from "@ivkit/player";
```

Importing `@ivkit/player` registers the element as `ivkit-player`, unless something else already registered that name. The `IvkitPlayer` class is exported for `instanceof` checks and for subclassing.

## Entry points

| Import | Registers the element | Use it when |
| --- | --- | --- |
| `@ivkit/player` | Yes, as `ivkit-player`, on import. | Almost always. |
| `@ivkit/player/element` | No. Call `defineIvkitPlayer()`. | You want another tag name, or to choose when the element is defined. |

Both export `IvkitPlayer`, `defineIvkitPlayer` and the types `HotspotRenderer` and `IvkitPlayerEventMap`.

### `defineIvkitPlayer(name?: string): void`

Registers the player as `name`, `"ivkit-player"` by default. It does nothing if that name is already taken, or when there's no `customElements`, such as on the server.

```ts
import { defineIvkitPlayer } from "@ivkit/player/element";

defineIvkitPlayer("story-player");
```

```html
<story-player controls></story-player>
```

A class can only be registered once, so use a single name per page. The `HTMLElementTagNameMap` typing only covers `ivkit-player`.

### Server builds

Edge runtimes and React Server Components get a server build of both entries through [export conditions](https://nodejs.org/api/packages.html#conditional-exports): `react-server`, `workerd` (Cloudflare) and `edge-light` (Vercel Edge). It has the same exports, but `IvkitPlayer` is an empty stand-in, `defineIvkitPlayer` does nothing, and none of the player's DOM code is included.

Plain Node, which Nuxt, SvelteKit and Astro use for server rendering, gets the full build. It's also safe to import there: without `HTMLElement` and `customElements`, it doesn't register anything. Test runners such as Vitest load dependencies through Node while providing a DOM, so they need the real element. See [Server-side rendering](/guide/ssr).

## Attributes

| Attribute | Description |
| --- | --- |
| `controls` | Shows the control bar (play/pause, seek within the scene, volume, fullscreen) and enables keyboard shortcuts. |
| `autoplay` | Starts as soon as a story is set. Browsers may block it unless `muted`. |
| `muted` | Mutes both videos. |
| `pseudo-fullscreen` | Set **by the player** while it covers the viewport on devices without element fullscreen (iPhone). Read-only in practice. |

The control bar hides during the start, question and end screens, and fades out after 3 seconds without activity while playing.

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `story` | `Story \| null` | The story being played. Setting it resets the player. Throws, keeping the current story, if the new one's `start` isn't one of its scenes. |
| `renderHotspot` | `HotspotRenderer \| null` | Called for each hotspot right after its button is created. See [Custom content](/guide/hotspots#custom-content). |
| `engine` | `StoryEngine \| null` | Read-only. The [engine](/reference/engine) driving the current story, for advanced control. |
| `isFullscreen` | `boolean` | Read-only. Whether the player fills the screen, natively or through the iPhone fallback. |

```ts
type HotspotRenderer = (hotspot: Hotspot, element: HTMLButtonElement) => void;
```

## Methods

| Method | Description |
| --- | --- |
| `play()` | Starts the story, or resumes it after a pause or a blocked autoplay. |
| `pause()` | Pauses the current video. |
| `restart()` | Plays the story again from its start scene, with its variables back to their initial values, unlike `goTo(story.start)`, which keeps them. |
| `goTo(sceneId, time?)` | Jumps to a scene and plays it from `time` seconds (default 0), dismissing the question on screen, if any. Throws if the scene doesn't exist. |
| `retry()` | Loads the scene whose video failed (see `iv-error`) again, from the second it failed at. |
| `use(plugin)` | Adds a [plugin](#plugins). Returns a function that removes it. |
| `toggleFullscreen()` | Enters or leaves fullscreen with the whole player, questions and hotspots included. |

Removing the player from the page pauses it, including the countdown of a question with `timeout`, which goes on with the time it had left once the player is back. Setting another story discards the previous one's engine with [`destroy()`](/reference/engine#destroy-void).

## Events

All events are `CustomEvent`s that bubble and cross the shadow boundary (`composed`). Their `detail` is typed through `HTMLElementEventMap`, so `addEventListener` infers it.

| Event | `detail` | When |
| --- | --- | --- |
| `iv-scene` | `{ sceneId, scene, time }` | A scene starts, at `time` seconds. |
| `iv-interaction` | `{ sceneId, question, options }` | A question shows and the video pauses. `options` are the ones whose `if` holds. |
| `iv-timeout` | `{ sceneId, question }` | Nobody answered within the question's `timeout`. Followed by `iv-answer` if it has a `default`. |
| `iv-answer` | `{ sceneId, question, choice, choices, correct, goto }` | The viewer answered with `choices` (`choice` is the first), which branches to `goto`, if defined. `correct` says whether exactly the right options were picked. |
| `iv-hotspot` | `{ sceneId, hotspot, goto }` | The viewer activated a hotspot, which branches to `goto`, if defined. |
| `iv-cues` | `{ sceneId, cues }` | The active [cues](/reference/story-format#cue) changed. `cues` are exactly the active ones, possibly none. |
| `iv-end` | `{ sceneId }` | The story finished. |
| `iv-error` | `{ sceneId, media, error }` | The video of `sceneId` couldn't be loaded or played, e.g. it's missing or in a format the browser can't play. `error` is the video's `MediaError`. The player shows its error screen; `retry()` loads the scene again. |

```ts
player.addEventListener("iv-hotspot", (event) => {
  if (!event.detail.hotspot.goto) openProductPage(event.detail.hotspot.id);
});
```

## Plugins

A plugin is a function that runs each time a story is set on the player. It gets what it needs to extend it, and may return a cleanup:

```ts
type PlayerPlugin = (context: PlayerPluginContext) => (() => void) | void;

interface PlayerPluginContext {
  player: IvkitPlayer;
  engine: StoryEngine;
  media: MediaController<HTMLVideoElement>;
  layer: HTMLElement;
  on(type, listener): void;
}
```

| Field | Description |
| --- | --- |
| `player` | The `<ivkit-player>` element. |
| `engine` | The [engine](/reference/engine) of this story. |
| `media` | The [media controller](/reference/media-controller) of this story, with both video elements. |
| `layer` | The plugin's own element, covering the player above the video and hotspots, and below questions and controls. It lets clicks through: give clickable content `pointer-events: auto`. It's inside the shadow DOM, so give elements a `part` for pages to style them. |
| `on(type, listener)` | Subscribes to an engine event until the plugin is cleaned up. Prefer it to `engine.on()`, which you'd have to unsubscribe yourself. |

Rules:

- Plugins run in the order they were added, each with a new layer, right after the player sets up the story and before it plays. They see each engine event after the player has handled it.
- The cleanup runs, and the layer goes away, when another story is set (also `null`) or the plugin is removed.
- `use()` runs the plugin at once if a story is already set. It may have missed events by then, so read the engine's state, such as `activeCues` or `currentSceneId`.
- Adding the same plugin twice does nothing.
- A plugin that throws, when it runs, in a listener or in its cleanup, doesn't stop the player or the other plugins. Its error is still reported, like an error in a DOM event listener.

```ts
import type { PlayerPlugin } from "@ivkit/player";

/** Shows the title of the active chapter cue. */
const chapters: PlayerPlugin = ({ layer, on }) => {
  const title = document.createElement("p");
  title.setAttribute("part", "chapter-title");
  title.style.cssText = "position: absolute; top: 0.5rem; left: 1rem; margin: 0";
  layer.append(title);
  on("cues", ({ cues }) => {
    const chapter = cues.find((cue) => cue.kind === "chapter");
    title.textContent = (chapter?.data?.["title"] as string | undefined) ?? "";
  });
};

const remove = player.use(chapters);
```

Pages style its elements through their parts, like the player's own: `ivkit-player::part(chapter-title) { font-weight: 600; }`. Plugins can check their cues when a story is validated, too: see [Plugins' cues](/guide/validation#plugins-cues).

## Keyboard shortcuts

With `controls`, while the player has focus:

| Key | Action |
| --- | --- |
| <kbd>Space</kbd> or <kbd>K</kbd> | Play or pause. |
| <kbd>M</kbd> | Mute or unmute. |
| <kbd>F</kbd> | Toggle fullscreen. |
| <kbd>←</kbd> / <kbd>→</kbd> | Seek 5 seconds back or forward within the scene. |
| <kbd>Esc</kbd> | Leave the iPhone fullscreen fallback. |

Seeking is ignored while a question is showing. Focused sliders and buttons keep their native keys. The player makes itself focusable with `tabindex="0"` unless you set a `tabindex` yourself.

## Slots

| Slot | Default | Description |
| --- | --- | --- |
| `start` | `Play` | Content of the start button. |
| `end` | A Replay button | Shown when the story ends. |
| `error` | A message and a "Try again" button | Shown when a scene's video fails. Call `player.retry()` from your own content to load it again. |

## Styling

See [Styling the player](/guide/styling) for the custom properties and parts.

## TypeScript and JSX

The package adds `ivkit-player` to `HTMLElementTagNameMap`, so `document.querySelector("ivkit-player")` returns an `IvkitPlayer`. For JSX in React, declare the element once in your project:

```ts
// ivkit-player.d.ts
import type { IvkitPlayer } from "@ivkit/player";
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "ivkit-player": DetailedHTMLProps<HTMLAttributes<IvkitPlayer>, IvkitPlayer> &
        Partial<Pick<IvkitPlayer, "story" | "renderHotspot">> & {
          controls?: boolean;
          autoplay?: boolean;
          muted?: boolean;
        };
    }
  }
}
```
