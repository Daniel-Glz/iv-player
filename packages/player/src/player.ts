import {
  boundsOf,
  hotspotGeometryAt,
  isAnimated,
  MediaController,
  StoryEngine,
  type EngineEvents,
  type Hotspot,
  type HotspotGeometry,
  type Question,
  type Story,
} from "@iv-player/core";
import { icons, type IconName } from "./icons.js";
import { containRect } from "./layout.js";
import { styles } from "./styles.js";

/** Events dispatched by `<iv-player>`. They bubble and cross the shadow boundary. */
export interface IvPlayerEventMap {
  "iv-scene": CustomEvent<EngineEvents["scene"]>;
  "iv-interaction": CustomEvent<EngineEvents["interaction"]>;
  "iv-answer": CustomEvent<EngineEvents["answer"]>;
  "iv-hotspot": CustomEvent<EngineEvents["hotspot"]>;
  "iv-end": CustomEvent<EngineEvents["end"]>;
}

/** Inactivity before the controls fade out while playing. */
const IDLE_DELAY_MS = 3000;
/** Seconds skipped by the arrow keys. */
const SEEK_STEP = 5;

// Picture-in-picture would show a single video without overlays, so it's disabled.
const template = /* html */ `
<div class="stage" part="stage">
  <video part="video" playsinline disablepictureinpicture></video>
  <video part="video" playsinline disablepictureinpicture></video>
  <div class="hotspots" part="hotspots"></div>
  <div class="overlay question" part="question" hidden>
    <p class="question-text" part="question-text" id="question-text"></p>
    <div class="options" part="options" role="group" aria-labelledby="question-text"></div>
  </div>
  <div class="overlay start" part="start" hidden>
    <button class="start-button" part="start-button" type="button">
      <slot name="start">Play</slot>
    </button>
  </div>
  <div class="overlay end" part="end" hidden>
    <slot name="end">
      <button class="replay-button" part="replay-button" type="button">Replay</button>
    </slot>
  </div>
  <div class="controls" part="controls" hidden>
    <button class="play-toggle" part="control play-button" type="button"></button>
    <input class="progress" part="progress" type="range" min="0" max="0" step="any" value="0" aria-label="Seek" />
    <span class="time" part="time">0:00 / 0:00</span>
    <button class="mute-toggle" part="control mute-button" type="button"></button>
    <input class="volume" part="volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume" />
    <button class="fullscreen-toggle" part="control fullscreen-button" type="button"></button>
  </div>
</div>
`;

/**
 * Inside of every hotspot button. The shape is an SVG in a 0–100 box stretched
 * over the hotspot's bounds; it receives the clicks, so they follow the exact shape.
 */
const hotspotContent = /* html */ `
<svg class="hotspot-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
  <rect class="hotspot-shape" part="hotspot-shape" width="100" height="100" />
  <polygon class="hotspot-shape" part="hotspot-shape" />
</svg>
<span class="hotspot-label" part="hotspot-label"></span>
`;

/** Customizes a hotspot's button right after the player creates it. See `IvPlayer.renderHotspot`. */
export type HotspotRenderer = (hotspot: Hotspot, element: HTMLButtonElement) => void;

/**
 * `<iv-player>`: plays a `Story` set through the `story` property.
 *
 * Attributes:
 * - `controls`: show the control bar (play/pause, seek within the scene, volume,
 *   fullscreen) and enable keyboard shortcuts (space/k, m, f, ←/→).
 * - `autoplay`: start as soon as a story is set (browsers may block it unless `muted`).
 * - `muted`: mute both videos.
 * - `pseudo-fullscreen`: set by the player while it covers the viewport on
 *   devices without element fullscreen (iPhone); style it with `:host([pseudo-fullscreen])`.
 *
 * Slots: `start` (start button content) and `end` (shown when the story ends;
 * defaults to a replay button).
 */
export class IvPlayer extends HTMLElement {
  static readonly observedAttributes = ["muted", "controls"];

