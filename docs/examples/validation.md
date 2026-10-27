---
description: "Live playground: edit an interactive video story and see validateStory's errors as you type."
---

# Validation playground

Edit the story below. `validateStory` runs on every keystroke and reports each problem with a JSON Pointer to the field that caused it.

The story starts out broken on purpose. Try fixing it: correct the typo in `goto`, rename the duplicate id, make `at` positive, move the hotspot inside the frame, and give the polygon at least three `points`.

<ValidationPlayground />

## Code

```ts
import { validateStory } from "@iv-player/core";

const result = validateStory(JSON.parse(text));

if (result.valid) {
  player.story = result.story;
} else {
  for (const { path, code, message } of result.errors) {
    console.error(`${path} (${code}): ${message}`);
  }
}
```

See [Validating stories](/guide/validation) for every error code.
