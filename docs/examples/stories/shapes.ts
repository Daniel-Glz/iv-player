import type { Story } from "@iv-player/core";
import { video } from "./video";

export const shapes: Story = {
  version: "0.1",
  start: "shapes",
  scenes: {
    shapes: {
      src: video("shapes"),
      events: [
        {
          type: "hotspot",
          id: "door",
          from: 0,
          label: "The door",
          area: { x: 0.1, y: 0.35, width: 0.16, height: 0.5 },
        },
        {
          type: "hotspot",
          id: "sun",
          from: 0,
          label: "The sun",
          shape: "ellipse",
          variant: "pulse",
          area: { x: 0.42, y: 0.15, width: 0.16, height: 0.3 },
        },
        {
          type: "hotspot",
          id: "mountain",
          from: 0,
          label: "Mountain",
          shape: "polygon",
          variant: "label",
          points: [
            [0.66, 0.85],
            [0.81, 0.4],
            [0.96, 0.85],
          ],
        },
        {
          type: "hotspot",
          id: "key",
          from: 0,
          label: "A hidden key",
          variant: "hidden",
          area: { x: 0.875, y: 0.08, width: 0.05, height: 0.09 },
        },
      ],
    },
  },
};
