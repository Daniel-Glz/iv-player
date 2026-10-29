---
description: "Showcase: a vertical, stories-style player built on @ivkit/core, with progress bars, tap navigation and hold to pause, on Yellowstone footage."
---

<script setup>
import { yellowstone, yellowstoneCaptions } from "./stories/yellowstone";
</script>

# Stories player <Unreleased />

A vertical player in the style of social media stories, built on `@ivkit/core` without `<ivkit-player>`. Tap the right side to skip, the left side to go back, and hold anywhere to pause.

<StoriesDemo :story="yellowstone" :captions="yellowstoneCaptions" />

<small>Video: timelapses of <a href="https://commons.wikimedia.org/wiki/File:Old_Faithful_eruption_timelapse_(36948540241).webm">Old Faithful</a> and Grand Prismatic Spring from <a href="https://commons.wikimedia.org/wiki/File:Grand_Prismatic_Spring_Overlook_timelapse_(36254802534).webm">the overlook</a> and <a href="https://commons.wikimedia.org/wiki/File:Grand_Prismatic_Spring_boardwalk_timelapse_(36948603771).webm">the boardwalk</a>, by Yellowstone National Park, in the public domain.</small>

## What's in it

| Part of the player | How it's built |
| --- | --- |
| A progress bar per scene | The scenes in order, following each `next` from the story's `start`, filled with the active video's time from `MediaController.active`. |
| Tap right to skip | Seeking the video to its end, so the engine moves on to its `next`. |
| Tap left to go back | `engine.goTo()` with the previous scene, or the current one to restart it. |
| Hold to pause | `controller.pause()` and `controller.play()`. |

## Component

<<< @/.vitepress/theme/components/StoriesDemo.vue

## Story

<<< @/examples/stories/yellowstone.ts
