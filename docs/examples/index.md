---
description: "Live examples of IVKit: branching stories, quizzes, hotspots, object tracking, theming, custom players and validation."
---

# Examples

Every example on these pages is a live player running the latest code of the library, which may include features that aren't on npm yet. The [changelog](/changelog) lists those under Unreleased. Click Play, answer questions and click hotspots, then look at the story and code under each one.

The stories get their video URLs from a small `video("name")` helper that points to this site's clips. In your own stories, use your videos' URLs instead.

| Example | What it shows |
| --- | --- |
| [Branching story](./branching) | A question that sends the viewer down one of two paths. |
| [Quiz with retries](./quiz) | Right and wrong answers, with a loop back to the question. |
| [Timed quiz with a score](./timed-quiz) | Countdowns, a score in story variables, a hint shown by a condition and a retry branch. |
| [Hotspot shapes](./hotspot-shapes) | Rectangles, ellipses and polygons, the four built-in variants, and the events they report. |
| [Tracking a moving object](./tracking) | An animated hotspot that follows a ball across the video, frame by frame. |
| [Custom theme](./theming) | Custom properties, `::part()` and slots to restyle the whole player. |
| [Custom hotspot content](./custom-hotspots) | `renderHotspot` and custom variants to draw your own hotspots. |
| [Chapters plugin](./chapters-plugin) | Chapter cues in the story, and a player plugin that shows them as a menu over the video. |
| [Player built with core](./core-player) | Your own interface on top of `StoryEngine` and `MediaController`, without `<ivkit-player>`. |
| [Validation playground](./validation) | Edit a story and see what `validateStory` reports, as you type. |

## Showcase

Complete interactive videos built on real footage, the way you'd use IVKit in a product.

| Showcase | What it shows |
| --- | --- |
| [Lesson: a rocket launch](./rocket-launch) | An educational video of the Artemis I launch, with parts to explore, a hotspot that follows the rocket, a scored quiz and feedback scenes. |
| [Following traffic](./traffic) | Drone footage of a roundabout, with a rectangular hotspot following each of six cars through the curves, and a question about where one of them went. |
| [Stories player](./stories-player) | A vertical player in the style of social media stories, built on `@ivkit/core`, with progress bars, tap navigation and hold to pause, on Yellowstone footage. |

## About the videos

The videos of the examples above are generated placeholders, so that hotspots line up exactly with what they point at. The showcases use public-domain and CC0 footage.
