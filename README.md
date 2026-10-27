# IVKit

A lightweight TypeScript library for interactive videos: branching stories, questions, and animated hotspots.

Use the `<ivkit-player>` Web Component for a ready-made browser player, or build your own interface with `@ivkit/core`.

## Documentation

[**Read the documentation →**](https://daniel-glz.github.io/ivkit/)

- [Getting started](https://daniel-glz.github.io/ivkit/guide/getting-started)
- [Writing stories](https://daniel-glz.github.io/ivkit/guide/stories)
- [Hotspots](https://daniel-glz.github.io/ivkit/guide/hotspots)
- [Styling the player](https://daniel-glz.github.io/ivkit/guide/styling)
- [Live examples](https://daniel-glz.github.io/ivkit/examples/): branching, quizzes, hotspots, tracking, theming, custom players and validation
- [API reference](https://daniel-glz.github.io/ivkit/reference/story-format)

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
