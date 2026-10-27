import type { Story } from "@iv-player/core";
import { video } from "./video";

export const quiz: Story = {
  version: "0.1",
  start: "question",
  scenes: {
    question: {
      src: video("quiz-question"),
      events: [
        {
          type: "question",
          id: "multiply",
          at: 3,
          text: "What is 7 × 6?",
          options: [
            { id: "36", label: "36", goto: "wrong" },
            { id: "42", label: "42", goto: "right" },
            { id: "48", label: "48", goto: "wrong" },
          ],
        },
      ],
    },
    // Loops back to the question, which is asked again on every visit.
    wrong: { src: video("quiz-wrong"), next: "question" },
    right: { src: video("quiz-right") },
  },
};
