import type { MediaElement, VideoFrameCallback } from "../../src/index";

export interface FakeMediaOptions {
  /** Implement `requestVideoFrameCallback`, like modern browsers. Default: `false`. */
  frameCallbacks?: boolean;
}

/**
 * In-memory stand-in for a `<video>`. Nothing happens on its own: tests drive
 * loading, seeking and playback explicitly with the helper methods.
 */
export class FakeMedia implements MediaElement {
  requestVideoFrameCallback?: (callback: VideoFrameCallback) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
  preload = "";
  readyState = 0;
  seeking = false;
  playing = false;
  /** Result of the next `play()` calls; swap it to simulate autoplay being blocked. */
  playResult: () => Promise<void> = () => Promise.resolve();

  private _src = "";
  private _currentTime = 0;
  private readonly listeners = new Map<string, Set<() => void>>();
  private readonly frameCallbacks = new Map<number, VideoFrameCallback>();
  private nextHandle = 1;

  constructor(
    readonly name: string,
    options: FakeMediaOptions = {},
  ) {
    if (options.frameCallbacks) {
      this.requestVideoFrameCallback = (callback) => {
        const handle = this.nextHandle++;
        this.frameCallbacks.set(handle, callback);
        return handle;
      };
      this.cancelVideoFrameCallback = (handle) => {
        this.frameCallbacks.delete(handle);
      };
    }
  }

  get src(): string {
    return this._src;
  }

  /** Like a real element, a new source discards the buffered data. */
  set src(value: string) {
    this._src = value;
    this._currentTime = 0;
    this.readyState = 0;
    this.seeking = false;
  }

  get currentTime(): number {
    return this._currentTime;
  }

  /** Like a real element, assigning the time starts a seek; finish it with `finishSeek()`. */
  set currentTime(value: number) {
    this._currentTime = value;
    this.seeking = true;
  }

  play(): Promise<void> {
    this.playing = true;
    return this.playResult().catch((error: unknown) => {
      this.playing = false;
      throw error;
    });
  }

  pause(): void {
    this.playing = false;
  }

  addEventListener(type: string, listener: () => void): void {
    let set = this.listeners.get(type);
    if (!set) this.listeners.set(type, (set = new Set()));
    set.add(listener);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  listenerCount(type?: string): number {
    if (type !== undefined) return this.listeners.get(type)?.size ?? 0;
    let count = 0;
    for (const set of this.listeners.values()) count += set.size;
    return count;
  }

  pendingFrameCallbacks(): number {
    return this.frameCallbacks.size;
  }

  /**
   * A frame with timestamp `mediaTime` is presented, running the pending frame
   * callbacks once (they're one-shot, like the real API). No-op without frame callbacks.
   */
  presentFrame(mediaTime: number): void {
    const callbacks = [...this.frameCallbacks.values()];
    this.frameCallbacks.clear();
    for (const callback of callbacks) callback(0, { mediaTime });
  }

  /** Only `timeupdate` fires, without presenting a frame. */
  timeUpdate(time: number): void {
    this._currentTime = time;
    this.dispatch("timeupdate");
  }

  /** The first frame is available. */
  finishLoading(): void {
    this.readyState = 4;
    this.dispatch("loadeddata");
  }

  finishSeek(): void {
    this.seeking = false;
    this.dispatch("seeked");
  }

  /** Playback reached `time`: a frame is presented and, as in browsers, `timeupdate` fires too. */
  advanceTo(time: number): void {
    this._currentTime = time;
    this.presentFrame(time);
    this.dispatch("timeupdate");
  }

  end(): void {
    this.playing = false;
    this.dispatch("ended");
  }

  private dispatch(type: string): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener();
  }
}
