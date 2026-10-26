[Documentation](README.md) · [Quick start](getting-started.md) · [Stories](stories.md) · [Player API](player-api.md) · [Validation](validation.md) · [Core & development](development.md)

---

# iv-player documentation

**Give viewers a choice in what happens next.**

iv-player is a lightweight TypeScript library for interactive videos. Connect clips into branching stories, pause for questions, and place clickable hotspots over the picture.

[**Build your first interactive video →**](getting-started.md)

## Find your guide

| I want to… | Read |
| --- | --- |
| Run a player with my own videos | [Quick start](getting-started.md) |
| Connect scenes and ask questions | [Stories and interactions](stories.md) |
| Add static or animated hotspots | [Hotspots](stories.md#hotspots) |
| Check story data before playback | [Story validation](validation.md) |
| Control playback and listen for answers | [Player API](player-api.md) |
| Change colors, buttons, or overlays | [Appearance](player-api.md#appearance) |
| Build my own UI or contribute | [Core and development](development.md) |

## Choose your package

| Package | What it provides |
| --- | --- |
| `@iv-player/player` | A browser Web Component with controls, question overlays, hotspots, and built-in styles. |
| `@iv-player/core` | Story types, validation, a DOM-free story engine, geometry helpers, and a media controller. |

The player has no third-party runtime dependencies. Its standalone browser build includes the engine, CSS, and icons. The size check currently enforces an **8 KiB gzip budget** for that complete build. Validation is optional and is removed from playback bundles when unused.

## About these docs

These pages describe the source in this repository. Setup uses a local build and does not assume the packages are published to npm. Documentation inherits the repository's access controls: readers must have access to the private repository.

[Browse the source](../packages) · [View CI](../.github/workflows/ci.yml)
