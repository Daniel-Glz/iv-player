import type { Story } from "@iv-player/core";
import { video } from "./video";

export const adventure: Story = {
  version: "0.1",
  start: "intro",
  scenes: {
    intro: {
      src: video("adventure-intro"),
      events: [
        {
          type: "question",
          id: "path",
          at: 4,
          text: "Where do you want to go?",
          options: [
            { id: "forest", label: "Into the forest", goto: "forest" },
            { id: "city", label: "To the city", goto: "city" },
          ],
        },
      ],
    },
    forest: { src: video("adventure-forest") },
    city: { src: video("adventure-city") },
  },
};
