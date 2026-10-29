---
description: "Reference for validateStory, answerRange, hotspotGeometryAt, boundsOf, isAnimated and VERSION from @ivkit/core."
---

# Utilities

Everything on this page is exported from `@ivkit/core`.

## `validateStory`

```ts
function validateStory(input: unknown, options?: StoryValidationOptions): StoryValidationResult;

interface StoryValidationOptions {
  /** Checks for cues, keyed by their `kind`. */
  cues?: Readonly<Record<string, CueCheck>>;
}

type CueCheck = (
  cue: Readonly<Record<string, unknown>>,
  report: (path: string, message: string) => void,
) => void;

type StoryValidationResult =
  | { valid: true; story: Story; errors: [] }
  | { valid: false; errors: StoryValidationError[] };

interface StoryValidationError {
  path: string; // JSON Pointer, "" for the root
  code:
    | "invalid_type"
    | "invalid_value"
    | "duplicate_id"
    | "missing_scene"
    | "missing_geometry"
    | "missing_variable"
    | "invalid_cue";
  message: string;
}
```

Checks parsed story data without modifying it or loading media, and reports every problem at once. `options.cues` adds a plugin's checks for cues of its `kind`, reported as `invalid_cue`. See [Validating stories](/guide/validation) for what each code means and [Plugins' cues](/guide/validation#plugins-cues) for `CueCheck`.

## `answerRange`

```ts
function answerRange(
  question: { multiple?: boolean; min?: number; max?: number },
  offered: number,
): [min: number, max: number];
```

The fewest and most options an answer to `question` takes when `offered` options are shown. A question takes exactly one unless it's `multiple`. Then `min` defaults to `1` and is capped to `offered`, so options hidden by their `if` never make it unanswerable, and `max` defaults to `offered`. It's the rule `StoryEngine.answer()` applies, so custom question UIs can enable their confirm button with it.

## `hotspotGeometryAt`

```ts
function hotspotGeometryAt(hotspot: Hotspot, time: number): HotspotGeometry | null;

type HotspotGeometry =
  | { kind: "box"; area: Area; roundness: number }
  | { kind: "polygon"; points: readonly Point[] };
```

Where and how a hotspot is drawn at `time`, in seconds of the scene. With `keyframes`, it interpolates between the two around `time`. Returns `null` if the hotspot defines no usable geometry.

Rectangles and ellipses are both a `box`: `roundness` is `0` for a rectangle, `1` for an ellipse, and in between while one morphs into the other.

## `boundsOf`

```ts
function boundsOf(geometry: HotspotGeometry): Area;
```

The bounding box of a geometry. For a `box`, that's its `area`.

## `isAnimated`

```ts
function isAnimated(hotspot: Hotspot): boolean;
```

Whether a hotspot changes over time, meaning it has more than one keyframe and must be redrawn as the video plays.

## `VERSION`

```ts
const VERSION: string;
```

The installed version of `@ivkit/core`, the same as in its `package.json`. Useful in bug reports and logs.

```ts
import { VERSION } from "@ivkit/core";

console.log(VERSION); // "0.2.0"
```

`@ivkit/core` 0.1.0 reports `"0.0.0"` here by mistake. That's fixed in 0.1.1.
