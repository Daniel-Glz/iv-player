# @ivkit/react

A React component for building interactive video experiences: videos that pause to ask questions, show clickable and animated hotspots, run quizzes and branch. It wraps the [`<ivkit-player>`](https://www.npmjs.com/package/@ivkit/player) Web Component with typed props, event callbacks and a ref to the player, for React 18 and 19.

**[Documentation](https://daniel-glz.github.io/ivkit/guide/react)** · **[Live examples](https://daniel-glz.github.io/ivkit/examples/)**

## Install

```sh
npm install @ivkit/react
```

## Usage

```tsx
import { IvkitPlayer } from "@ivkit/react";

const videos = "https://daniel-glz.github.io/ivkit/examples/videos";

const story = {
  version: "0.1",
  start: "intro",
  scenes: {
    intro: {
      src: `${videos}/adventure-intro.mp4`,
      events: [
        {
          type: "question",
          id: "path",
          at: 4,
          text: "Where do you want to go?",
          options: [
            { id: "forest", label: "Into the forest", goto: "forest" },
            { id: "city", label: "To the city", goto: "city" },
          ],
        },
      ],
    },
    forest: { src: `${videos}/adventure-forest.mp4` },
    city: { src: `${videos}/adventure-city.mp4` },
  },
} as const;

export function Adventure() {
  return (
    <IvkitPlayer
      story={story}
      controls
      onAnswer={(event) => console.log("Picked", event.detail.choice.id)}
    />
  );
}
```

Passing a different `story` object resets the player, so keep stories outside the component or memoize them. The component also takes `autoplay`, `muted`, `renderHotspot`, `plugins`, a callback for each event (`onScene`, `onInteraction`, `onAnswer`, `onTimeout`, `onHotspot`, `onCues`, `onEnd`, `onError`), children for the player's slots and any HTML attribute. Its `ref` is the `<ivkit-player>` element, for methods like `play()` and `goTo()`.

It's a client component, so server components can render it. See the [React guide](https://daniel-glz.github.io/ivkit/guide/react).

## License

[Apache-2.0](https://github.com/Daniel-Glz/ivkit/blob/main/LICENSE) © Alexis Gonzalez
