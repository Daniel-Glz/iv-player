import {
  MediaController,
  StoryEngine,
  type EngineEvents,
  type Hotspot,
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
    this.#resizeObserver?.observe(this.#stage);
    document.addEventListener("fullscreenchange", this.#onFullscreenChange);
    this.#makeFocusable();
  }

  disconnectedCallback(): void {
    this.#resizeObserver?.disconnect();
    document.removeEventListener("fullscreenchange", this.#onFullscreenChange);
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
    this.#hotspots.replaceChildren();
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
    this.#hotspots.replaceChildren(
      ...hotspots.map(({ id, label, area }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("part", "hotspot");
        button.dataset["id"] = id;
        button.setAttribute("aria-label", label);
        button.title = label;
        Object.assign(button.style, {
          left: `${area.x * 100}%`,
          top: `${area.y * 100}%`,
          width: `${area.width * 100}%`,
          height: `${area.height * 100}%`,
        });
        return button;
      }),
    );
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
