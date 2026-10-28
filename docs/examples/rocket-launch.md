---
description: "Showcase: an interactive lesson on real NASA footage of the Artemis I launch, with hotspots on the rocket's parts, a tracking hotspot and a scored quiz."
---

<script setup>
import { launch, launchLesson } from "./stories/launch";
</script>

# Lesson: a rocket launch

An interactive science lesson built on real footage: NASA's slow-motion video of the Artemis I launch, on 16 November 2022. The video stops on each part of the rocket to explain it, then asks two questions, with feedback that depends on the answer.

<LessonDemo :story="launch" :lesson="launchLesson" />

<small>Video: NASA/Frank Michaux, <a href="https://images.nasa.gov/details/KSC-20221116--MH-FMX-01-0001-Artemis_1_slowmo_liftoff-3314595">Artemis I Slow Motion Liftoff</a>. NASA footage is in the public domain; its use here doesn't imply NASA's endorsement.</small>

## What's in it

| Part of the lesson | How it's built |
| --- | --- |
| Rocket parts that light up one by one | Hotspots with staggered `from` times and the `pulse` variant. |
| A stop on each new part | The page, listening to the engine's `hotspots` event and pausing when a hotspot appears. |
| Both boosters as a single target | A `polygon` hotspot shaped like a U, around the core stage. |
| A target that climbs with the rocket | A hotspot with a keyframe per second, measured on the footage. |
| Feedback for each answer | Choices that `goto` short feedback scenes, whose `next` rejoins the lesson. |
| Fact cards, progress and score | The page, listening to `iv-hotspot`, `iv-answer` and `iv-end`. |

The story only describes the video. Everything under the player is the page reacting to the player's events, so the same story could feed a learning platform's own progress tracking instead.

## Story

<<< @/examples/stories/launch.ts

## Reacting to the lesson

Stop on each part as it appears, so it stays in view while the viewer reads about it. `<ivkit-player>` has no event for hotspots appearing, but its [engine](/reference/engine) reports every change to the hotspots on screen. Subscribe after setting the story, since setting it creates a new engine:

```ts
import { launch, launchLesson } from "./launch.js";

const player = document.querySelector("ivkit-player");
const answered = new Set();
let shown = new Set();
let score = 0;

function explain(id) {
  const fact = launchLesson.facts[id];
  if (!fact) return;
  player.pause();
  showCard(fact.title, fact.text, () => player.play());
}

player.story = launch;

player.engine.on("hotspots", ({ hotspots }) => {
  const appeared = hotspots.find((hotspot) => !shown.has(hotspot.id));
  for (const hotspot of hotspots) shown.add(hotspot.id);
  if (appeared) explain(appeared.id);
});

// Each visit to a scene shows its parts again.
player.addEventListener("iv-scene", () => {
  shown = new Set();
});

// Clicking a part explains it again.
player.addEventListener("iv-hotspot", (event) => explain(event.detail.hotspot.id));

player.addEventListener("iv-answer", (event) => {
  const { question, choice } = event.detail;
  if (answered.has(question.id)) return;
  answered.add(question.id);
  if (launchLesson.answers[question.id] === choice.id) score++;
});

player.addEventListener("iv-end", () => {
  reportCompletion({ score, total: Object.keys(launchLesson.answers).length });
});
```
