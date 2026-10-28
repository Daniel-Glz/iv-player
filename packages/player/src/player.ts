import {
  MediaController,
  StoryEngine,
  type EngineEvents,
  type Question,
  type SceneId,
  type Story,
} from "@ivkit/core";
import { Controls } from "./controls.js";
import { Fullscreen } from "./fullscreen.js";
import { HotspotLayer, type HotspotRenderer } from "./hotspot-layer.js";
import { styles } from "./styles.js";

export type { HotspotRenderer };

/** Events dispatched by `<ivkit-player>`. They bubble and cross the shadow boundary. */
export interface IvkitPlayerEventMap {
  "iv-scene": CustomEvent<EngineEvents["scene"]>;
  "iv-interaction": CustomEvent<EngineEvents["interaction"]>;
  "iv-answer": CustomEvent<EngineEvents["answer"]>;
  "iv-hotspot": CustomEvent<EngineEvents["hotspot"]>;
  "iv-end": CustomEvent<EngineEvents["end"]>;
}

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
 * `HTMLElement`, or a stand-in where it doesn't exist (server-side rendering), so
 * importing the package never throws there. The stand-in is never instantiated:
 * without `customElements`, nothing creates players.
 */
const Base: typeof HTMLElement =
  typeof HTMLElement === "undefined" ? (class {} as typeof HTMLElement) : HTMLElement;

/**
 * `<ivkit-player>`: plays a `Story` set through the `story` property.
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
 *
 * The element wires the story to the shadow DOM; the control bar, fullscreen and
 * hotspot drawing live in their own modules.
 */
export class IvkitPlayer extends Base {
  static readonly observedAttributes = ["muted", "controls"];

  readonly #videos: [HTMLVideoElement, HTMLVideoElement];
  readonly #stage: HTMLElement;
  readonly #question: HTMLElement;
  readonly #questionText: HTMLElement;
  readonly #options: HTMLElement;
  readonly #start: HTMLElement;
  readonly #end: HTMLElement;
  readonly #controls: Controls;
  readonly #fullscreen: Fullscreen;
  readonly #hotspots: HotspotLayer;
  readonly #resizeObserver: ResizeObserver | null;

  #story: Story | null = null;
  #engine: StoryEngine | null = null;
  #controller: MediaController<HTMLVideoElement> | null = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${styles}</style>${template}`;
    const find = <T extends HTMLElement>(selector: string) => {
      const element = root.querySelector<T>(selector);
      if (!element) throw new Error(`<ivkit-player> template is missing ${selector}`);
      return element;
    };

    const videos = root.querySelectorAll("video");
    this.#videos = [videos[0] as HTMLVideoElement, videos[1] as HTMLVideoElement];
    this.#stage = find(".stage");
    this.#question = find(".question");
    this.#questionText = find(".question-text");
    this.#options = find(".options");
    this.#start = find(".start");
    this.#end = find(".end");
    const activeVideo = () => this.#activeVideo();
    this.#controls = new Controls(find, this.#stage, {
      video: activeVideo,
      togglePlay: () => this.#togglePlay(),
      toggleMuted: () => this.toggleAttribute("muted"),
      toggleFullscreen: () => this.toggleFullscreen(),
      seek: (time) => this.#seekTo(time),
      setVolume: (volume) => {
        for (const element of this.#videos) element.volume = volume;
        if (volume > 0) this.removeAttribute("muted");
      },
    });
    this.#fullscreen = new Fullscreen(this, () =>
      this.#controls.renderFullscreen(this.#fullscreen.active),
    );
    const hotspots = find(".hotspots");
    this.#hotspots = new HotspotLayer(hotspots, this.#stage, activeVideo);

    find(".start-button").addEventListener("click", () => this.play());
    find(".replay-button").addEventListener("click", () => this.restart());
    this.#options.addEventListener("click", (event) => {
      const id = buttonId(event);
      if (id !== undefined) this.#engine?.answer(id);
    });
    hotspots.addEventListener("click", (event) => {
      const id = buttonId(event);
      if (id !== undefined) this.#engine?.activate(id);
    });

    for (const video of this.#videos) {
      video.addEventListener("loadedmetadata", () => this.#hotspots.layout());
      // Seeks while paused don't always reach the controller's `time` events.
      video.addEventListener("seeked", () => {
        if (video === this.#activeVideo()) this.#hotspots.position();
      });
      for (const type of [
        "play",
        "pause",
        "timeupdate",
        "durationchange",
        "volumechange",
        "seeked",
      ]) {
        video.addEventListener(type, () => {
          if (video === this.#activeVideo()) this.#controls.render();
        });
      }
      video.addEventListener("play", () => this.#controls.wake());
    }

    this.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.#fullscreen.pseudo) this.#fullscreen.setPseudo(false);
      else if (this.hasAttribute("controls")) this.#controls.keydown(event);
    });

    this.#resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => this.#hotspots.layout());
    this.#controls.render();
    this.#controls.renderFullscreen(false);
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
    this.#fullscreen.connect();
    this.#makeFocusable();
    this.#hotspots.animate();
  }

  disconnectedCallback(): void {
    this.#resizeObserver?.disconnect();
    this.#fullscreen.disconnect();
    this.#hotspots.stop();
    this.#controls.sleep();
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
      this.#hotspots.layout();
      this.#controls.render();
    });
    controller.on("time", ({ time }) => this.#hotspots.update(time));
    controller.on("blocked", () => {
      this.#start.hidden = false;
      this.#updateControlsVisibility();
    });

    engine.on("scene", (detail) => {
      // A scene change can interrupt a question, e.g. restart() or goTo() while it's showing.
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
    engine.on("hotspots", ({ hotspots }) => this.#hotspots.render(hotspots));
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
    return this.#hotspots.renderer;
  }

  set renderHotspot(renderer: HotspotRenderer | null) {
    this.#hotspots.renderer = renderer;
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
    if (this.#story) this.goTo(this.#story.start);
  }

  /**
   * Jumps to the scene `sceneId` and plays it, dismissing the question on screen, if any.
   * Use it to resume a saved story or to build chapter menus. Throws if the scene doesn't exist.
   */
  goTo(sceneId: SceneId): void {
    if (!this.#engine) return;
    this.#start.hidden = true;
    this.#engine.goTo(sceneId);
  }

  /** Whether the player fills the screen, natively or through the iPhone fallback. */
  get isFullscreen(): boolean {
    return this.#fullscreen.active;
  }

  /**
   * Puts the whole player (videos, questions and hotspots) in fullscreen, or leaves it.
   * Where elements can't go fullscreen (iPhone), it covers the viewport instead.
   */
  toggleFullscreen(): void {
    this.#fullscreen.toggle();
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
    this.#hotspots.render([]);
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

  /** Lets keyboard shortcuts work by making the player itself focusable, unless the page decided. */
  #makeFocusable(): void {
    if (this.isConnected && this.hasAttribute("controls") && !this.hasAttribute("tabindex")) {
      this.tabIndex = 0;
    }
  }

  /** Controls are hidden over the start, question and end screens. */
  #updateControlsVisibility(): void {
    const state = this.#engine?.state;
    this.#controls.element.hidden =
      !this.hasAttribute("controls") ||
      state === undefined ||
      state === "idle" ||
      state === "interacting" ||
      state === "ended" ||
      !this.#start.hidden;
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

  #emit<K extends keyof IvkitPlayerEventMap>(
    type: K,
    detail: IvkitPlayerEventMap[K]["detail"],
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
