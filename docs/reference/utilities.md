---
description: "Reference for validateStory, hotspotGeometryAt, boundsOf, isAnimated and VERSION from @ivkit/core."
---

# Utilities

Everything on this page is exported from `@ivkit/core`.

## `validateStory`

```ts
function validateStory(input: unknown): StoryValidationResult;

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
    | "missing_variable";
  message: string;
}
```

Checks parsed story data without modifying it or loading media. See [Validating stories](/guide/validation).

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

console.log(VERSION); // "0.1.1"
```

`@ivkit/core` 0.1.0 reports `"0.0.0"` here by mistake. That's fixed in 0.1.1.
