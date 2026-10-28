---
description: "Live example: a timed video quiz with a score kept in story variables, a hint that shows on retries and a loop until both answers are right."
---

<script setup>
import { timedQuiz } from "./stories/timed-quiz";
</script>

# Timed quiz with a score

Two questions on the Artemis I launch, each with a countdown. The score lives in the story's variables, and the story uses it to decide whether to start over:

- The first question has 8 seconds and no `default`, so running out of time goes to the question's own `goto`, the "Not quite" clip.
- The second has 6 seconds and a `default`, so hesitating counts as answering "Four astronauts".
- Right answers add to `score` with `set`. Entering the first scene adds to `attempts` and resets `score`.
- After the last answer, a `branch` starts over while `score` is below 2, up to three attempts.
- From the second attempt on, a hint shows on the video: a hotspot with an `if` on `attempts`.

<PlayerDemo :story="timedQuiz" log />

<small>Video: NASA/Frank Michaux, <a href="https://images.nasa.gov/details/KSC-20221116--MH-FMX-01-0001-Artemis_1_slowmo_liftoff-3314595">Artemis I Slow Motion Liftoff</a>. NASA footage is in the public domain; its use here doesn't imply NASA's endorsement.</small>

The log shows the player's events, with the variables after each one.

## Story

<<< @/examples/stories/timed-quiz.ts
