---
description: "Live example: a player plugin that turns chapter cues into a chapter menu over the video."
---

<script setup>
import { validateStory } from "@ivkit/core";
import { chaptered } from "./stories/chapters";
import { chapters, checkChapter } from "./plugins/chapters";

const result = validateStory(chaptered, { cues: { chapter: checkChapter } });
</script>

# Chapters plugin

The story marks four chapters of the Artemis I launch with `cue` events of kind `"chapter"`, each with its title in `data`. IVKit only reports which cues are active; a plugin does the rest:

- It reads every chapter cue of the story and draws a button for each one in its layer, over the video.
- It highlights the active chapter on each `cues` event.
- A click jumps to the chapter: within the current scene it seeks the video, and in another scene it calls `goTo()` and seeks once that scene is on screen.
- It also exports a check for chapter cues, so `validateStory` rejects a chapter without a title. This story passes it: {{ result.valid ? "no errors" : result.errors.map((e) => e.path).join(", ") }}.

<PlayerDemo :story="chaptered" :plugins="[chapters]" log />

<small>Video: NASA/Frank Michaux, <a href="https://images.nasa.gov/details/KSC-20221116--MH-FMX-01-0001-Artemis_1_slowmo_liftoff-3314595">Artemis I Slow Motion Liftoff</a>. NASA footage is in the public domain; its use here doesn't imply NASA's endorsement.</small>

## Plugin

<<< @/examples/plugins/chapters.ts

## Story

<<< @/examples/stories/chapters.ts
