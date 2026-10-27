# IVKit

[![npm: @ivkit/player](https://img.shields.io/npm/v/@ivkit/player?label=%40ivkit%2Fplayer)](https://www.npmjs.com/package/@ivkit/player)
[![npm: @ivkit/core](https://img.shields.io/npm/v/@ivkit/core?label=%40ivkit%2Fcore)](https://www.npmjs.com/package/@ivkit/core)
[![CI](https://github.com/Daniel-Glz/ivkit/actions/workflows/ci.yml/badge.svg)](https://github.com/Daniel-Glz/ivkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A lightweight TypeScript library for interactive videos: branching stories, questions, and animated hotspots.

Use the `<ivkit-player>` Web Component for a ready-made browser player, or build your own interface with `@ivkit/core`.

## Install

```sh
npm install @ivkit/player
```

```html
<ivkit-player id="player" controls></ivkit-player>

<script type="module">
  import "@ivkit/player";

  document.getElementById("player").story = {
    version: "0.1",
    start: "intro",
    scenes: { intro: { src: "/videos/intro.mp4" } },
  };
</script>
```

Or load it from a CDN, with no build step:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@ivkit/player@0.1/dist/ivkit-player.min.js"></script>
```

To build your own player, install [`@ivkit/core`](packages/core) instead.

## Documentation

[**Read the documentation →**](https://daniel-glz.github.io/ivkit/)

- [Getting started](https://daniel-glz.github.io/ivkit/guide/getting-started)
- [Writing stories](https://daniel-glz.github.io/ivkit/guide/stories)
- [Hotspots](https://daniel-glz.github.io/ivkit/guide/hotspots)
- [Styling the player](https://daniel-glz.github.io/ivkit/guide/styling)
- [Live examples](https://daniel-glz.github.io/ivkit/examples/): branching, quizzes, hotspots, tracking, theming, custom players and validation
- [API reference](https://daniel-glz.github.io/ivkit/reference/story-format)
- [Changelog](CHANGELOG.md)

## Development

Use Node.js 24 and the pnpm version pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm check:size
pnpm docs:dev   # documentation at http://localhost:5173/ivkit/
```

No third-party runtime dependencies. The standalone player has an 8 KiB gzip budget, including its core engine, styles, and icons.

## License

[MIT](LICENSE) © Alexis Gonzalez
