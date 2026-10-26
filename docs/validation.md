[Documentation](README.md) · [Quick start](getting-started.md) · [Stories](stories.md) · [Player API](player-api.md) · [Validation](validation.md) · [Core & development](development.md)

---

# Story validation

Use `validateStory()` to check data before passing it to a player or engine. Validation is optional and does not run automatically during playback.

```ts
import { validateStory } from '@iv-player/core';
import '@iv-player/player';

const response = await fetch('/story.json');
if (!response.ok) throw new Error(`Story request failed: ${response.status}`);
const data: unknown = await response.json();
const result = validateStory(data);

if (result.valid) {
  const player = document.querySelector('iv-player');
  if (player) player.story = result.story; // Typed as Story.
} else {
  for (const error of result.errors) {
    console.error(error.path, error.code, error.message);
  }
}
```

This example expects a bundler that resolves the workspace packages.

## Result

| Result | Fields |
| --- | --- |
| Valid | `{ valid: true, story, errors: [] }` |
| Invalid | `{ valid: false, errors }` |

`story` is the original object, typed as `Story`. The validator does not mutate data, load videos, or start playback. It collects all detected errors.

Each error includes a JSON Pointer `path`, a machine-readable `code`, and an English `message`. A path such as `/scenes/intro/events/0/at` identifies the invalid time. An empty path refers to the root. Within scene IDs, `/` and `~` are escaped as `~1` and `~0`.

Error codes: `invalid_type`, `invalid_value`, `duplicate_id`, `missing_scene`, and `missing_geometry`.

## Checks

- Required fields and non-empty strings.
- At least one scene and existing targets for `start`, `next`, and `goto`.
- Unique event IDs across the story and option IDs within each question.
- At least one option per question.
- Finite, non-negative times; hotspot end times strictly after their start.
- Supported shapes and easing values.
- Positive rectangle dimensions and bounds within the picture.
- At least three polygon points, with finite coordinates from 0 to 1.
- Usable static or keyframe geometry, including inherited fields.
- Unique keyframe times within each hotspot.

Loops, unsorted events and keyframes, custom variants, and extra metadata are allowed. Empty keyframe arrays use static geometry.

## Limits

`version` must be a non-empty string, but is not restricted to a list of supported versions. Validation does not check video availability, clip duration, polygon self-intersections, or whether every scene can be reached. It is intended for parsed data, not objects with custom getters or proxies.

The validator is tree-shakeable. The standalone player does not include it; applications that import it pay for it separately.

**Next:** [Control the player →](player-api.md)
