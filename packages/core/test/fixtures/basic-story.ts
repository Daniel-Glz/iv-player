import type { Story } from "../../src/index";

/** Two-way branch that converges on a shared ending. */
export const basicStory = {
  version: "0.1",
  start: "intro",
  scenes: {
    intro: {
      src: "intro.mp4",
      events: [
        {
          type: "question",
          id: "q1",
          at: 10,
          text: "¿A dónde vamos?",
          options: [
            { id: "a", label: "Al bosque", goto: "bosque" },
            { id: "b", label: "Al río", goto: "rio" },
          ],
        },
      ],
    },
    bosque: { src: "bosque.mp4", next: "final" },
    rio: { src: "rio.mp4", next: "final" },
    final: { src: "final.mp4" },
  },
} as const satisfies Story;
