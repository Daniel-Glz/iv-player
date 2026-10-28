import { Emitter } from "./emitter.js";
import { answerRange } from "./question.js";
import type {
  Branch,
  Choice,
  Conditions,
  Cue,
  Hotspot,
  Question,
  Scene,
  SceneId,
  Story,
  VarChanges,
  VarValue,
  Vars,
} from "./types.js";

// Core has no DOM or Node types, but every JavaScript runtime has these timers.
declare function setTimeout(callback: () => void, ms: number): unknown;
declare function clearTimeout(handle: unknown): void;

/**
 * - `idle`: created, `start()` not called yet.
 * - `playing`: a scene is active and its video should be playing.
 * - `interacting`: a question is showing; the video should stay paused.
 * - `ended`: the story finished.
 */
export type EngineState = "idle" | "playing" | "interacting" | "ended";

export interface EngineEvents {
  /** A scene became active: load and play `scene.src` from the beginning. */
  scene: { sceneId: SceneId; scene: Scene };
  /** Pause the video and show `question` with `options`, the ones whose `if` holds. */
  interaction: { sceneId: SceneId; question: Question; options: readonly Choice[] };
  /**
   * The viewer picked `choices`, in option order (only one unless the question is
   * `multiple`), and the answer branches to `goto`, if defined. `choice` is the first
   * of them. `correct` says whether exactly the options marked `correct` were picked;
   * it's `undefined` if no offered option has `correct`. Followed by `scene`,
   * `resume` or `end`.
   */
  answer: {
    sceneId: SceneId;
    question: Question;
    choice: Choice;
    choices: readonly Choice[];
    correct: boolean | undefined;
    goto: SceneId | undefined;
  };
  /**
   * Nobody answered `question` within its `timeout`. Followed by `answer` with its
   * `default`, if offered, or else by `scene`, `resume` or `end` as the question decides.
   */
  timeout: { sceneId: SceneId; question: Question };
  /** The answer or hotspot didn't branch: resume the current video from `time`. */
  resume: { sceneId: SceneId; time: number };
  /** The set of visible hotspots changed: render exactly `hotspots` (possibly none). */
  hotspots: { sceneId: SceneId; hotspots: readonly Hotspot[] };
  /** The set of active cues changed: `cues` are exactly the active ones (possibly none). */
  cues: { sceneId: SceneId; cues: readonly Cue[] };
  /** A hotspot with `pause` appeared: pause the video at `hotspot.from`. */
  pause: { sceneId: SceneId; hotspot: Hotspot };
  /**
   * The viewer activated `hotspot`, which branches to `goto`, if defined. Followed by
   * `scene` if it branches; if not, a hotspot with `pause` resumes playback.
   */
  hotspot: { sceneId: SceneId; hotspot: Hotspot; goto: SceneId | undefined };
  /** Variables changed, through `set` or `setVar()`. */
  vars: { vars: Readonly<Vars> };
  /** The story finished on `sceneId`. */
  end: { sceneId: SceneId };
}

/** Hotspots on screen and active cues. */
interface Shown {
  hotspots: readonly Hotspot[];
  cues: readonly Cue[];
}

/** A scene's events split by kind, questions sorted by `at`. */
interface Timeline {
  questions: readonly Question[];
  hotspots: readonly Hotspot[];
  cues: readonly Cue[];
}

