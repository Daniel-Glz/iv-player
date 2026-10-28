---
description: "Write IVKit stories: scenes, questions, branching, loops and how questions are timed, with tips for smooth scene changes."
---

# Writing stories

A story is a plain object, so you can write it in TypeScript, load it as JSON, or generate it from a CMS.

```ts
import type { Story } from "@ivkit/core";

export const story: Story = {
  version: "0.1",
  start: "intro",
  scenes: {
    intro: { src: "/videos/intro.mp4", next: "middle" },
    middle: { src: "/videos/middle.mp4", next: "outro" },
    outro: { src: "/videos/outro.mp4" },
  },
};
```

All times are in **seconds from the start of the scene's video**.

## Scenes

Each scene has:

- `src`: the URL of its video.
- `events` (optional): questions and hotspots that happen while it plays.
- `next` (optional): the scene to play when the video ends. Without it, the story ends.

Scenes are keyed by id in `scenes`, and `start` names the first one.

## Questions

A question pauses the video at `at` and shows its options. The video stays paused until the viewer picks one.

```ts
{
  type: "question",
  id: "door",
  at: 12.5,
  text: "Which door do you open?",
  options: [
    { id: "red", label: "The red one", goto: "red-room" },
    { id: "blue", label: "The blue one", goto: "blue-room" },
    { id: "none", label: "Neither" },
  ],
}
```

- An option with `goto` branches to that scene from its beginning.
- An option without `goto` resumes the current video from the question's `at`. If the video had already ended, the scene continues to `next`.

### How questions are timed

- Each question fires **once per visit** to its scene. Entering the scene again, for example through a loop, re-arms its questions.
- If the viewer seeks past several questions, only the earliest one fires. The rest follow after it's answered.
- A question near the end of the video is still asked, even if playback ended between two time updates.
- The player pauses on the question's exact frame, not wherever playback was when it noticed.

### Correct answers and replays

Mark the right options of a quiz with `correct`. The `answer` event (`iv-answer` in the player) reports `correct: true` when exactly those options were picked, so combine it with [`set`](#variables-and-conditions) to keep a score.

`seek` sends the viewer back, or forward, within the same scene when the option doesn't branch. The questions from there on are asked again, so a wrong answer can replay the explanation:

```ts
options: [
  { id: "four", label: "4", correct: true, set: { score: { add: 1 } } },
  { id: "five", label: "5", seek: 12 }, // replays from 0:12, then asks again
]
```

### Several answers

With `multiple: true` the viewer picks several options and confirms. `min` and `max` bound how many. Every picked option's `set` applies, in option order, and then the question decides where to go with its own `branches`, `goto` and `seek`, because options pointing to different scenes would clash. That's why the options of a `multiple` question can't have them.

```ts
{
  type: "question",
  id: "primes",
  at: 20,
  text: "Which are prime?",
  multiple: true,
  options: [
    { id: "two", label: "2", correct: true, set: { score: { add: 1 } } },
    { id: "four", label: "4", set: { score: { add: -1 } } },
    { id: "five", label: "5", correct: true, set: { score: { add: 1 } } },
  ],
  branches: [{ if: { var: "score", gte: 2 }, goto: "well-done" }],
  seek: 8, // otherwise, replay the explanation
}
```

Single questions can use the question's `goto`, `branches` and `seek` too, as a fallback for the options that neither branch nor seek.

## Branching and loops

`goto` and `next` can point to any scene, including earlier ones, so stories can loop:

```ts
scenes: {
  quiz: {
    src: "/videos/quiz.mp4",
    events: [
      {
        type: "question",
        id: "answer",
        at: 8,
        text: "What is 2 + 2?",
        options: [
          { id: "four", label: "4", goto: "correct" },
          { id: "five", label: "5", goto: "try-again" },
        ],
      },
    ],
  },
  "try-again": { src: "/videos/try-again.mp4", next: "quiz" },
  correct: { src: "/videos/correct.mp4" },
}
```

## Variables and conditions

Declare variables with their initial values in `vars`. Choices, hotspots and scenes change them with `set`, and pick where to go with `branches`: the first branch whose `if` holds wins, and without one the story falls back to `goto` or `next`.

This quiz keeps a score and sends the viewer to a different ending depending on it:

```ts
const story: Story = {
  version: "0.1",
  start: "q1",
  vars: { score: 0 },
  scenes: {
    q1: {
      src: "/videos/q1.mp4",
      next: "q2",
      events: [
        {
          type: "question",
          id: "q1",
          at: 8,
          text: "What is 2 + 2?",
          options: [
            { id: "four", label: "4", set: { score: { add: 1 } } },
            { id: "five", label: "5" },
          ],
        },
      ],
    },
    q2: {
      src: "/videos/q2.mp4",
      branches: [{ if: { var: "score", gte: 1 }, goto: "passed" }],
      next: "failed",
      // ...
    },
    passed: { src: "/videos/passed.mp4" },
    failed: { src: "/videos/failed.mp4" },
  },
};
```

- `set` gives a variable a new value, or adds to a number with `{ add: n }`. Use a negative `n` to subtract.
- A condition tests one variable with `eq`, `ne`, `gt`, `gte`, `lt` or `lte`. Every operator in it must hold, so `{ var: "score", gte: 1, lt: 3 }` is a range. `if` also takes a list of conditions that must all hold. For "or", add one branch for each case.
- A choice's `set` applies before its `branches` are checked, so they see the new score.
- A scene's `set` applies each time the scene is entered. Use it to count visits or mark a path as seen: `set: { "saw-forest": true }`.

`if` on a choice offers it only while it holds, and on a hotspot shows it only while it holds. If none of a question's options hold, the question is skipped:

```ts
{ id: "unlock", label: "Use the key", if: { var: "key", eq: true }, goto: "vault" }
```

Variables reset when the story starts again. Read them with `engine.vars` and follow changes with the engine's `vars` event, e.g. to show the score on screen.

## Jumping from code

`goTo(sceneId)` enters any scene, wherever the story is. Use it for whatever the story format can't express: resuming where the viewer left off, chapter menus or a "back" button.

```ts
const player = document.querySelector("ivkit-player")!;
player.story = story;

// Resume a saved story.
const saved = localStorage.getItem("scene");
player.addEventListener("iv-scene", (event) => {
  localStorage.setItem("scene", event.detail.sceneId);
});
if (saved && saved in story.scenes) player.goTo(saved);

```

To resume with the variables too, save `player.engine.vars` and restore each one with `engine.setVar(name, value)` before calling `goTo()`.

Like `play()`, `goTo()` starts playback, so browsers may block it without a user gesture. If they do, the player shows its Play button. With `@ivkit/core`, call [`engine.goTo()`](/reference/engine#goto-sceneid-sceneid-void) instead.

## Scene changes without a black frame

The player stacks two videos. While one plays, the other preloads the most likely next scene: the scene's `next`, or else the first scene any of its options or hotspots point to. On a scene change, the current video holds its last frame until the next one can draw its first frame, so there's no black flash between scenes.

For the smoothest scene changes:

- Encode every scene with the same resolution and aspect ratio.
- Serve videos with `Accept-Ranges` and fast-start (`moov` atom first, e.g. `ffmpeg -movflags +faststart`).
- Keep scenes short. Each video only needs to buffer a few seconds ahead.

## Ids must be unique

Question and hotspot ids are unique across the **whole story**, because they're how answers and activations are reported. Option ids are unique within their question. [`validateStory`](/guide/validation) checks this for you.
