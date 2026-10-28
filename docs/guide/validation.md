---
description: "Check stories from JSON, an API or a CMS with validateStory, and understand every error code it reports."
---

# Validating stories

The engine trusts the story it's given: a reference to a missing scene throws when playback reaches it. When a story comes from outside your code, such as a JSON file, an API or a CMS, check it first with `validateStory`.

```ts
import { validateStory } from "@ivkit/core";

const data: unknown = await fetch("/stories/intro.json").then((r) => r.json());
const result = validateStory(data);

if (result.valid) {
  player.story = result.story; // typed as Story
} else {
  for (const error of result.errors) {
    console.error(`${error.path}: ${error.message}`);
  }
}
```

`validateStory` doesn't modify its input or load any media. Unknown fields are allowed, so you can keep your own metadata in the story.

## Errors

Each error has:

- `path`: a [JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901) to the invalid field, such as `/scenes/intro/events/0/at`. An empty string means the root.
- `code`: what kind of problem it is.
- `message`: a human-readable description.

All errors are reported at once, not just the first one.

| `code` | Meaning | Example |
| --- | --- | --- |
| `invalid_type` | The field has the wrong type. | `scenes` is an array instead of an object. |
| `invalid_value` | The type is right but the value isn't allowed. | A negative time, an empty string, a question without options, a hotspot whose `to` isn't after `from`, an area outside the frame. |
| `duplicate_id` | An id is used twice. | Two hotspots with the id `"map"`. |
| `missing_scene` | `start`, `next` or `goto` names a scene that doesn't exist. | `goto: "forst"` |
| `missing_geometry` | A hotspot has no geometry for its shape. | A `polygon` without `points`. |
| `missing_variable` | A condition or `set` uses a variable not declared in `vars`. | `{ var: "scroe", gte: 1 }` |

## What gets checked

- `version` and every `src`, `text` and `label` are non-empty strings.
- There's at least one scene, and `start`, `next` and every `goto` point to existing scenes.
- Times, including every `seek`, are finite and non-negative, and a hotspot's `to` comes after its `from`.
- Question and hotspot ids are unique across the story, and option ids within their question.
- Every question has at least one option.
- `multiple` is a boolean. `min` and `max` only appear on `multiple` questions, as whole numbers from 1 to the number of options, with `max` not below `min`. Options of a `multiple` question have no `goto`, `branches` or `seek`.
- `area` values are fractions from 0 to 1, with positive width and height, inside the frame.
- Polygons have at least three points inside the frame.
- Every keyframe has a unique `at` and a valid `easing`, and resolves to a usable geometry.
- `vars` values are strings, booleans or finite numbers. Conditions and `set` only use declared variables, every condition has an operator, and `{ add }` only applies to numbers.

## In the editor and in CI

`validateStory` is small (about 2.3 KiB gzip) and has no dependencies, so it can run in a story editor on every change, or in a script that checks the story files in your repository:

```ts
// scripts/check-stories.ts
import { readFile } from "node:fs/promises";
import { validateStory } from "@ivkit/core";

let failed = false;
for (const file of process.argv.slice(2)) {
  const result = validateStory(JSON.parse(await readFile(file, "utf8")));
  for (const error of result.errors) {
    console.error(`${file}#${error.path}: ${error.message}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
```
