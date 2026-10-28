import type { Branch, Story } from "@ivkit/core";
import { video } from "./video";

/** After the last answer: start over until both are right, three attempts at most. */
const retry: Branch = {
  if: [
    { var: "score", lt: 2 },
    { var: "attempts", lt: 3 },
  ],
  goto: "pad",
};

export const timedQuiz: Story = {
  version: "0.1",
  start: "pad",
  vars: { attempts: 0, score: 0 },
  scenes: {
    pad: {
      src: video("launch-pad"),
      // Every attempt counts, and starts from a score of zero.
      set: { attempts: { add: 1 }, score: 0 },
      events: [
        {
          type: "hotspot",
          id: "hint",
          from: 1,
          to: 9,
          label: "Hint: boosters can't be shut off once lit",
          variant: "label",
          area: { x: 0.03, y: 0.05, width: 0.42, height: 0.1 },
          // Only from the second attempt on.
          if: { var: "attempts", gte: 2 },
        },
        {
          type: "question",
          id: "ignition",
          at: 9,
          text: "The engines are starting up. When do the two boosters light?",
          timeout: 8,
          // Without a default, running out of time goes here.
          goto: "boosters-wrong",
          options: [
            { id: "now", label: "Right now, with the engines", goto: "boosters-wrong" },
            {
              id: "liftoff",
              label: "A few seconds later, at liftoff",
              correct: true,
              set: { score: { add: 1 } },
              goto: "boosters-right",
            },
            { id: "air", label: "Once the rocket is in the air", goto: "boosters-wrong" },
          ],
        },
      ],
    },
    "boosters-right": { src: video("launch-boosters-right"), next: "liftoff" },
    "boosters-wrong": { src: video("launch-boosters-wrong"), next: "liftoff" },
    liftoff: {
      src: video("launch-liftoff"),
      events: [
        {
          type: "question",
          id: "crew",
          at: 14.5,
          text: "Orion is on its way to the Moon. Who is on board?",
          timeout: 6,
          // Hesitating counts as the most common guess.
          default: "four",
          options: [
            { id: "four", label: "Four astronauts", goto: "crew-wrong" },
            {
              id: "nobody",
              label: "No one: it's a test flight",
              correct: true,
              set: { score: { add: 1 } },
              goto: "crew-right",
            },
            { id: "one", label: "One pilot", goto: "crew-wrong" },
          ],
        },
      ],
    },
    "crew-right": { src: video("launch-crew-right"), branches: [retry] },
    "crew-wrong": { src: video("launch-crew-wrong"), branches: [retry] },
  },
};
