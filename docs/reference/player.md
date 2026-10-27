# `<iv-player>`

```ts
import { IvPlayer } from "@iv-player/player";
```

Importing `@iv-player/player` registers the element as `iv-player`, unless something else already registered that name. The `IvPlayer` class is exported for `instanceof` checks and for subclassing.

## Entry points

| Import | Registers the element | Use it when |
| --- | --- | --- |
| `@iv-player/player` | Yes, as `iv-player`, on import. | Almost always. |
| `@iv-player/player/element` | No. Call `defineIvPlayer()`. | You want another tag name, or to choose when the element is defined. |

Both export `IvPlayer`, `defineIvPlayer` and the types `HotspotRenderer` and `IvPlayerEventMap`.

### `defineIvPlayer(name?: string): void`

Registers the player as `name`, `"iv-player"` by default. It does nothing if that name is already taken, or when there's no `customElements`, such as on the server.

```ts
import { defineIvPlayer } from "@iv-player/player/element";

defineIvPlayer("story-player");
```

```html
<story-player controls></story-player>
```

A class can only be registered once, so use a single name per page. The `HTMLElementTagNameMap` typing only covers `iv-player`.

### Server builds

Edge runtimes and React Server Components get a server build of both entries through [export conditions](https://nodejs.org/api/packages.html#conditional-exports): `react-server`, `workerd` (Cloudflare) and `edge-light` (Vercel Edge). It has the same exports, but `IvPlayer` is an empty stand-in, `defineIvPlayer` does nothing, and none of the player's DOM code is included.

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
| `toggleFullscreen()` | Enters or leaves fullscreen with the whole player, questions and hotspots included. |

## Events

All events are `CustomEvent`s that bubble and cross the shadow boundary (`composed`). Their `detail` is typed through `HTMLElementEventMap`, so `addEventListener` infers it.

| Event | `detail` | When |
| --- | --- | --- |
| `iv-scene` | `{ sceneId, scene }` | A scene starts. |
| `iv-interaction` | `{ sceneId, question }` | A question shows and the video pauses. |
| `iv-answer` | `{ sceneId, question, choice }` | The viewer picked an option. |
| `iv-hotspot` | `{ sceneId, hotspot }` | The viewer activated a hotspot. |
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

The package adds `iv-player` to `HTMLElementTagNameMap`, so `document.querySelector("iv-player")` returns an `IvPlayer`. For JSX in React, declare the element once in your project:

```ts
// iv-player.d.ts
import type { IvPlayer } from "@iv-player/player";
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "iv-player": DetailedHTMLProps<HTMLAttributes<IvPlayer>, IvPlayer> &
        Partial<Pick<IvPlayer, "story" | "renderHotspot">> & {
          controls?: boolean;
          autoplay?: boolean;
          muted?: boolean;
        };
    }
  }
}
```
