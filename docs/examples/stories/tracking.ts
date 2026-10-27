import type { Story } from "@ivkit/core";
import { video } from "./video";

export const tracking: Story = {
  version: "0.1",
  start: "chase",
  scenes: {
    chase: {
      src: video("tracking"),
      // Reached only if the viewer doesn't catch the ball.
      next: "missed",
      events: [
        {
          type: "hotspot",
          id: "ball",
          from: 1,
          label: "The ball",
          goto: "caught",
          shape: "ellipse",
          variant: "pulse",
          // Same path as the ball in the video: it moves in straight lines
          // between these points, so linear easing keeps them together.
          keyframes: [
            { at: 1, area: { x: 0.08, y: 0.6, width: 0.1, height: 0.1778 } },
            { at: 4, area: { x: 0.45, y: 0.15, width: 0.1, height: 0.1778 } },
            { at: 7, area: { x: 0.8, y: 0.55, width: 0.1, height: 0.1778 } },
          ],
        },
      ],
    },
    caught: { src: video("tracking-caught") },
    missed: { src: video("tracking-missed") },
  },
};
