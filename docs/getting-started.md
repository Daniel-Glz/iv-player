[Documentation](README.md) · [Quick start](getting-started.md) · [Stories](stories.md) · [Player API](player-api.md) · [Validation](validation.md) · [Core & development](development.md)

---

# Quick start

Build a video that pauses after five seconds and lets the viewer choose the next clip.

## 1. Build the library

Clone the repository with an account that has access:

```sh
git clone https://github.com/Daniel-Glz/iv-player.git
cd iv-player
pnpm install --frozen-lockfile
pnpm build
```

Use **Node.js 24** (the version used in CI) and the pnpm version pinned in `package.json`. The build tools have stricter Node requirements than the root manifest's `>=20` range.

The standalone browser module is written to `packages/player/dist/iv-player.min.js`. It includes the player, core engine, and styles.

## 2. Add videos and a page

Create a `videos` folder in the repository root with `intro.mp4`, `forest.mp4`, and `beach.mp4`. Use an intro longer than five seconds. Save this page as `demo.html` in the repository root:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Choose your adventure</title>
    <style>
      iv-player { max-width: 900px; margin: 2rem auto; --iv-radius: 12px; }
    </style>
  </head>
  <body>
    <iv-player controls></iv-player>
    <script type="module">
      import './packages/player/dist/iv-player.min.js';

      const player = document.querySelector('iv-player');
      player.story = {
        version: '0.1',
        start: 'intro',
        scenes: {
          intro: {
            src: './videos/intro.mp4',
            events: [{
              type: 'question',
              id: 'destination',
              at: 5,
              text: 'Where would you like to go?',
              options: [
                { id: 'forest', label: 'Explore the forest', goto: 'forest' },
                { id: 'beach', label: 'Visit the beach', goto: 'beach' },
              ],
            }],
          },
          forest: { src: './videos/forest.mp4' },
          beach: { src: './videos/beach.mp4' },
        },
      };

      player.addEventListener('iv-answer', ({ detail }) => {
        console.log('Selected:', detail.choice.id);
      });
    </script>
  </body>
</html>
```

## 3. Serve the page

Use a static server from the repository root. For example, with Python 3:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/demo.html` and click **Play**. Choose a destination when the question appears. When that clip ends, click **Replay** to start over.

Do not open the HTML directly with a `file://` URL; browser modules should be served over HTTP.

## Use it in an application

Copy `iv-player.min.js` into your site's public assets and import it from that URL. It is a standalone ES module, so load it through `import` or a `<script type="module">` tag.

In a bundler application that resolves the workspace packages, register the component with:

```ts
import '@iv-player/player';
import type { Story } from '@iv-player/core';
```

Assign stories through the JavaScript `story` property, not an HTML attribute. In applications with server-side rendering, import the player on the client: it needs `HTMLElement` and `customElements`.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Nothing appears | Import the component and assign `player.story`; click Play. |
| Video does not load | Check the video URL and network response. Relative URLs resolve against the page. |
| Autoplay is blocked | Use `autoplay muted`, or let the viewer press Play. |
| A branch fails | Ensure every `goto` and `next` names an existing scene; [validate the story](validation.md). |
| Bare package imports fail in a browser | Use a bundler or the standalone browser module. |

**Next:** [Write stories and hotspots →](stories.md)
