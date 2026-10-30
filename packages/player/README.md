# @ivkit/player

A ready-made player for building interactive video experiences: videos that pause to ask questions, show clickable and animated hotspots, run quizzes and branch. Add the `<ivkit-player>` Web Component to a page, give it a story, and it handles playback, a control bar, fullscreen and theming. It works in plain HTML and in any framework.

**[Documentation](https://daniel-glz.github.io/ivkit/)** · **[Live examples](https://daniel-glz.github.io/ivkit/examples/)**

If you'd rather build your own interface, use [`@ivkit/core`](https://www.npmjs.com/package/@ivkit/core) instead: the same engine and story format, without the Web Component. See [Custom players with core](https://daniel-glz.github.io/ivkit/guide/core).

## Install

```sh
npm install @ivkit/player
```

Or, without a bundler, load the standalone build from a CDN. It's a single ES module that includes the core engine:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@ivkit/player@0.3/dist/ivkit-player.min.js"></script>
```

Until 1.0.0, minor versions may include breaking changes, so `@0.3` takes only 0.3.x fixes. See the [changelog](https://daniel-glz.github.io/ivkit/changelog).

## Usage

Loading the CDN build, or importing the package, registers the `<ivkit-player>` element. Give it a story: a set of scenes, each a video with the questions and hotspots that appear while it plays. This page works as is, with the example videos of the documentation:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@ivkit/player@0.3/dist/ivkit-player.min.js"></script>

<ivkit-player id="player" controls></ivkit-player>

<script type="module">
  const videos = "https://daniel-glz.github.io/ivkit/examples/videos";
  const player = document.getElementById("player");

  player.story = {
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
  };

  player.addEventListener("iv-answer", (event) => console.log(event.detail.choice.id));
</script>
```

With a bundler, import the package once instead of loading the CDN build:

```ts
import "@ivkit/player";
```

Set `story` as a property, not an attribute, since it's an object. The [getting started guide](https://daniel-glz.github.io/ivkit/guide/getting-started) covers React, Vue, Svelte and server-side rendering.

To register the element yourself, or under another name, import `IvkitPlayer` and `defineIvkitPlayer` from `@ivkit/player/element`. The package is safe to import during server-side rendering.

## License

[Apache-2.0](https://github.com/Daniel-Glz/ivkit/blob/main/LICENSE) © Alexis Gonzalez
