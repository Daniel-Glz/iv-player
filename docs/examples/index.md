---
description: "Live examples of IVKit: branching stories, quizzes, hotspots, object tracking, theming, custom players and validation."
---

# Examples

Every example on these pages is a live player running the current version of the library. Click Play, answer questions and click hotspots, then look at the story and code under each one.

| Example | What it shows |
| --- | --- |
| [Branching story](./branching) | A question that sends the viewer down one of two paths. |
| [Quiz with retries](./quiz) | Right and wrong answers, with a loop back to the question. |
| [Hotspot shapes](./hotspot-shapes) | Rectangles, ellipses and polygons, the four built-in variants, and the events they report. |
| [Tracking a moving object](./tracking) | An animated hotspot that follows a ball across the video, frame by frame. |
| [Custom theme](./theming) | Custom properties, `::part()` and slots to restyle the whole player. |
| [Custom hotspot content](./custom-hotspots) | `renderHotspot` and custom variants to draw your own hotspots. |
| [Player built with core](./core-player) | Your own interface on top of `StoryEngine` and `MediaController`, without `<ivkit-player>`. |
| [Validation playground](./validation) | Edit a story and see what `validateStory` reports, as you type. |

The videos are generated placeholders, so that hotspots line up exactly with what they point at. You can recreate them with [the script in the repository](https://github.com/Daniel-Glz/ivkit/blob/main/docs/scripts/generate-example-videos.mjs).
