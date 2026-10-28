import type { Story } from "@ivkit/core";
import { video } from "./video";

/** The launch in two scenes, split into four chapters with cues. */
export const chaptered: Story = {
  version: "0.1",
  start: "pad",
  scenes: {
    pad: {
      src: video("launch-pad"),
      next: "liftoff",
      events: [
        { type: "cue", id: "pad", kind: "chapter", from: 0, to: 5, data: { title: "On the pad" } },
        { type: "cue", id: "engines", kind: "chapter", from: 5, data: { title: "Engines start" } },
      ],
    },
    liftoff: {
      src: video("launch-liftoff"),
      events: [
        { type: "cue", id: "liftoff", kind: "chapter", from: 0, to: 7, data: { title: "Liftoff" } },
        { type: "cue", id: "climb", kind: "chapter", from: 7, data: { title: "Climbing out" } },
      ],
    },
  },
};
