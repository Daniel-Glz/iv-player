import { Emitter } from "./emitter.js";
import type { StoryEngine } from "./engine.js";
import type { Branch, Scene, SceneId } from "./types.js";

/** `HTMLMediaElement.HAVE_CURRENT_DATA`: the frame at `currentTime` can be drawn. */
const HAVE_CURRENT_DATA = 2;

/**
 * The subset of `HTMLMediaElement` the controller uses. A `<video>` satisfies it
 * as-is; declaring it here keeps core free of DOM types and easy to fake in tests.
 */
export interface MediaElement {
  src: string;
  preload: string;
  currentTime: number;
  readonly readyState: number;
  readonly seeking: boolean;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  /**
   * Calls `callback` when the next frame is presented, with that frame's exact
   * `mediaTime`. Optional: when missing, the controller falls back to `timeupdate`.
   */
  requestVideoFrameCallback?(callback: VideoFrameCallback): number;
  cancelVideoFrameCallback?(handle: number): void;
}

/** Subset of the DOM's `VideoFrameRequestCallback` the controller reads. */
export type VideoFrameCallback = (now: number, metadata: { mediaTime: number }) => void;

export interface MediaControllerEvents<M extends MediaElement> {
  /** Put `active` on top and hide `inactive`. The very first swap reveals the first scene. */
  swap: { active: M; inactive: M };
  /** `play()` was rejected, typically by the autoplay policy: ask for a user gesture, then call `play()`. */
  blocked: { media: M; error: unknown };
  /**
   * The active element reached `time`, just reported to the engine: once per presented
   * frame, or on `timeupdate` while frames don't arrive. Use it to sync anything drawn
   * over the video, like animated hotspots.
   */
  time: { media: M; time: number };
}

/**
 * Plays a `StoryEngine` on two stacked media elements.
 *
 * The visible ("front") element plays the current scene while the hidden ("back")
 * one preloads the most likely next scene. On a scene change the front element
 * pauses on its last frame and stays visible until the back one can draw its
 * first frame; only then are they swapped, so there's never a black frame.
 *
 * Playback time reaches the engine through `requestVideoFrameCallback`, i.e. once
 * per presented frame with its exact media time. `timeupdate` (~4 Hz) takes over
 * whenever frames stop arriving: on elements without that API, or in background
 * tabs, where browsers don't present frames but keep playing.
 *
 * Showing and hiding the elements is left to the `swap` listener, so core stays
 * DOM-free. Create the controller before calling `engine.start()`.
 */
export class MediaController<M extends MediaElement = MediaElement> extends Emitter<
  MediaControllerEvents<M>
