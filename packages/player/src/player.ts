import {
  MediaController,
  StoryEngine,
  type EngineEvents,
  type Hotspot,
  type Question,
  type Story,
} from "@iv-player/core";
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

const template = /* html */ `
<div class="stage" part="stage">
  <video part="video" playsinline></video>
  <video part="video" playsinline></video>
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
</div>
`;

/**
 * `<iv-player>`: plays a `Story` set through the `story` property.
 *
 * Attributes:
 * - `autoplay`: start as soon as a story is set (browsers may block it unless `muted`).
 * - `muted`: mute both videos.
 *
 * Slots: `start` (start button content) and `end` (shown when the story ends;
 * defaults to a replay button).
 */
export class IvPlayer extends HTMLElement {
  static readonly observedAttributes = ["muted"];

  readonly #videos: [HTMLVideoElement, HTMLVideoElement];
  readonly #stage: HTMLElement;
  readonly #hotspots: HTMLElement;
  readonly #question: HTMLElement;
  readonly #questionText: HTMLElement;
  readonly #options: HTMLElement;
  readonly #start: HTMLElement;
  readonly #end: HTMLElement;
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
    for (const video of this.#videos) {
      video.addEventListener("loadedmetadata", () => this.#layoutHotspots());
    }

    this.#resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => this.#layoutHotspots());
  }

  connectedCallback(): void {
    this.#resizeObserver?.observe(this.#stage);
  }

  disconnectedCallback(): void {
    this.#resizeObserver?.disconnect();
    this.pause();
  }

  attributeChangedCallback(name: string): void {
    if (name === "muted") {
      for (const video of this.#videos) video.muted = this.hasAttribute("muted");
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
    });
    controller.on("blocked", () => {
      this.#start.hidden = false;
    });

    engine.on("scene", (detail) => {
      this.#end.hidden = true;
      this.#emit("iv-scene", detail);
    });
    engine.on("interaction", (detail) => {
      this.#showQuestion(detail.question);
      this.#emit("iv-interaction", detail);
    });
    engine.on("answer", (detail) => {
      this.#question.hidden = true;
      this.#emit("iv-answer", detail);
    });
    engine.on("hotspots", ({ hotspots }) => this.#renderHotspots(hotspots));
    engine.on("hotspot", (detail) => this.#emit("iv-hotspot", detail));
    engine.on("end", (detail) => {
      this.#end.hidden = false;
      this.#emit("iv-end", detail);
    });

    if (this.hasAttribute("autoplay")) this.play();
    else this.#start.hidden = false;
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
    const video = this.#controller?.active ?? this.#videos[0];
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
