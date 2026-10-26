import { Emitter } from "./emitter.js";
import type { Choice, Hotspot, Question, Scene, SceneId, Story } from "./types.js";

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
  /** Pause the video and show `question`. */
  interaction: { sceneId: SceneId; question: Question };
  /** The viewer picked `choice`. Followed by `scene`, `resume` or `end`. */
  answer: { sceneId: SceneId; question: Question; choice: Choice };
  /** The answer didn't branch: resume the current video from `time`. */
  resume: { sceneId: SceneId; time: number };
  /** The set of visible hotspots changed: render exactly `hotspots` (possibly none). */
  hotspots: { sceneId: SceneId; hotspots: readonly Hotspot[] };
  /** The viewer activated `hotspot`. Followed by `scene` if it has a `goto`. */
  hotspot: { sceneId: SceneId; hotspot: Hotspot };
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
 * update, so seeking in either direction just works. They're hidden while a
 * question is showing and when leaving the scene.
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
  private visible: readonly Hotspot[] = [];
  private hasMediaEnded = false;
  private readonly timelines = new Map<SceneId, Timeline>();

  constructor(private readonly story: Story) {
    super();
    if (!story.scenes[story.start]) {
      throw new Error(`Start scene "${story.start}" does not exist`);
    }
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

  /** Enters the start scene. Calling it again restarts the story. */
  start(): void {
    this.enter(this.story.start);
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
        (h) => currentTime >= h.from && (h.to === undefined || currentTime < h.to),
      ),
    );
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
    const choice = question.options.find((option) => option.id === choiceId);
    if (!choice) return false;

    this.question = null;
    this._state = "playing";
    this.emit("answer", { sceneId, question, choice });

    if (choice.goto !== undefined) this.enter(choice.goto);
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

    this.emit("hotspot", { sceneId, hotspot });
    if (hotspot.goto !== undefined) this.enter(hotspot.goto);
    return true;
  }

  private enter(sceneId: SceneId): void {
    const scene = this.story.scenes[sceneId];
    if (!scene) throw new Error(`Scene "${sceneId}" does not exist`);
    this.show([]);
    this.sceneId = sceneId;
    this.timeline = this.timelineOf(sceneId, scene);
    this.pending = [...this.timeline.questions];
    this.question = null;
    this.hasMediaEnded = false;
    this._state = "playing";
    this.emit("scene", { sceneId, scene });
  }

  private ask(): void {
    const question = this.pending.shift();
    if (question === undefined || this.sceneId === null) return;
    this.show([]);
    this.question = question;
    this._state = "interacting";
    this.emit("interaction", { sceneId: this.sceneId, question });
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
    const next = this.story.scenes[sceneId]?.next;
    if (next !== undefined) {
      this.enter(next);
    } else {
      this.show([]);
      this._state = "ended";
      this.emit("end", { sceneId });
    }
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