  readonly #videos: [HTMLVideoElement, HTMLVideoElement];
  readonly #stage: HTMLElement;
  readonly #hotspots: HTMLElement;
  readonly #question: HTMLElement;
  readonly #questionText: HTMLElement;
  readonly #options: HTMLElement;
  readonly #start: HTMLElement;
  readonly #end: HTMLElement;
  readonly #controls: HTMLElement;
  readonly #playButton: HTMLButtonElement;
  readonly #progress: HTMLInputElement;
  readonly #time: HTMLElement;
  readonly #muteButton: HTMLButtonElement;
  readonly #volume: HTMLInputElement;
  readonly #fullscreenButton: HTMLButtonElement;
  readonly #resizeObserver: ResizeObserver | null;
  readonly #onFullscreenChange = () => this.#renderFullscreen();

  #story: Story | null = null;
  #engine: StoryEngine | null = null;
  #controller: MediaController<HTMLVideoElement> | null = null;
  #renderHotspot: HotspotRenderer | null = null;
  /** Buttons of the hotspots on screen. */
  #hotspotButtons = new Map<Hotspot, HTMLButtonElement>();
  #animationFrame = 0;
  /** Pending frame callback driving animated hotspots, on the video it was requested from. */
  #frameCallback: { video: HTMLVideoElement; handle: number } | null = null;
  #idleTimer: ReturnType<typeof setTimeout> | undefined;
  #scrubbing = false;
  #savedOverflow = "";

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${styles}</style>${template}`;
    const find = <T extends HTMLElement>(selector: string) => {
      const element = root.querySelector<T>(selector);
      if (!element) throw new Error(`<iv-player> template is missing ${selector}`);
      return element;
    };

    const videos = root.querySelectorAll("video");
    this.#videos = [videos[0] as HTMLVideoElement, videos[1] as HTMLVideoElement];
    this.#stage = find(".stage");
    this.#hotspots = find(".hotspots");
    this.#question = find(".question");
    this.#questionText = find(".question-text");
    this.#options = find(".options");
    this.#start = find(".start");
    this.#end = find(".end");
    this.#controls = find(".controls");
    this.#playButton = find(".play-toggle");
    this.#progress = find(".progress");
    this.#time = find(".time");
    this.#muteButton = find(".mute-toggle");
    this.#volume = find(".volume");
    this.#fullscreenButton = find(".fullscreen-toggle");

    find(".start-button").addEventListener("click", () => this.play());
    find(".replay-button").addEventListener("click", () => this.restart());
    this.#options.addEventListener("click", (event) => {
      const id = buttonId(event);
      if (id !== undefined) this.#engine?.answer(id);
    });
    this.#hotspots.addEventListener("click", (event) => {
      const id = buttonId(event);
      if (id !== undefined) this.#engine?.activate(id);
    });

    this.#playButton.addEventListener("click", () => this.#togglePlay());
    this.#muteButton.addEventListener("click", () => this.toggleAttribute("muted"));
    this.#fullscreenButton.addEventListener("click", () => this.toggleFullscreen());
    this.#volume.addEventListener("input", () => {
      const volume = Number(this.#volume.value);
      for (const video of this.#videos) video.volume = volume;
      if (volume > 0) this.removeAttribute("muted");
    });
    this.#progress.addEventListener("input", () => this.#seekTo(Number(this.#progress.value)));
    this.#progress.addEventListener("pointerdown", () => (this.#scrubbing = true));
    this.#progress.addEventListener("change", () => (this.#scrubbing = false));

    for (const video of this.#videos) {
      video.addEventListener("loadedmetadata", () => this.#layoutHotspots());
      // Also covers seeks while paused. Frame callbacks, when running, are more precise.
      for (const type of ["seeked", "timeupdate"]) {
        video.addEventListener(type, () => {
          if (video === this.#activeVideo() && !this.#frameCallback) this.#positionHotspots();
        });
      }
      for (const type of ["play", "pause", "timeupdate", "durationchange", "volumechange", "seeked"]) {
        video.addEventListener(type, () => {
          if (video === this.#activeVideo()) this.#renderControls();
        });
      }
      video.addEventListener("play", () => this.#wake());
    }

    this.#stage.addEventListener("pointermove", () => this.#wake());
    this.#stage.addEventListener("pointerdown", () => this.#wake());
    this.addEventListener("keydown", (event) => this.#onKeydown(event));

    this.#resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => this.#layoutHotspots());
    this.#renderControls();
    this.#renderFullscreen();
  }

  connectedCallback(): void {
    // Properties set before the element was defined live on the instance and hide
    // the accessors; reapply them through the accessors.
    for (const property of ["story", "renderHotspot"] as const) {
      if (Object.hasOwn(this, property)) {
        const value = this[property];
        Reflect.deleteProperty(this, property);
        this[property] = value as never;
      }
    }
    this.#resizeObserver?.observe(this.#stage);
    document.addEventListener("fullscreenchange", this.#onFullscreenChange);
    this.#makeFocusable();
    this.#animateHotspots();
  }

  disconnectedCallback(): void {
    this.#resizeObserver?.disconnect();
    document.removeEventListener("fullscreenchange", this.#onFullscreenChange);
    this.#stopHotspotAnimation();
    clearTimeout(this.#idleTimer);
    this.#setPseudoFullscreen(false);
    this.pause();
  }

  attributeChangedCallback(name: string): void {
    if (name === "muted") {
      for (const video of this.#videos) video.muted = this.hasAttribute("muted");
    } else if (name === "controls") {
      this.#makeFocusable();
      this.#updateControlsVisibility();
    }
  }

  /** The story being played. Setting it resets the player. */
  get story(): Story | null {
    return this.#story;
  }

  set story(story: Story | null) {
    this.#reset();
    this.#story = story;
    if (!story) return;

    const engine = new StoryEngine(story);
    const controller = new MediaController(engine, this.#videos);
    this.#engine = engine;
    this.#controller = controller;

    controller.on("swap", ({ active, inactive }) => {
      active.classList.add("front");
      inactive.classList.remove("front");
      this.#layoutHotspots();
      this.#renderControls();
      // Frame callbacks belong to the video that was on top.
      this.#animateHotspots();
    });
    controller.on("blocked", () => {
      this.#start.hidden = false;
      this.#updateControlsVisibility();
    });

    engine.on("scene", (detail) => {
      // A scene change can interrupt a question, e.g. restart() while it's showing.
      this.#question.hidden = true;
      this.#end.hidden = true;
      this.#updateControlsVisibility();
      this.#emit("iv-scene", detail);
    });
    engine.on("interaction", (detail) => {
      this.#showQuestion(detail.question);
      this.#updateControlsVisibility();
      this.#emit("iv-interaction", detail);
    });
    engine.on("answer", (detail) => {
      this.#question.hidden = true;
      this.#updateControlsVisibility();
      this.#emit("iv-answer", detail);
    });
    engine.on("hotspots", ({ hotspots }) => this.#renderHotspots(hotspots));
    engine.on("hotspot", (detail) => this.#emit("iv-hotspot", detail));
    engine.on("end", (detail) => {
      this.#end.hidden = false;
      this.#updateControlsVisibility();
      this.#emit("iv-end", detail);
    });

    if (this.hasAttribute("autoplay")) this.play();
    else this.#start.hidden = false;
    this.#updateControlsVisibility();
  }

  /**
   * Called for every hotspot right after its button is created, with the default
   * content (an SVG shape and a hidden label) already inside. Use it to restyle,
   * add or replace content; the player keeps positioning and sizing the button.
   * Clicks are taken by the default shape, so if you remove it, give your content
   * `pointer-events: auto`. Applies from the next time hotspots are drawn.
   */
  get renderHotspot(): HotspotRenderer | null {
    return this.#renderHotspot;
  }

  set renderHotspot(renderer: HotspotRenderer | null) {
    this.#renderHotspot = renderer;
  }

  /** Engine driving the current story, for advanced control. `null` without a story. */
  get engine(): StoryEngine | null {
    return this.#engine;
  }

  /** Starts the story, or resumes it after a pause or a blocked autoplay. */
  play(): void {
    const engine = this.#engine;
    if (!engine) return;
    this.#start.hidden = true;
    if (engine.state === "idle") engine.start();
    else this.#controller?.play();
    this.#updateControlsVisibility();
  }

  pause(): void {
    this.#controller?.pause();
  }

  /** Plays the story again from its start scene. */
  restart(): void {
    if (!this.#engine) return;
    this.#start.hidden = true;
    this.#engine.start();
  }

  /** Whether the player fills the screen, natively or through the iPhone fallback. */
  get isFullscreen(): boolean {
    return document.fullscreenElement === this || this.hasAttribute("pseudo-fullscreen");
  }

  /**
   * Puts the whole player (videos, questions and hotspots) in fullscreen, or leaves it.
   * Where elements can't go fullscreen (iPhone), it covers the viewport instead.
   */
  toggleFullscreen(): void {
    if (document.fullscreenElement === this) {
      void document.exitFullscreen();
    } else if (this.hasAttribute("pseudo-fullscreen")) {
      this.#setPseudoFullscreen(false);
    } else if (document.fullscreenEnabled && typeof this.requestFullscreen === "function") {
      this.requestFullscreen().catch(() => this.#setPseudoFullscreen(true));
    } else {
      this.#setPseudoFullscreen(true);
    }
  }

  #reset(): void {
    this.#controller?.destroy();
    this.#controller = null;
    this.#engine = null;
    for (const video of this.#videos) {
      video.pause();
      video.classList.remove("front");
    }
    this.#question.hidden = true;
    this.#start.hidden = true;
    this.#end.hidden = true;
    this.#renderHotspots([]);
    this.#updateControlsVisibility();
  }

  #activeVideo(): HTMLVideoElement {
    return this.#controller?.active ?? this.#videos[0];
  }

  #togglePlay(): void {
    if (this.#activeVideo().paused) this.play();
    else this.pause();
  }

  /** Seeks within the current scene. Ignored while a question is showing. */
  #seekTo(time: number): void {
    if (this.#engine?.state !== "playing") return;
    const video = this.#activeVideo();
    if (!Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(Math.max(time, 0), video.duration);
  }

  #onKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape" && this.hasAttribute("pseudo-fullscreen")) {
      this.#setPseudoFullscreen(false);
      return;
    }
    if (!this.hasAttribute("controls") || event.altKey || event.ctrlKey || event.metaKey) return;
    // Focused controls keep their native keys: arrows on sliders, space/enter on buttons.
    const target = event.composedPath()[0];
    if (target instanceof HTMLInputElement) return;
    if (target instanceof HTMLButtonElement && (event.key === " " || event.key === "Enter")) return;

    const video = this.#activeVideo();
    switch (event.key.toLowerCase()) {
      case " ":
      case "k":
        this.#togglePlay();
        break;
      case "m":
        this.toggleAttribute("muted");
        break;
      case "f":
        this.toggleFullscreen();
        break;
      case "arrowleft":
        this.#seekTo(video.currentTime - SEEK_STEP);
        break;
      case "arrowright":
        this.#seekTo(video.currentTime + SEEK_STEP);
        break;
      default:
        return;
    }
    event.preventDefault();
    this.#wake();
  }

  /** Lets keyboard shortcuts work by making the player itself focusable, unless the page decided. */
  #makeFocusable(): void {
    if (this.isConnected && this.hasAttribute("controls") && !this.hasAttribute("tabindex")) {
      this.tabIndex = 0;
    }
  }

  /** Controls are hidden over the start, question and end screens. */
  #updateControlsVisibility(): void {
    const state = this.#engine?.state;
    this.#controls.hidden =
      !this.hasAttribute("controls") ||
      state === undefined ||
      state === "idle" ||
      state === "interacting" ||
      state === "ended" ||
      !this.#start.hidden;
  }

  /** Shows the controls and schedules hiding them after a while without activity. */
  #wake(): void {
    this.#stage.classList.remove("idle");
    clearTimeout(this.#idleTimer);
    this.#idleTimer = setTimeout(() => {
      if (this.#activeVideo().paused || this.#controls.matches(":hover, :focus-within")) return;
      this.#stage.classList.add("idle");
    }, IDLE_DELAY_MS);
  }

  #renderControls(): void {
    const video = this.#activeVideo();
    setIcon(this.#playButton, video.paused ? "play" : "pause", video.paused ? "Play" : "Pause");

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    this.#progress.max = String(duration);
    if (!this.#scrubbing) this.#progress.value = String(video.currentTime);
    this.#time.textContent = `${formatTime(video.currentTime)} / ${formatTime(duration)}`;

    const silent = video.muted || video.volume === 0;
    setIcon(this.#muteButton, silent ? "muted" : "volume", silent ? "Unmute" : "Mute");
    this.#volume.value = String(silent ? 0 : video.volume);
  }

  #renderFullscreen(): void {
    const on = this.isFullscreen;
    setIcon(
      this.#fullscreenButton,
      on ? "exitFullscreen" : "enterFullscreen",
      on ? "Exit full screen" : "Full screen",
    );
  }

  #setPseudoFullscreen(on: boolean): void {
    if (on === this.hasAttribute("pseudo-fullscreen")) return;
    this.toggleAttribute("pseudo-fullscreen", on);
    // Keep the page behind from scrolling while the player covers it.
    const page = document.documentElement;
    if (on) {
      this.#savedOverflow = page.style.overflow;
      page.style.overflow = "hidden";
    } else {
      page.style.overflow = this.#savedOverflow;
    }
    this.#renderFullscreen();
  }

  #showQuestion(question: Question): void {
    this.#questionText.textContent = question.text;
    this.#options.replaceChildren(
      ...question.options.map((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("part", "option");
        button.dataset["id"] = option.id;
        button.textContent = option.label;
        return button;
      }),
    );
    this.#question.hidden = false;
    this.#options.querySelector("button")?.focus({ preventScroll: true });
  }

  #renderHotspots(hotspots: readonly Hotspot[]): void {
    this.#hotspotButtons = new Map(hotspots.map((hotspot) => [hotspot, this.#createHotspot(hotspot)]));
    this.#hotspots.replaceChildren(...this.#hotspotButtons.values());
    this.#positionHotspots();
    this.#animateHotspots();
  }

  #createHotspot(hotspot: Hotspot): HTMLButtonElement {
    const variant = toIdent(hotspot.variant ?? "outline");
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("part", `hotspot hotspot-${variant}`);
    button.dataset["id"] = hotspot.id;
    button.dataset["variant"] = variant;
    button.setAttribute("aria-label", hotspot.label);
    button.title = hotspot.label;
    button.innerHTML = hotspotContent;
    button.querySelector(".hotspot-label")!.textContent = hotspot.label;
    this.#renderHotspot?.(hotspot, button);
    return button;
  }

  /** Places every hotspot on screen at its geometry for `time` (default: the current playback time). */
  #positionHotspots(time = this.#activeVideo().currentTime): void {
    for (const [hotspot, button] of this.#hotspotButtons) {
      const geometry = hotspotGeometryAt(hotspot, time);
      button.hidden = geometry === null;
      if (geometry) applyGeometry(button, geometry);
    }
  }

  /**
   * Keeps animated hotspots in step with the picture while any is on screen.
   *
   * With `requestVideoFrameCallback`, they move exactly when a frame is presented
   * and to that frame's time, so they step with the video. `currentTime` read on
   * every animation frame runs up to most of a frame ahead of the picture, which
   * shows as lag on fast motion; it's only the fallback.
   */
  #animateHotspots(): void {
    this.#stopHotspotAnimation();
    const animated = [...this.#hotspotButtons.keys()].some(isAnimated);
    if (!animated || !this.isConnected) return;

    const video = this.#activeVideo();
    if (typeof video.requestVideoFrameCallback === "function") {
      const onFrame: VideoFrameRequestCallback = (_now, { mediaTime }) => {
        this.#positionHotspots(mediaTime);
        this.#frameCallback = { video, handle: video.requestVideoFrameCallback(onFrame) };
      };
      this.#frameCallback = { video, handle: video.requestVideoFrameCallback(onFrame) };
      return;
    }
    const tick = () => {
      this.#positionHotspots();
      this.#animationFrame = requestAnimationFrame(tick);
    };
    this.#animationFrame = requestAnimationFrame(tick);
  }

  #stopHotspotAnimation(): void {
    cancelAnimationFrame(this.#animationFrame);
    if (this.#frameCallback) {
      this.#frameCallback.video.cancelVideoFrameCallback(this.#frameCallback.handle);
      this.#frameCallback = null;
    }
  }

  /** Matches the hotspot layer to the picture of the active video, excluding letterboxing. */
  #layoutHotspots(): void {
    const video = this.#activeVideo();
    const rect = containRect(
      this.#stage.clientWidth,
      this.#stage.clientHeight,
      video.videoWidth,
      video.videoHeight,
    );
    Object.assign(this.#hotspots.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  #emit<K extends keyof IvPlayerEventMap>(
    type: K,
    detail: IvPlayerEventMap[K]["detail"],
  ): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

/** `data-id` of the button an event happened in, if any. */
function buttonId(event: Event): string | undefined {
  const target = event.target;
  if (!(target instanceof Element)) return undefined;
  return target.closest<HTMLElement>("button[data-id]")?.dataset["id"];
}

/** Sizes a hotspot button to the geometry's bounds and draws its shape inside them. */
function applyGeometry(button: HTMLButtonElement, geometry: HotspotGeometry): void {
  const bounds = boundsOf(geometry);
  const style = button.style;
  style.left = `${bounds.x * 100}%`;
  style.top = `${bounds.y * 100}%`;
  style.width = `${bounds.width * 100}%`;
  style.height = `${bounds.height * 100}%`;

  // The renderer may have removed the default shapes.
  const rect = button.querySelector<SVGRectElement>("rect.hotspot-shape");
  const polygon = button.querySelector<SVGPolygonElement>("polygon.hotspot-shape");
  if (geometry.kind === "box") {
    const radius = String(geometry.roundness * 50);
    rect?.setAttribute("rx", radius);
    rect?.setAttribute("ry", radius);
    rect?.style.removeProperty("display");
    polygon?.style.setProperty("display", "none");
  } else {
    // Points relative to the bounds, in the SVG's 0–100 box.
    const local = (value: number, origin: number, size: number) =>
      size > 0 ? ((value - origin) / size) * 100 : 50;
    const points = geometry.points
      .map(([x, y]) => `${local(x, bounds.x, bounds.width)},${local(y, bounds.y, bounds.height)}`)
      .join(" ");
    polygon?.setAttribute("points", points);
    polygon?.style.removeProperty("display");
    rect?.style.setProperty("display", "none");
  }
}

/** Turns a variant name into something usable in a `part` name. */
function toIdent(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

/** Swaps a control button's icon and accessible name, touching the DOM only on change. */
function setIcon(button: HTMLButtonElement, icon: IconName, label: string): void {
  if (button.dataset["icon"] === icon) return;
  button.dataset["icon"] = icon;
  button.innerHTML = icons[icon];
  button.setAttribute("aria-label", label);
  button.title = label;
}

/** `m:ss` for a time in seconds. */
function formatTime(seconds: number): string {
  const whole = Math.floor(Math.max(seconds, 0));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