> {
  private front: M;
  private back: M;
  /** Source assigned to each element; `element.src` can't be compared because it resolves URLs. */
  private readonly srcs = new Map<M, string>();
  /** The back element is reserved for a pending swap, so preloads must not touch it. */
  private swapping = false;
  private cancelWait: (() => void) | null = null;
  private readonly cleanups: (() => void)[] = [];

  constructor(
    private readonly engine: StoryEngine,
    media: readonly [M, M],
  ) {
    super();
    [this.front, this.back] = media;

    for (const element of media) {
      // Only the front element drives the story; the back one is just buffering.
      const isDriving = () => element === this.front && !this.swapping;
      const drive = (time: number) => {
        if (!isDriving()) return;
        engine.update(time);
        // The update may have changed scenes, handing the story to the other element.
        if (isDriving()) this.emit("time", { media: element, time });
      };
      // Frames give exact times but stop in background tabs, where `timeupdate` keeps
      // firing (throttled). So `timeupdate` only drives the engine when no frame arrived
      // since the previous one; mixing both would let the time jitter back and forth,
      // flickering hotspots at their boundaries.
      let sawFrame = false;
      this.trackFrames(element, (mediaTime) => {
        sawFrame = true;
        drive(mediaTime);
      });
      this.listen(element, "timeupdate", () => {
        if (sawFrame) {
          sawFrame = false;
          return;
        }
        drive(element.currentTime);
      });
      this.listen(element, "ended", () => {
        if (isDriving()) engine.mediaEnded();
      });
    }

    this.cleanups.push(
      engine.on("scene", ({ scene }) => this.enter(scene)),
      engine.on("interaction", ({ question, options }) => {
        this.pauseAt(question.at);
        const goto = firstTarget(options);
        if (goto !== undefined) this.preload(goto);
      }),
      engine.on("resume", ({ time }) => {
        // Answers resume where they paused; `seek` jumps elsewhere.
        if (this.front.currentTime !== time) this.front.currentTime = time;
        this.play();
      }),
      engine.on("pause", ({ hotspot }) => {
        this.pauseAt(hotspot.from);
        const goto = targetOf(hotspot);
        if (goto !== undefined) this.preload(goto);
      }),
      engine.on("hotspot", ({ hotspot, goto }) => {
        // A `seek` resumes through `resume` instead.
        if (hotspot.pause === true && goto === undefined && hotspot.seek === undefined) this.play();
      }),
    );
  }

  /** Element currently on top. */
  get active(): M {
    return this.front;
  }

  /** Plays the active element, e.g. after a `blocked` event or a user pause. */
  play(): void {
    if (this.engine.state !== "playing") return;
    this.front.play().catch((error: unknown) => this.emit("blocked", { media: this.front, error }));
  }

  pause(): void {
    this.front.pause();
  }

  /**
   * Starts buffering `sceneId` in the hidden element, replacing any previous preload.
   * The controller already preloads on its own; call this for stronger hints,
   * e.g. when the viewer hovers an option.
   */
  preload(sceneId: SceneId): void {
    if (this.swapping) return;
    const src = this.engine.story.scenes[sceneId]?.src;
    if (src === undefined || src === this.srcs.get(this.front)) return;
    this.load(this.back, src);
  }

  /** Detaches from the engine and the media elements. */
  destroy(): void {
    this.cancelWait?.();
    for (const cleanup of this.cleanups.splice(0)) cleanup();
  }

  private enter(scene: Scene): void {
    this.cancelWait?.();
    // Re-entering the scene on screen (e.g. a loop) just rewinds it; anything else goes to the back.
    const target = this.srcs.get(this.front) === scene.src ? this.front : this.back;
    this.swapping = target === this.back;
    this.front.pause();
    this.load(target, scene.src);

    this.whenReady(target, () => {
      if (target !== this.front) {
        [this.front, this.back] = [this.back, this.front];
        this.emit("swap", { active: this.front, inactive: this.back });
      }
      this.swapping = false;
      this.play();
      const next = scene.branches?.[0]?.goto ?? scene.next ?? firstGoto(scene);
      if (next !== undefined) this.preload(next);
    });
  }

  /**
   * Pauses on the exact frame of a question or a pausing hotspot: the time that triggered
   * it is usually a bit past `time` (up to a frame with frame callbacks, ~250ms with `timeupdate`).
   */
  private pauseAt(time: number): void {
    this.front.pause();
    if (this.front.currentTime > time) this.front.currentTime = time;
  }

  /** Points `element` at `src` from the start, reusing what it buffered if it's the same source. */
  private load(element: M, src: string): void {
    if (this.srcs.get(element) !== src) {
      element.preload = "auto";
      element.src = src;
      this.srcs.set(element, src);
    } else if (element.currentTime !== 0) {
      element.currentTime = 0;
    }
  }

  /** Calls `callback` once `element` can draw its current frame. */
  private whenReady(element: M, callback: () => void): void {
    const isReady = () => element.readyState >= HAVE_CURRENT_DATA && !element.seeking;
    if (isReady()) {
      callback();
      return;
    }
    const check = () => {
      if (!isReady()) return;
      stop();
      callback();
    };
    const stop = () => {
      element.removeEventListener("loadeddata", check);
      element.removeEventListener("seeked", check);
      this.cancelWait = null;
    };
    element.addEventListener("loadeddata", check);
    element.addEventListener("seeked", check);
    this.cancelWait = stop;
  }

  /**
   * Calls `onFrame` with the exact media time of every frame `element` presents.
   * Does nothing if the element doesn't support `requestVideoFrameCallback`.
   */
  private trackFrames(element: M, onFrame: (mediaTime: number) => void): void {
    if (!element.requestVideoFrameCallback) return;
    let handle: number | undefined;
    let stopped = false;
    // Frame callbacks are one-shot, so each one schedules the next.
    const callback: VideoFrameCallback = (_now, { mediaTime }) => {
      if (stopped) return;
      onFrame(mediaTime);
      handle = element.requestVideoFrameCallback?.(callback);
    };
    handle = element.requestVideoFrameCallback(callback);
    this.cleanups.push(() => {
      stopped = true;
      if (handle !== undefined) element.cancelVideoFrameCallback?.(handle);
    });
  }

  private listen(element: M, type: string, listener: () => void): void {
    element.addEventListener(type, listener);
    this.cleanups.push(() => element.removeEventListener(type, listener));
  }
}

interface Target {
  goto?: SceneId | undefined;
  branches?: readonly Branch[];
}

/** Scene `target` likely branches to: its first branch, or else its `goto`. */
function targetOf(target: Target): SceneId | undefined {
  return target.branches?.[0]?.goto ?? target.goto;
}

/** First scene any of `targets` can branch to. */
function firstTarget(targets: readonly Target[]): SceneId | undefined {
  for (const target of targets) {
    const goto = targetOf(target);
    if (goto !== undefined) return goto;
  }
  return undefined;
}

/** First scene any question option or hotspot of `scene` can branch to. */
function firstGoto(scene: Scene): SceneId | undefined {
  return firstTarget(
    (scene.events ?? []).flatMap((event) => (event.type === "question" ? event.options : event)),
  );
}
