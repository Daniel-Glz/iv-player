# @ivkit/player

The `<ivkit-player>` Web Component for interactive videos: branching stories, questions and animated hotspots, with a control bar, fullscreen and theming. It works in plain HTML and in any framework.

**[Documentation](https://daniel-glz.github.io/ivkit/)** · **[Live examples](https://daniel-glz.github.io/ivkit/examples/)**

If you'd rather build your own interface, use [`@ivkit/core`](https://www.npmjs.com/package/@ivkit/core) instead: the same engine and story format, without the Web Component. See [Custom players with core](https://daniel-glz.github.io/ivkit/guide/core).

## Install

```sh
npm install @ivkit/player
```

Or, without a bundler, load the standalone build from a CDN. It's a single ES module that includes the core engine:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@ivkit/player@0.1/dist/ivkit-player.min.js"></script>
```

Until 1.0.0, minor versions may include breaking changes, so `@0.1` takes only 0.1.x fixes. See the [changelog](https://daniel-glz.github.io/ivkit/changelog).

## Usage

Importing the package registers the `<ivkit-player>` element. Give it a story: a set of scenes, each a video with the questions and hotspots that appear while it plays.

```html
<ivkit-player id="player" controls></ivkit-player>

<script type="module">
  import "@ivkit/player";

  const player = document.getElementById("player");

  player.story = {
    version: "0.1",
    start: "intro",
    scenes: {
      intro: {
        src: "/videos/intro.mp4",
        events: [
          {
            type: "question",
            id: "path",
            at: 4,
            text: "Where should we go?",
            options: [
              { id: "forest", label: "Into the forest", goto: "forest" },
              { id: "city", label: "Back to the city", goto: "city" },
            ],
          },
        ],
      },
      forest: { src: "/videos/forest.mp4" },
      city: { src: "/videos/city.mp4" },
    },
  };

  player.addEventListener("iv-answer", (event) => console.log(event.detail));
</script>
```

To register the element yourself, or under another name, import `IvkitPlayer` and `defineIvkitPlayer` from `@ivkit/player/element`. The package is safe to import during server-side rendering.

## License

[MIT](https://github.com/Daniel-Glz/ivkit/blob/main/LICENSE) © Alexis Gonzalez
