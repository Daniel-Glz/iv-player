# iv-player

A lightweight TypeScript library for interactive videos: branching stories, questions, and animated hotspots.

Use the `<iv-player>` Web Component for a ready-made browser player, or build your own interface with `@iv-player/core`.

## Documentation

[**Read the documentation →**](https://daniel-glz.github.io/iv-player/)

- [Getting started](https://daniel-glz.github.io/iv-player/guide/getting-started)
- [Writing stories](https://daniel-glz.github.io/iv-player/guide/stories)
- [Hotspots](https://daniel-glz.github.io/iv-player/guide/hotspots)
- [Styling the player](https://daniel-glz.github.io/iv-player/guide/styling)
- [Live examples](https://daniel-glz.github.io/iv-player/examples/): branching, quizzes, hotspots, tracking, theming, custom players and validation
- [API reference](https://daniel-glz.github.io/iv-player/reference/story-format)

## Development

Use Node.js 24 and the pnpm version pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm check:size
pnpm docs:dev   # documentation at http://localhost:5173/iv-player/
```

No third-party runtime dependencies. The standalone player has an 8 KiB gzip budget, including its core engine, styles, and icons.

## License

[MIT](LICENSE) © Alexis Gonzalez
