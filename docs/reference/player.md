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
| `story` | `Story \| null` | The story being played. Setting it resets the player. |
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
| `restart()` | Plays the story again from its start scene. |
| `goTo(sceneId)` | Jumps to a scene and plays it, dismissing the question on screen, if any. Throws if the scene doesn't exist. |
| `toggleFullscreen()` | Enters or leaves fullscreen with the whole player, questions and hotspots included. |

## Events

All events are `CustomEvent`s that bubble and cross the shadow boundary (`composed`). Their `detail` is typed through `HTMLElementEventMap`, so `addEventListener` infers it.

| Event | `detail` | When |
| --- | --- | --- |
| `iv-scene` | `{ sceneId, scene }` | A scene starts. |
| `iv-interaction` | `{ sceneId, question, options }` | A question shows and the video pauses. `options` are the ones whose `if` holds. |
| `iv-timeout` | `{ sceneId, question }` | Nobody answered within the question's `timeout`. Followed by `iv-answer` if it has a `default`. |
| `iv-answer` | `{ sceneId, question, choice, choices, correct, goto }` | The viewer answered with `choices` (`choice` is the first), which branches to `goto`, if defined. `correct` says whether exactly the right options were picked. |
| `iv-hotspot` | `{ sceneId, hotspot, goto }` | The viewer activated a hotspot, which branches to `goto`, if defined. |
| `iv-end` | `{ sceneId }` | The story finished. |

```ts
player.addEventListener("iv-hotspot", (event) => {
  if (!event.detail.hotspot.goto) openProductPage(event.detail.hotspot.id);
});
```

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