/**
 * Drives a story from playback time alone; it never touches media or the DOM.
 *
 * Feed it with `update(currentTime)` while the video plays and `mediaEnded()`
 * when it finishes, react to its events, and report the viewer's actions with
 * `answer()` and `activate()`.
 *
 * Each question fires once per visit to its scene, as soon as playback reaches
 * its `at`. Seeking past several questions fires only the earliest; the rest
 * follow after it's answered. Re-entering a scene re-arms its questions.
 *
 * Hotspots are visible while `from <= currentTime < to`, recomputed on every
 * update, so they stay correct after seeking in either direction. They're
 * hidden while a question is showing and when leaving the scene. A hotspot with
 * `pause` emits `pause` the first time it shows in each visit; the engine stays
 * `playing` meanwhile, so it can be activated.
 *
 * Cues are active while `from <= currentTime < to`, like hotspots, but they stay
 * active while a question is showing. Both are cleared when leaving the scene.
 *
 * Variables start from `story.vars` and reset on `start()`. A `set` applies before
 * its `branches` are checked, so they see the new values. Conditions are checked
 * when needed: hotspots on every update, options when their question shows.
 *
 * The story is trusted as-is: a reference to a missing scene throws when reached.
 */
export class StoryEngine extends Emitter<EngineEvents> {
  private _state: EngineState = "idle";
  private sceneId: SceneId | null = null;
  private timeline: Timeline = { questions: [], hotspots: [], cues: [] };
  /** Questions of the current scene that haven't fired yet, sorted by `at`. */
  private pending: Question[] = [];
  private question: Question | null = null;
  /** Options of `question` offered to the viewer. */
  private options: readonly Choice[] = [];
  private values: Vars;
  private shown: Shown = { hotspots: [], cues: [] };
  /** Hotspots with `pause` that already paused during this visit. */
  private readonly paused = new Set<Hotspot>();
  private hasMediaEnded = false;
  /** Pending `timeout` of the question on screen. */
  private timer: unknown;
  private readonly timelines = new Map<SceneId, Timeline>();

  constructor(readonly story: Story) {
    super();
    if (!story.scenes[story.start]) {
      throw new Error(`Start scene "${story.start}" does not exist`);
    }
    this.values = { ...story.vars };
  }

  get state(): EngineState {
    return this._state;
  }

  get currentSceneId(): SceneId | null {
    return this.sceneId;
  }

  /** Question waiting for an answer, if any. */
  get activeQuestion(): Question | null {
    return this.question;
  }

  /** Hotspots currently on screen. */
  get visibleHotspots(): readonly Hotspot[] {
    return this.shown.hotspots;
  }

  /** Cues currently active. */
  get activeCues(): readonly Cue[] {
    return this.shown.cues;
  }

  /** Current values of the story's variables. */
  get vars(): Readonly<Vars> {
    return this.values;
  }

  /** Enters the start scene with the initial variables. Calling it again restarts the story. */
  start(): void {
    this.values = { ...this.story.vars };
    this.enter(this.story.start);
  }

  /**
   * Sets the variable `name`, e.g. to restore a saved story before `goTo()`.
   * Conditions see the new value from then on.
   */
  setVar(name: string, value: VarValue): void {
    this.change({ [name]: value });
  }

  /**
   * Jumps to `sceneId` from any state, dismissing the question on screen, if any.
   * Works before `start()` too, e.g. to resume a saved story.
   * Throws if the scene doesn't exist.
   */
  goTo(sceneId: SceneId): void {
    this.enter(sceneId);
  }

  /** Reports the current playback time (seconds) of the active scene's video. */
  update(currentTime: number): void {
    if (this._state !== "playing") return;
    const within = <T extends Hotspot | Cue>(events: readonly T[]) =>
      events.filter(
        (e) =>
          currentTime >= e.from && (e.to === undefined || currentTime < e.to) && this.test(e.if),
      );
    this.show("cues", within(this.timeline.cues));
    const next = this.pending[0];
    if (next !== undefined && currentTime >= next.at) {
      this.ask();
      return;
    }
    this.show("hotspots", within(this.timeline.hotspots));
    const hold = this.shown.hotspots.find((h) => h.pause === true && !this.paused.has(h));
    if (hold !== undefined && this.sceneId !== null) {
      this.paused.add(hold);
      this.emit("pause", { sceneId: this.sceneId, hotspot: hold });
    }
  }

