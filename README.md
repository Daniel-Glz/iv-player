# iv-player

A lightweight TypeScript library for interactive videos: branching stories, questions, and animated hotspots.

Use the `<iv-player>` Web Component for a ready-made browser player, or build your own interface with `@iv-player/core`.

## Documentation

[**Open the documentation →**](docs/README.md)

- [Quick start](docs/getting-started.md)
- [Stories and hotspots](docs/stories.md)
- [Player API and styling](docs/player-api.md)
- [Story validation](docs/validation.md)
- [Core engine and development](docs/development.md)

Documentation is hosted inside this private repository and shares its access permissions.

## Development

Use Node.js 24 and the pnpm version pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm check:size
```

No third-party runtime dependencies. The standalone player has an 8 KiB gzip budget, including its core engine, styles, and icons.

## License

MIT, as declared in the package manifests.
