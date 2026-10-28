import type { Story } from "@ivkit/core";
import { video } from "./video";

export const yellowstone: Story = {
  version: "0.1",
  start: "old-faithful",
  scenes: {
    "old-faithful": { src: video("yellowstone-old-faithful"), next: "overlook" },
    overlook: { src: video("yellowstone-overlook"), next: "boardwalk" },
    boardwalk: { src: video("yellowstone-boardwalk") },
  },
};

/** What the stories player writes over each scene. */
export const yellowstoneCaptions: Record<string, { place: string; text: string }> = {
  "old-faithful": {
    place: "Old Faithful · Upper Geyser Basin",
    text: "Erupts about every 90 minutes, as high as 56 m (184 ft).",
  },
  overlook: {
    place: "Grand Prismatic Spring · Overlook",
    text: "The largest hot spring in the United States, about 113 m (370 ft) across.",
  },
  boardwalk: {
    place: "Grand Prismatic Spring · Boardwalk",
    text: "Its rings of color are mats of microbes, each living at a different temperature.",
  },
};
