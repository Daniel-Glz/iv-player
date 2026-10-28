import { Emitter } from "./emitter.js";
import type {
  Branch,
  Choice,
  Conditions,
  Hotspot,
  Question,
  Scene,
  SceneId,
  Story,
  VarChanges,
  VarValue,
  Vars,
} from "./types.js";

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
   * The viewer picked `choice`, which branches to `goto`, if defined. Followed by
   * `scene`, `resume` or `end`.
   */
  answer: { sceneId: SceneId; question: Question; choice: Choice; goto: SceneId | undefined };
  /** The answer or hotspot didn't branch: resume the current video from `time`. */
  resume: { sceneId: SceneId; time: number };
  /** The set of visible hotspots changed: render exactly `hotspots` (possibly none). */
  hotspots: { sceneId: SceneId; hotspots: readonly Hotspot[] };
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

/** A scene's events split by kind, questions sorted by `at`. */
interface Timeline {
  questions: readonly Question[];
  hotspots: readonly Hotspot[];
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
 * Variables start from `story.vars` and reset on `start()`. A `set` applies before
 * its `branches` are checked, so they see the new values. Conditions are checked
 * when needed: hotspots on every update, options when their question shows.
 *
 * The story is trusted as-is: a reference to a missing scene throws when reached.
 */
export class StoryEngine extends Emitter<EngineEvents> {
  private _state: EngineState = "idle";
  private sceneId: SceneId | null = null;
  private timeline: Timeline = { questions: [], hotspots: [] };
  /** Questions of the current scene that haven't fired yet, sorted by `at`. */
  private pending: Question[] = [];
  private question: Question | null = null;
  /** Options of `question` offered to the viewer. */
  private options: readonly Choice[] = [];
  private values: Vars;
  private visible: readonly Hotspot[] = [];
  /** Hotspots with `pause` that already paused during this visit. */
  private readonly paused = new Set<Hotspot>();
  private hasMediaEnded = false;
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
    return this.visible;
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
    const next = this.pending[0];
    if (next !== undefined && currentTime >= next.at) {
      this.ask();
      return;
    }
    this.show(
      this.timeline.hotspots.filter(
        (h) =>
          currentTime >= h.from && (h.to === undefined || currentTime < h.to) && this.test(h.if),
      ),
    );
    const hold = this.visible.find((h) => h.pause === true && !this.paused.has(h));
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
   * Answers the active question with the option `choiceId`.
   * Returns `false` (and does nothing) if no question is active or the option doesn't exist.
   */
  answer(choiceId: string): boolean {
    const { question, sceneId } = this;
    if (this._state !== "interacting" || question === null || sceneId === null) return false;
    const choice = this.options.find((option) => option.id === choiceId);
    if (!choice) return false;

    this.question = null;
    this._state = "playing";
    this.change(choice.set);
    const goto = this.branch(choice.branches, choice.goto);
    this.emit("answer", { sceneId, question, choice, goto });

    if (goto !== undefined) this.enter(goto);
    else if (choice.seek !== undefined) this.seek(choice.seek);
    else if (this.hasMediaEnded) this.leaveScene();
    else this.emit("resume", { sceneId, time: question.at });
    return true;
  }

  /**
   * Activates the visible hotspot `hotspotId`, branching if it has a `goto`.
   * Returns `false` (and does nothing) if no such hotspot is on screen.
   */
  activate(hotspotId: string): boolean {
    const { sceneId } = this;
    if (this._state !== "playing" || sceneId === null) return false;
    const hotspot = this.visible.find((h) => h.id === hotspotId);
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
    this.show([]);
    this.sceneId = sceneId;
    this.timeline = this.timelineOf(sceneId, scene);
    this.pending = [...this.timeline.questions];
    this.paused.clear();
    this.question = null;
    this.hasMediaEnded = false;
    this._state = "playing";
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
    this.show([]);
    this.question = question;
    this.options = options;
    this._state = "interacting";
    this.emit("interaction", { sceneId: this.sceneId, question, options });
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
      this.show([]);
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

  /** Sets the visible hotspots, emitting `hotspots` only if the set changed. */
  private show(hotspots: readonly Hotspot[]): void {
    const unchanged =
      hotspots.length === this.visible.length && hotspots.every((h, i) => h === this.visible[i]);
    if (unchanged || this.sceneId === null) return;
    this.visible = hotspots;
    this.emit("hotspots", { sceneId: this.sceneId, hotspots });
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
      };
      this.timelines.set(sceneId, timeline);
    }
    return timeline;
  }
}
