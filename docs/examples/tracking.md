---
description: "Live example: an animated hotspot that follows a moving object frame by frame, using keyframes."
---

<script setup>
import { tracking } from "./stories/tracking";
</script>

# Tracking a moving object

The ball's hotspot has three keyframes that follow the ball's path through the video. Click the ball before it stops to catch it. If the video ends first, the scene continues to its `next`.

<PlayerDemo :story="tracking" log />

Pause the video with <kbd>Space</kbd> or seek with <kbd>←</kbd> <kbd>→</kbd>: the hotspot stays on the ball, because its position is computed from the video's time, not from an animation that runs on its own. Where the browser supports `requestVideoFrameCallback`, it moves exactly when each frame is shown.

## Story

<<< @/examples/stories/tracking.ts

## Getting keyframes from your own video

1. Pause the video where the object starts moving, changes direction or stops, and write down the time.
2. Measure the object's box in pixels and divide by the video's size to get fractions:

   ```ts
   const area = (x: number, y: number, width: number, height: number) => ({
     x: x / 1920,
     y: y / 1080,
     width: width / 1920,
     height: height / 1080,
   });
   ```

3. Add a keyframe for each time. Use `ease-in-out` for motion that speeds up and slows down, and `step` for jumps.

Keyframes can also change the shape: a `rect` keyframe followed by an `ellipse` one morphs smoothly between them.

Learn more: [Animation](/guide/hotspots#animation) · [Coordinates](/guide/hotspots#coordinates) · [`hotspotGeometryAt`](/reference/utilities#hotspotgeometryat)
