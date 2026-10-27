# Contributing

Thanks for helping improve IVKit! Bug reports, ideas and pull requests are all welcome.

## Reporting a bug

[Open an issue](https://github.com/Daniel-Glz/ivkit/issues/new) with:

- What you expected and what happened instead.
- The smallest story that shows the problem. Run it through `validateStory` first, since many problems are invalid stories.
- Your browser and operating system, and your framework if you use one.

## Setting up

You need Node.js 24 and pnpm. Use the pnpm version pinned in `package.json`, for example through [Corepack](https://nodejs.org/api/corepack.html):

```sh
corepack enable
pnpm install --frozen-lockfile
```

## Project layout

| Path | What it is |
| --- | --- |
| `packages/core` | `@ivkit/core`: the story format, engine, media controller and validation. No DOM dependencies and no runtime dependencies. |
| `packages/player` | `@ivkit/player`: the `<ivkit-player>` Web Component, built on core. |
| `docs` | The documentation site, built with VitePress and published to GitHub Pages. |
| `docs/examples` | The live examples. Their stories are in `docs/examples/stories`. |
| `scripts` | Checks for bundle size and package exports. |

## Commands

| Command | What it does |
| --- | --- |
| `pnpm typecheck` | Type-checks both packages. |
| `pnpm test` | Runs every test. Core runs in Node, and the player in happy-dom. |
| `pnpm test:watch` | Runs the tests in watch mode. |
| `pnpm test:coverage` | Runs the tests with a coverage report in `coverage/`. |
| `pnpm build` | Builds both packages into their `dist` folders. |
| `pnpm check:size` | Builds both packages and checks them against their size budgets. |
| `pnpm check:exports` | Checks what each runtime resolves from the player's entries. Run it after a build. |
| `pnpm docs:dev` | Serves the documentation at `http://localhost:5173/ivkit/`. |
| `pnpm docs:build` | Builds the documentation site. |

CI runs `typecheck`, `test:coverage`, `check:size` and `check:exports` on every pull request.

## Size budgets

The library is meant to stay small, so `pnpm check:size` fails when a build grows past its budget:

| Build | Gzip budget |
| --- | --- |
| Standalone player, including core and CSS | 8 KiB |
| All of core | 4 KiB |
| `StoryEngine` only | 1.5 KiB |
| `validateStory` only | 2 KiB |

It also checks that validation isn't bundled into the player, and that neither package gains a runtime dependency. If a change needs a bigger budget, explain why in the pull request.

## Writing code

- **Core never touches the DOM.** It talks to media through the `MediaElement` interface, so it can run in Node and be tested with fakes.
- **Keep the player safe to import on the server.** Don't use `window`, `document` or other browser globals at module level.
- **Test behavior, not implementation.** Core tests drive the engine and controller with fake media. Player tests render the element in happy-dom.
- **Document public changes.** Update the guide or reference page for any change to the story format or the public API, and add an entry to `CHANGELOG.md` under **Unreleased**.

## Documentation and examples

The documentation is in `docs`, as Markdown. Pages are written in English, with short sentences and a code example for each feature.

The live examples use placeholder clips generated with ffmpeg, so that hotspots line up exactly with what's drawn in the video. To change them, edit the clips in `docs/scripts/generate-example-videos.mjs`, keep the hotspots in `docs/examples/stories` in sync, and regenerate:

```sh
node docs/scripts/generate-example-videos.mjs --force
```

## Pull requests

1. Create a branch from `main`.
2. Make your change, with tests.
3. Run `pnpm typecheck`, `pnpm test` and `pnpm check:size`.
4. Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org/) style used in this repository, such as `feat(player): …`, `fix(core): …` or `docs: …`.
5. Open a pull request that explains what changed and why.

By contributing, you agree that your contributions are licensed under the project's [MIT License](https://github.com/Daniel-Glz/ivkit/blob/main/LICENSE).
