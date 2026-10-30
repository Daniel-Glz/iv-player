---
description: "Use IVKit in React 18 and 19 with @ivkit/react: a typed component with event callbacks, plugins, slots and a ref to the player."
---

# React

`<ivkit-player>` works in React as is, but React only gets so far with custom elements: you declare the tag for JSX yourself, listen to events through a ref, and in React 18 set `story` from an effect. `@ivkit/react` does that for you. It's a thin component around the element, for React 18 and 19.

## Install

```sh
npm install @ivkit/react
```

It depends on `@ivkit/player`, which it imports for you, and takes the React you already have.

## Usage

```tsx
import { IvkitPlayer } from "@ivkit/react";
import { story } from "./story";

export function Lesson() {
  return (
    <IvkitPlayer
      story={story}
      controls
      onAnswer={(event) => console.log("Picked", event.detail.choice.id)}
      onEnd={(event) => console.log("Finished on", event.detail.sceneId)}
    />
  );
}
```

`story` is set as a property, and passing a different object resets the player. Re-rendering with the same object keeps it playing, so keep stories outside the component, or in state or `useMemo`, rather than building a new object on every render.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `story` | `Story \| null` | The story to play. |
| `controls` | `boolean` | Shows the control bar and enables keyboard shortcuts. |
| `autoplay` | `boolean` | Starts as soon as a story is set. Browsers may block it unless `muted`. |
| `muted` | `boolean` | Mutes both videos. |
| `renderHotspot` | `HotspotRenderer \| null` | Customizes each hotspot's button. See [Custom content](/guide/hotspots#custom-content). |
| `plugins` | `PlayerPlugin[]` | [Plugins](/reference/player#plugins) to run, in order. |
| `children` | `ReactNode` | Content for the player's [slots](/reference/player#slots). |

Any other HTML attribute, such as `className`, `style`, `id` or `aria-label`, goes to the element.

## Events

Each [event](/reference/player#events) has a callback prop, which gets the `CustomEvent` with its typed `detail`:

| Prop | Event |
| --- | --- |
| `onScene` | `iv-scene` |
| `onInteraction` | `iv-interaction` |
| `onAnswer` | `iv-answer` |
| `onTimeout` | `iv-timeout` |
| `onHotspot` | `iv-hotspot` |
| `onCues` | `iv-cues` |
| `onEnd` | `iv-end` |
| `onError` | `iv-error` |

The component always calls the latest callback, so inline functions are fine. The player emits some events as soon as a story is set, such as `iv-scene` with `autoplay`, and the callbacks get those too.

## Controlling the player

The component's `ref` is the `<ivkit-player>` element, with all its [methods](/reference/player#methods):

```tsx
import { IvkitPlayer, type IvkitPlayerElement } from "@ivkit/react";
import { useRef } from "react";
import { story } from "./story";

export function Chapters() {
  const player = useRef<IvkitPlayerElement>(null);

  return (
    <>
      <IvkitPlayer ref={player} story={story} controls />
      <button type="button" onClick={() => player.current?.goTo("forest")}>
        Skip to the forest
      </button>
    </>
  );
}
```

`IvkitPlayerElement` is the element class, `IvkitPlayer` from `@ivkit/player`, under a name that doesn't clash with the component.

## Plugins

Each plugin in `plugins` is added once, and removed, running its cleanup, when it leaves the array or the component unmounts. React compares them by identity, so create them outside the component, or with `useMemo`:

```tsx
import { IvkitPlayer, type PlayerPlugin } from "@ivkit/react";
import { useMemo } from "react";

export function Player({ story, title }: Props) {
  const plugins = useMemo<PlayerPlugin[]>(
    () => [
      ({ layer }) => {
        layer.textContent = title;
      },
    ],
    [title],
  );

  return <IvkitPlayer story={story} plugins={plugins} />;
}
```

A plugin created inline would be a new function on every render, so it would be removed and run again each time.

## Slots

Children go into the element, so give them a `slot` to replace the start button, end screen or error screen:

```tsx
<IvkitPlayer story={story}>
  <span slot="start">Start the lesson</span>
  <div slot="end">
    <p>Well done!</p>
    <a href="/next">Next lesson</a>
  </div>
</IvkitPlayer>
```

## Next.js and server components

`@ivkit/react` is a client component, so a server component can render it and pass a story it loaded, for example from a CMS:

```tsx
// app/page.tsx (a server component)
import { IvkitPlayer } from "@ivkit/react";
import { getStory } from "./stories";

export default async function Page() {
  return <IvkitPlayer story={await getStory()} controls />;
}
```

Server components can't pass functions, so render it from your own client component to use event callbacks, `renderHotspot` or plugins:

```tsx
// app/player.tsx
"use client";

import { IvkitPlayer } from "@ivkit/react";
import type { Story } from "@ivkit/core";

export function Player({ story }: { story: Story }) {
  return <IvkitPlayer story={story} controls onEnd={() => console.log("Done")} />;
}
```

On the server, the page HTML includes an empty `<ivkit-player>` tag with its attributes, and the player starts once the page hydrates. Reserve its space to [avoid layout shift](/guide/ssr#avoid-layout-shift).
