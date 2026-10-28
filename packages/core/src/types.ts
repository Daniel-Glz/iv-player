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
  /** Variables and their initial values. Conditions and `set` can only use these. */
  vars?: Readonly<Vars>;
}

/** Value of a story variable. */
export type VarValue = number | string | boolean;

/** Story variables, keyed by name. */
export type Vars = Record<string, VarValue>;

/**
 * Changes to variables, keyed by name: a new value, or `{ add }` to add to a number
 * (negative to subtract).
 */
export type VarChanges = Readonly<Record<string, VarValue | { add: number }>>;

/**
 * Test on the variable `var`. Every operator given must hold, so `{ gte: 1, lt: 5 }`
 * is a range. `gt`, `gte`, `lt` and `lte` compare numbers.
 */
export interface Condition {
  var: string;
  eq?: VarValue;
  ne?: VarValue;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
}

/** One condition, or several that must all hold. */
export type Conditions = Condition | readonly Condition[];

/** Branch taken when `if` holds. In a list, the first one that holds wins. */
export interface Branch {
  if: Conditions;
  goto: SceneId;
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
  /** Checked before `next` when the video ends; the first that holds is played instead. */
  branches?: readonly Branch[];
  /** Changes variables each time the scene is entered, e.g. to count visits. */
  set?: VarChanges;
}

/**
 * Anything that can happen during a scene's timeline. Discriminated by `type`.
 */
export type SceneEvent = Question | Hotspot;

/**
 * Pauses the video at `at` and asks the viewer to pick one of `options`, or
 * several with `multiple`.
 */
export interface Question {
  type: "question";
  /** Unique within the story; used to report answers. */
  id: string;
  /** Second of the scene at which the video pauses and the question shows. */
  at: number;
  /** Prompt shown to the viewer. */
  text: string;
  options: readonly Choice[];
  /**
   * Lets the viewer pick several options and confirm. Its options can't branch or
   * seek: the question's `goto`, `branches` and `seek` decide. Default `false`.
   */
  multiple?: boolean;
  /** Fewest options a `multiple` answer takes, at least 1. Default 1. */
  min?: number;
  /** Most options a `multiple` answer takes. Default: all of them. */
  max?: number;
  /** Scene to branch to when the picked option doesn't branch or seek. */
  goto?: SceneId;
  /** Checked before `goto`, after the options' `set`; the first that holds is branched to instead. */
  branches?: readonly Branch[];
  /** Second of the current scene to resume from when nothing branches. */
  seek?: number;
  /**
   * Seconds the question waits for an answer, counted in real time since the video
   * is paused. Then it answers with `default`, or else the question's `goto`,
   * `branches` and `seek` decide, or else the scene resumes.
   */
  timeout?: number;
  /** Option picked when `timeout` runs out, or a list of them for a `multiple` question. */
  default?: string | readonly string[];
}

/** One answer of a question. */
export interface Choice {
  /** Unique within its question. */
  id: string;
  /** Text shown to the viewer. */
  label: string;
  /** Scene to branch to. Without it, the question's `goto` applies, if any, or else the scene resumes. */
  goto?: SceneId;
  /** Checked before `goto`, after `set`; the first that holds is branched to instead. */
  branches?: readonly Branch[];
  /** Changes variables when the option is picked, in option order for `multiple` answers. */
  set?: VarChanges;
  /** Offers the option only while this holds. A question with no options left is skipped. */
  if?: Conditions;
  /**
   * Marks a right answer of a quiz. The `answer` event reports whether exactly the
   * right options were picked; score it with `set`.
   */
  correct?: boolean;
  /**
   * Second of the current scene to resume from when the option doesn't branch, e.g.
   * to replay a part before asking again. Re-arms the questions from there on.
   */
  seek?: number;
}

/**
 * Clickable area shown over the video between `from` and `to`.
 * Unlike a question, it doesn't pause playback unless `pause` is set.
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
  /** Checked before `goto`, after `set`; the first that holds is branched to instead. */
  branches?: readonly Branch[];
  /** Changes variables when the hotspot is activated. */
  set?: VarChanges;
  /** Shows the hotspot only while this holds. */
  if?: Conditions;
  /**
   * Second of the current scene to jump to when the hotspot doesn't branch.
   * Re-arms the questions from there on.
   */
  seek?: number;
  /**
   * Link the player opens in a new tab when the hotspot is activated. Only `http:`
   * and `https:` URLs open. Core only reports it.
   */
  href?: string;
  /**
   * Pause the video at `from`, once per visit, until the hotspot is activated
   * (which resumes playback without a `goto`) or the viewer resumes it. Default `false`.
   */
  pause?: boolean;
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
