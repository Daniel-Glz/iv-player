/**
 * Story format consumed by the IVKit engine.
 *
 * All times are in seconds, relative to the start of the scene's video.
 */

/** Unique identifier of a scene within a story. */
export type SceneId = string;

/** Root of an interactive video definition. */
export interface Story {
  /** Format version, e.g. `"0.1"`. */
  version: string;
  /** Scene the story starts at. Must be a key of `scenes`. */
  start: SceneId;
  /** Every scene of the story, keyed by its id. */
  scenes: Readonly<Record<SceneId, Scene>>;
}

/**
 * A single video clip plus the interactions that happen while it plays.
 *
 * When the video ends the engine goes to `next`; without `next` the story ends.
 */
export interface Scene {
  /** URL of the video for this scene. */
  src: string;
  /** Interactions triggered during playback, in any order. */
  events?: readonly SceneEvent[];
  /** Scene to play when this one finishes without branching. */
  next?: SceneId;
}

/**
 * Anything that can happen during a scene's timeline. Discriminated by `type`.
 */
export type SceneEvent = Question | Hotspot;

/** Pauses the video at `at` and asks the viewer to pick one of `options`. */
export interface Question {
  type: "question";
  /** Unique within the story; used to report answers. */
  id: string;
  /** Second of the scene at which the video pauses and the question shows. */
  at: number;
  /** Prompt shown to the viewer. */
  text: string;
  options: readonly Choice[];
}

/** One answer of a question. */
export interface Choice {
  /** Unique within its question. */
  id: string;
  /** Text shown to the viewer. */
  label: string;
  /** Scene to branch to. Without it, the current scene resumes. */
  goto?: SceneId;
}

/**
 * Clickable area shown over the video between `from` and `to`.
 * Unlike a question, it doesn't pause playback.
 *
 * Its geometry is either static (`area`, or `points` for polygons) or animated
 * through `keyframes`, which take precedence.
 */
export interface Hotspot {
  type: "hotspot";
  /** Unique within the story; used to report activations. */
  id: string;
  /** Second of the scene at which the hotspot appears. */
  from: number;
  /** Second at which it disappears. Without it, it lasts until the scene ends. */
  to?: number;
  /** Accessible name of the clickable area, e.g. for screen readers. */
  label: string;
  /** Scene to branch to when activated. Without it, activation is only reported. */
  goto?: SceneId;
  /** Default `"rect"`. */
  shape?: HotspotShape;
  /** Bounds of a static `rect` or `ellipse`. */
  area?: Area;
  /** Vertices of a static `polygon`. */
  points?: readonly Point[];
  /** Animated geometry, as seconds of the scene. Before the first and after the last, it holds still. */
  keyframes?: readonly HotspotKeyframe[];
  /**
   * How the player draws it. Built in: `"outline"` (default), `"pulse"`, `"label"`
   * (shows `label` as text) and `"hidden"` (invisible but clickable). Any other name
   * can be styled through `::part(hotspot-<variant>)`.
   */
  variant?: string;
}

/** Every `HotspotShape`, for checks at runtime. */
export const HOTSPOT_SHAPES = ["rect", "ellipse", "polygon"] as const;

export type HotspotShape = (typeof HOTSPOT_SHAPES)[number];

/** `[x, y]` in fractions (0–1) of the video frame. */
export type Point = readonly [x: number, y: number];

/**
 * Hotspot geometry at the second `at` of the scene. Fields left out fall back to
 * the hotspot's own `shape`, `area` and `points`.
 */
export interface HotspotKeyframe {
  at: number;
  shape?: HotspotShape;
  area?: Area;
  points?: readonly Point[];
  /**
   * Timing of the transition from this keyframe to the next (as in CSS). Default `"linear"`;
   * `"step"` holds this keyframe until the next one.
   */
  easing?: Easing;
}

/** Every `Easing`, for checks at runtime. */
export const EASINGS = ["linear", "ease-in-out", "step"] as const;

export type Easing = (typeof EASINGS)[number];

/**
 * Rectangle in fractions (0–1) of the video frame, from its top-left corner.
 * Relative to the picture itself, not the `<video>` element, so letterboxing
 * doesn't shift it.
 */
export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}
