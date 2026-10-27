---
description: "Live example: a video quiz that loops back to the question until it's answered right."
---

<script setup>
import { quiz } from "./stories/quiz";
</script>

# Quiz with retries

Wrong answers play a short "try again" clip whose `next` points back to the question scene. Every visit to a scene re-arms its questions, so the question is asked again until it's answered right.

<PlayerDemo :story="quiz" log />

## Story

<<< @/examples/stories/quiz.ts

## Scoring answers

Listen to `iv-answer` to keep score. The event's `detail` includes the question and the option that was picked:

```ts
let attempts = 0;

player.addEventListener("iv-answer", (event) => {
  const { question, choice } = event.detail;
  if (question.id !== "multiply") return;
  attempts++;
  if (choice.id === "42") {
    console.log(`Solved in ${attempts} ${attempts === 1 ? "try" : "tries"}`);
  }
});
```