  /** Reports that the active scene's video reached its end. */
  mediaEnded(): void {
    if (this._state !== "playing") return;
    this.hasMediaEnded = true;
    this.leaveScene();
  }

  /**
   * Answers the active question with the option `choiceIds`, or a list of them for a
   * `multiple` question, within its `min` and `max` (`min` is capped to the options
   * offered). Returns `false` (and does nothing) if no question is active, an option
   * isn't offered or repeats, or the count is out of bounds.
   */
  answer(choiceIds: string | readonly string[]): boolean {
    const { question, sceneId, options } = this;
    if (this._state !== "interacting" || question === null || sceneId === null) return false;
    const ids = [choiceIds].flat();
    const choices = options.filter((option) => ids.includes(option.id));
    const [min, max] = answerRange(question, options.length);
    const [choice] = choices;
    if (!choice || choices.length !== ids.length || ids.length < min || ids.length > max)
      return false;

    this.dismiss();
    for (const { set } of choices) this.change(set);
    // The option decides first; the question only if the option neither branches nor seeks.
    let goto = this.branch(choice.branches, choice.goto);
    let seek = choice.seek;
    if (goto === undefined && seek === undefined) {
      goto = this.branch(question.branches, question.goto);
      seek = question.seek;
    }
    // Right when every offered option is picked if and only if it's correct.
    const correct = options.some((option) => option.correct !== undefined)
      ? options.every((option) => !option.correct === !choices.includes(option))
      : undefined;
    this.emit("answer", { sceneId, question, choice, choices, correct, goto });
    this.go(sceneId, question, goto, seek);
    return true;
  }

  /**
   * Activates the visible hotspot `hotspotId`, branching if it has a `goto`.
   * Returns `false` (and does nothing) if no such hotspot is on screen.
   */
  activate(hotspotId: string): boolean {
    const { sceneId } = this;
    if (this._state !== "playing" || sceneId === null) return false;
    const hotspot = this.shown.hotspots.find((h) => h.id === hotspotId);
    if (!hotspot) return false;

    this.change(hotspot.set);
    const goto = this.branch(hotspot.branches, hotspot.goto);
    this.emit("hotspot", { sceneId, hotspot, goto });
    if (goto !== undefined) this.enter(goto);
    else if (hotspot.seek !== undefined) this.seek(hotspot.seek);
    return true;
  }

  private enter(sceneId: SceneId): void {
    const scene = this.story.scenes[sceneId];
    if (!scene) throw new Error(`Scene "${sceneId}" does not exist`);
    this.show("hotspots", []);
    this.show("cues", []);
    this.sceneId = sceneId;
    this.timeline = this.timelineOf(sceneId, scene);
    this.pending = [...this.timeline.questions];
    this.paused.clear();
    this.dismiss();
    this.hasMediaEnded = false;
    this.change(scene.set);
    this.emit("scene", { sceneId, scene });
  }

  /** Resumes the current scene from `time`, re-arming its questions and pauses from there on. */
  private seek(time: number): void {
    if (this.sceneId === null) return;
    this.pending = this.timeline.questions.filter((question) => question.at >= time);
    for (const hotspot of this.paused) if (hotspot.from >= time) this.paused.delete(hotspot);
    this.hasMediaEnded = false;
    this.emit("resume", { sceneId: this.sceneId, time });
  }

  private ask(): void {
    const question = this.pending.shift();
    if (question === undefined || this.sceneId === null) return;
    const options = question.options.filter((option) => this.test(option.if));
    if (options.length === 0) {
      if (this.hasMediaEnded) this.leaveScene();
      return;
    }
    this.show("hotspots", []);
    this.question = question;
    this.options = options;
    this._state = "interacting";
    if (question.timeout !== undefined) {
      this.timer = setTimeout(() => this.expire(), question.timeout * 1000);
    }
    this.emit("interaction", { sceneId: this.sceneId, question, options });
  }

