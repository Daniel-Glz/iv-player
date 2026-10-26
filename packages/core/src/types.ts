/**
 * Story format consumed by the iv-player engine.
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
 */
export interface Hotspot {
  type: "hotspot";
  /** Unique within the story; used to report activations. */
  id: string;
  /** Second of the scene at which the hotspot appears. */
  from: number;
  /** Second at which it disappears. Without it, it lasts until the scene ends. */
  to?: number;
  area: Area;
  /** Accessible name of the clickable area, e.g. for screen readers. */
  label: string;
  /** Scene to branch to when activated. Without it, activation is only reported. */
  goto?: SceneId;
}

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
