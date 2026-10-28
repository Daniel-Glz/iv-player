---
description: "Showcase: rectangular hotspots that follow six cars through a roundabout in real drone footage, with keyframes measured by tracking each car."
---

<script setup>
import { traffic } from "./stories/traffic";
</script>

# Following traffic

Six cars driving through a roundabout, each followed by its own rectangular hotspot. The rectangles turn with the cars through the curves, appear when a car drives into the picture and disappear when it leaves. Click a car while it moves, and the log under the player shows which one.

<PlayerDemo :story="traffic" log />

<small>Video: <a href="https://commons.wikimedia.org/wiki/File:Roundabout_14_61.webm">Roundabout 14 61</a> by Wikideas1, a roundabout on US 14/61 in La Crosse, Wisconsin, released under CC0.</small>

## What's in it

| Part of the showcase | How it's built |
| --- | --- |
| Six moving targets at once | Six hotspots in one scene, each with its own `keyframes`. |
| Boxes that turn with the cars | Each keyframe has its own `area`: wider than tall while a car drives across, taller than wide while it drives up or down. |
| Cars that enter and leave the picture | The first keyframe sets `from`, and `to` removes a hotspot once its car is gone. |
| Feedback that follows the pickup | Both answers replay the same video in a new scene. One hotspot pulses on the pickup, and a second one, on the same path moved up, shows the feedback with the `label` variant. |

Pause with <kbd>Space</kbd> or seek with <kbd>←</kbd> <kbd>→</kbd>: every box is computed from the video's current time, so they stay on their cars at any frame, not only while playing.

## Story

<<< @/examples/stories/traffic.ts
