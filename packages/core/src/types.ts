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
 * Anything that can happen at a point in a scene's timeline.
 * Discriminated by `type`; more event kinds (e.g. hotspots) will join this union.
 */
export type SceneEvent = Question;

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