  /** Answers the question on screen with its `default`, or else lets the question decide. */
  private expire(): void {
    const { question, sceneId } = this;
    if (question === null || sceneId === null) return;
    this.emit("timeout", { sceneId, question });
    if (question.default !== undefined && this.answer(question.default)) return;
    this.dismiss();
    this.go(sceneId, question, this.branch(question.branches, question.goto), question.seek);
  }

  /** Clears the question on screen, if any, and its timer. */
  private dismiss(): void {
    clearTimeout(this.timer);
    this.question = null;
    this._state = "playing";
  }

  /** Moves on after `question`: to `goto`, to `seek`, or past it. */
  private go(
    sceneId: SceneId,
    question: Question,
    goto: SceneId | undefined,
    seek: number | undefined,
  ): void {
    if (goto !== undefined) this.enter(goto);
    else if (seek !== undefined) this.seek(seek);
    else if (this.hasMediaEnded) this.leaveScene();
    else this.emit("resume", { sceneId, time: question.at });
  }

  /** Called once the video has ended: asks any questions still pending, then moves on. */
  private leaveScene(): void {
    // Questions near the end can be missed between time updates; ask them before leaving.
    if (this.pending.length > 0) {
      this.ask();
      return;
    }
    const sceneId = this.sceneId;
    if (sceneId === null) return;
    const scene = this.story.scenes[sceneId];
    const next = scene && this.branch(scene.branches, scene.next);
    if (next !== undefined) {
      this.enter(next);
    } else {
      this.show("hotspots", []);
      this.show("cues", []);
      this._state = "ended";
      this.emit("end", { sceneId });
    }
  }

  /** The first of `branches` that holds, or else `fallback`. */
  private branch(
    branches: readonly Branch[] | undefined,
    fallback: SceneId | undefined,
  ): SceneId | undefined {
    return branches?.find((branch) => this.test(branch.if))?.goto ?? fallback;
  }

  /** Applies `changes`, emitting `vars` if there are any. */
  private change(changes: VarChanges | undefined): void {
    if (changes === undefined) return;
    for (const [name, value] of Object.entries(changes)) {
      this.values[name] =
        typeof value === "object" ? ((this.values[name] as number) ?? 0) + value.add : value;
    }
    this.emit("vars", { vars: this.values });
  }

  /** Whether every condition holds; `undefined` always does. */
  private test(conditions: Conditions | undefined): boolean {
    return [conditions ?? []].flat().every((c) => {
      // Ordering works as in JS, so a missing variable is neither greater nor less than a number.
      const value = this.values[c.var] as number;
      return (
        (c.eq === undefined || value === c.eq) &&
        (c.ne === undefined || value !== c.ne) &&
        (c.gt === undefined || value > c.gt) &&
        (c.gte === undefined || value >= c.gte) &&
        (c.lt === undefined || value < c.lt) &&
        (c.lte === undefined || value <= c.lte)
      );
    });
  }

  /** Sets the visible hotspots or the active cues, emitting `type` only if they changed. */
  private show<K extends keyof Shown>(type: K, items: Shown[K]): void {
    const current: readonly unknown[] = this.shown[type];
    const unchanged =
      items.length === current.length && items.every((item, i) => item === current[i]);
    if (unchanged || this.sceneId === null) return;
    this.shown[type] = items;
    this.emit(type, { sceneId: this.sceneId, [type]: items } as unknown as EngineEvents[K]);
  }

  private timelineOf(sceneId: SceneId, scene: Scene): Timeline {
    let timeline = this.timelines.get(sceneId);
    if (!timeline) {
      const events = scene.events ?? [];
      timeline = {
        questions: events
          .filter((e): e is Question => e.type === "question")
          .sort((a, b) => a.at - b.at),
        hotspots: events.filter((e): e is Hotspot => e.type === "hotspot"),
        cues: events.filter((e): e is Cue => e.type === "cue"),
      };
      this.timelines.set(sceneId, timeline);
    }
    return timeline;
  }
}
