---
description: "Write IVKit stories: scenes, questions, branching, loops and how questions are timed, with tips for seamless transitions."
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

## Jumping from code

`goTo(sceneId)` enters any scene, wherever the story is. Use it for whatever the story format can't express: branching on a score, resuming where the viewer left off, chapter menus or a "back" button.

```ts
const player = document.querySelector("ivkit-player")!;
player.story = story;

// Resume a saved story.
const saved = localStorage.getItem("scene");
player.addEventListener("iv-scene", (event) => {
  localStorage.setItem("scene", event.detail.sceneId);
});
if (saved && saved in story.scenes) player.goTo(saved);

// Branch on the score once the quiz is over.
let score = 0;
player.addEventListener("iv-answer", (event) => {
  if (event.detail.choice.id === "four") score++;
});
player.addEventListener("iv-end", () => {
  player.goTo(score >= 3 ? "passed" : "failed");
});
```

Like `play()`, `goTo()` starts playback, so browsers may block it without a user gesture. If they do, the player shows its Play button. With `@ivkit/core`, call [`engine.goTo()`](/reference/engine#goto-sceneid-sceneid-void) instead.

## Seamless transitions

The player stacks two videos. While one plays, the other preloads the most likely next scene: the scene's `next`, or else the first scene any of its options or hotspots point to. On a scene change, the current video holds its last frame until the next one can draw its first frame, so there's no black flash between scenes.

For the smoothest transitions:

- Encode every scene with the same resolution and aspect ratio.
- Serve videos with `Accept-Ranges` and fast-start (`moov` atom first, e.g. `ffmpeg -movflags +faststart`).
- Keep scenes short. Each video only needs to buffer a few seconds ahead.

## Ids must be unique

Question and hotspot ids are unique across the **whole story**, because they're how answers and activations are reported. Option ids are unique within their question. [`validateStory`](/guide/validation) checks this for you.
