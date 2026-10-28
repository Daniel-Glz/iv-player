import {
  answerRange,
  MediaController,
  StoryEngine,
  type Choice,
  type EngineEvents,
  type Listener,
  type Question,
  type SceneId,
  type Story,
} from "@ivkit/core";
import { Controls } from "./controls.js";
import { Fullscreen } from "./fullscreen.js";
import { HotspotLayer, type HotspotRenderer } from "./hotspot-layer.js";
import { styles } from "./styles.js";

export type { HotspotRenderer };

/** What a plugin gets each time a story is set on the player. */
export interface PlayerPluginContext {
  player: IvkitPlayer;
  engine: StoryEngine;
  media: MediaController<HTMLVideoElement>;
  /**
   * The plugin's own element, covering the stage above the video and hotspots and
   * below questions and controls. It lets clicks through: give clickable content
   * `pointer-events: auto`. Give elements a `part` so pages can style them.
   */
  layer: HTMLElement;
  /** Subscribes to an engine event until the plugin is cleaned up. */
  on<K extends keyof EngineEvents>(type: K, listener: Listener<EngineEvents[K]>): void;
}

/**
 * Extends the player. It runs each time a story is set, and may return a cleanup
 * that runs when the story is replaced or the plugin removed.
 */
// biome-ignore lint/suspicious/noConfusingVoidType: lets plugins without a cleanup return nothing.
export type PlayerPlugin = (context: PlayerPluginContext) => (() => void) | void;

/** Events dispatched by `<ivkit-player>`. They bubble and cross the shadow boundary. */
export interface IvkitPlayerEventMap {
  "iv-scene": CustomEvent<EngineEvents["scene"]>;
  "iv-interaction": CustomEvent<EngineEvents["interaction"]>;
  "iv-answer": CustomEvent<EngineEvents["answer"]>;
  "iv-timeout": CustomEvent<EngineEvents["timeout"]>;
  "iv-hotspot": CustomEvent<EngineEvents["hotspot"]>;
  "iv-cues": CustomEvent<EngineEvents["cues"]>;
  "iv-end": CustomEvent<EngineEvents["end"]>;
}

// Picture-in-picture would show a single video without overlays, so it's disabled.
const template = /* html */ `
<div class="stage" part="stage">
  <video part="video" playsinline disablepictureinpicture></video>
  <video part="video" playsinline disablepictureinpicture></video>
  <div class="hotspots" part="hotspots"></div>
  <div class="plugins" part="plugins"></div>
  <div class="overlay question" part="question" hidden>
    <p class="question-text" part="question-text" id="question-text"></p>
    <div class="options" part="options" role="group" aria-labelledby="question-text"></div>
    <button class="submit" part="submit" type="button" hidden>Confirm</button>
    <div class="timer" part="timer" hidden></div>
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
  readonly #submit: HTMLButtonElement;
  readonly #timer: HTMLElement;
  readonly #start: HTMLElement;
  readonly #end: HTMLElement;
  readonly #controls: Controls;
  readonly #fullscreen: Fullscreen;
  readonly #hotspots: HotspotLayer;
  readonly #layers: HTMLElement;
  /** Plugins in use, each with the cleanup of its run for the current story, if any. */
  readonly #plugins = new Map<PlayerPlugin, (() => void) | null>();
  readonly #resizeObserver: ResizeObserver | null;

  #story: Story | null = null;
  #engine: StoryEngine | null = null;
  #controller: MediaController<HTMLVideoElement> | null = null;
  /** How many options a `multiple` answer takes, from the question on screen. */
  #range: [min: number, max: number] = [1, 1];

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
    this.#submit = find(".submit");
    this.#timer = find(".timer");
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
    this.#layers = find(".plugins");

    find(".start-button").addEventListener("click", () => this.play());
    find(".replay-button").addEventListener("click", () => this.restart());
    this.#options.addEventListener("click", (event) => {
      const button = buttonOf(event);
      if (!button) return;
      if (button.hasAttribute("aria-pressed")) {
        const pressed = button.getAttribute("aria-pressed") === "true";
        button.setAttribute("aria-pressed", String(!pressed));
        button.setAttribute("part", pressed ? "option" : "option option-picked");
        this.#updateSubmit();
      } else {
        this.#engine?.answer(button.dataset["id"] ?? "");
      }
    });
    this.#submit.addEventListener("click", () => this.#engine?.answer(this.#picked()));
    hotspots.addEventListener("click", (event) => {
      const id = buttonOf(event)?.dataset["id"];
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
      video.addEventListener("play", () => {
        // A scene that finishes loading after the player left the page mustn't play there.
        if (!this.isConnected) video.pause();
        this.#controls.wake();
      });
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
    this.#engine?.resumeTimeout();
  }

  /** Pauses the story while off the page, question timeouts included, until it's back. */
  disconnectedCallback(): void {
    this.#resizeObserver?.disconnect();
    this.#fullscreen.disconnect();
    this.#hotspots.stop();
    this.#controls.sleep();
    this.pause();
    this.#engine?.pauseTimeout();
    // The countdown restarts when the player is back; make it go on from where it was.
    const bar = this.#timer.firstElementChild as HTMLElement | null;
    const elapsed = bar?.getAnimations?.()[0]?.currentTime;
    if (bar && typeof elapsed === "number") bar.style.animationDelay = `${-elapsed}ms`;
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

    const on = <K extends keyof EngineEvents>(type: K, listener: Listener<EngineEvents[K]>) =>
      engine.on(type, listener);
    on("scene", (detail) => {
      // A scene change can interrupt a question, e.g. restart() or goTo() while it's showing.
      this.#question.hidden = true;
      this.#end.hidden = true;
      this.#updateControlsVisibility();
      this.#emit("iv-scene", detail);
    });
    on("interaction", (detail) => {
      this.#showQuestion(detail.question, detail.options);
      this.#updateControlsVisibility();
      this.#emit("iv-interaction", detail);
    });
    on("answer", (detail) => {
      this.#question.hidden = true;
      this.#updateControlsVisibility();
      this.#emit("iv-answer", detail);
    });
    on("timeout", (detail) => {
      this.#question.hidden = true;
      this.#updateControlsVisibility();
      this.#emit("iv-timeout", detail);
    });
    on("hotspots", ({ hotspots }) => this.#hotspots.render(hotspots));
    on("cues", (detail) => this.#emit("iv-cues", detail));
    on("hotspot", (detail) => {
      const { href } = detail.hotspot;
      if (href !== undefined) {
        // Clicking a link keeps the user gesture, so popup blockers allow it.
        const link = document.createElement("a");
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener";
        if (/^https?:$/.test(link.protocol)) link.click();
      }
      this.#emit("iv-hotspot", detail);
    });
    on("end", (detail) => {
      this.#end.hidden = false;
      this.#updateControlsVisibility();
      this.#emit("iv-end", detail);
    });

    for (const plugin of this.#plugins.keys()) this.#run(plugin);
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

  /**
   * Adds `plugin`, running it now if a story is set (it may have missed events, so
   * read the engine's state) and for every story set from then on. Plugins run in the
   * order they were added; adding one twice does nothing. Returns a function that
   * removes it, running its cleanup.
   */
  use(plugin: PlayerPlugin): () => void {
    if (!this.#plugins.has(plugin)) {
      this.#plugins.set(plugin, null);
      this.#run(plugin);
    }
    return () => {
      this.#plugins.get(plugin)?.();
      this.#plugins.delete(plugin);
    };
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
   * Jumps to the scene `sceneId` and plays it from `time` (seconds), dismissing the
   * question on screen, if any. Use it to resume a saved story or to build chapter
   * menus. Throws if the scene doesn't exist.
   */
  goTo(sceneId: SceneId, time = 0): void {
    if (!this.#engine) return;
    this.#start.hidden = true;
    this.#engine.goTo(sceneId, time);
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
    for (const [plugin, cleanup] of this.#plugins) {
      cleanup?.();
      this.#plugins.set(plugin, null);
    }
    this.#controller?.destroy();
    this.#controller = null;
    // Also cancels a question's timeout, which would make the old engine go on.
    this.#engine?.destroy();
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

  /** Runs `plugin` for the current story, if any, in a new layer. */
  #run(plugin: PlayerPlugin): void {
    const engine = this.#engine;
    const media = this.#controller;
    if (!engine || !media) return;
    const layer = document.createElement("div");
    layer.setAttribute("part", "plugin");
    this.#layers.append(layer);
    const offs: (() => void)[] = [];
    const cleanup = plugin({
      player: this,
      engine,
      media,
      layer,
      on: (type, listener) => {
        offs.push(engine.on(type, listener));
      },
    });
    this.#plugins.set(plugin, () => {
      for (const off of offs) off();
      cleanup?.();
      layer.remove();
    });
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

  /**
   * Shows `question` with a button per option. For a `multiple` question they toggle,
   * and the submit button answers with the pressed ones.
   */
  #showQuestion(question: Question, options: readonly Choice[]): void {
    const multiple = question.multiple === true;
    this.#questionText.textContent = question.text;
    this.#options.replaceChildren(
      ...options.map((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("part", "option");
        button.dataset["id"] = option.id;
        button.textContent = option.label;
        if (multiple) button.setAttribute("aria-pressed", "false");
        return button;
      }),
    );
    this.#range = answerRange(question, options.length);
    this.#submit.hidden = !multiple;
    // A new bar restarts the countdown animation.
    const bar = document.createElement("div");
    bar.style.animationDuration = `${question.timeout}s`;
    this.#timer.replaceChildren(bar);
    this.#timer.hidden = question.timeout === undefined;
    this.#updateSubmit();
    this.#question.hidden = false;
    this.#options.querySelector("button")?.focus({ preventScroll: true });
  }

  /** IDs of the pressed options of a `multiple` question. */
  #picked(): string[] {
    return [...this.#options.querySelectorAll<HTMLElement>("[aria-pressed=true]")].map(
      (button) => button.dataset["id"] ?? "",
    );
  }

  /** Enables the submit button only while the pressed options are within the range. */
  #updateSubmit(): void {
    const count = this.#picked().length;
    this.#submit.disabled = count < this.#range[0] || count > this.#range[1];
  }

  #emit<K extends keyof IvkitPlayerEventMap>(
    type: K,
    detail: IvkitPlayerEventMap[K]["detail"],
  ): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

/** Button with a `data-id` an event happened in, if any. */
function buttonOf(event: Event): HTMLElement | null {
  const target = event.target;
  return target instanceof Element ? target.closest<HTMLElement>("button[data-id]") : null;
}
