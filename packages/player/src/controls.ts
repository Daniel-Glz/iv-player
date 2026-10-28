import { icons, type IconName } from "./icons.js";

/** Inactivity before the controls fade out while playing. */
const IDLE_DELAY_MS = 3000;
/** Seconds skipped by the arrow keys. */
const SEEK_STEP = 5;

/** What the control bar acts on; implemented by the player. */
export interface ControlsHost {
  /** The video on top, whose state the bar shows. */
  video(): HTMLVideoElement;
  togglePlay(): void;
  toggleMuted(): void;
  toggleFullscreen(): void;
  /** Seeks the current scene to `time` seconds. */
  seek(time: number): void;
  /** Sets the volume (0–1) of both videos. */
  setVolume(volume: number): void;
}

/**
 * The control bar (play/pause, seek within the scene, volume, fullscreen), its
 * keyboard shortcuts and its fading out after a while without activity.
 */
export class Controls {
  readonly element: HTMLElement;
  readonly #playButton: HTMLButtonElement;
  readonly #progress: HTMLInputElement;
  readonly #time: HTMLElement;
  readonly #muteButton: HTMLButtonElement;
  readonly #volume: HTMLInputElement;
  readonly #fullscreenButton: HTMLButtonElement;
  #idleTimer: ReturnType<typeof setTimeout> | undefined;
  #scrubbing = false;

  /** Gets the `idle` class while the controls are faded out. */
  readonly #stage: HTMLElement;
  readonly #host: ControlsHost;

  constructor(
    find: <T extends HTMLElement>(selector: string) => T,
    stage: HTMLElement,
    host: ControlsHost,
  ) {
    this.#stage = stage;
    this.#host = host;
    this.element = find(".controls");
    this.#playButton = find(".play-toggle");
    this.#progress = find(".progress");
    this.#time = find(".time");
    this.#muteButton = find(".mute-toggle");
    this.#volume = find(".volume");
    this.#fullscreenButton = find(".fullscreen-toggle");

    this.#playButton.addEventListener("click", () => host.togglePlay());
    this.#muteButton.addEventListener("click", () => host.toggleMuted());
    this.#fullscreenButton.addEventListener("click", () => host.toggleFullscreen());
    this.#volume.addEventListener("input", () => host.setVolume(Number(this.#volume.value)));
    this.#progress.addEventListener("input", () => host.seek(Number(this.#progress.value)));
    this.#progress.addEventListener("pointerdown", () => (this.#scrubbing = true));
    this.#progress.addEventListener("change", () => (this.#scrubbing = false));
    stage.addEventListener("pointermove", () => this.wake());
    stage.addEventListener("pointerdown", () => this.wake());
  }

  /** Shows the controls and schedules hiding them after a while without activity. */
  wake(): void {
    this.#stage.classList.remove("idle");
    clearTimeout(this.#idleTimer);
    this.#idleTimer = setTimeout(() => {
      if (this.#host.video().paused || this.element.matches(":hover, :focus-within")) return;
      this.#stage.classList.add("idle");
    }, IDLE_DELAY_MS);
  }

  sleep(): void {
    clearTimeout(this.#idleTimer);
  }

  /** Shows the active video's state: playing, time, volume. */
  render(): void {
    const video = this.#host.video();
    setIcon(this.#playButton, video.paused ? "play" : "pause", video.paused ? "Play" : "Pause");

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    this.#progress.max = String(duration);
    if (!this.#scrubbing) this.#progress.value = String(video.currentTime);
    this.#time.textContent = `${formatTime(video.currentTime)} / ${formatTime(duration)}`;

    const silent = video.muted || video.volume === 0;
    setIcon(this.#muteButton, silent ? "muted" : "volume", silent ? "Unmute" : "Mute");
    this.#volume.value = String(silent ? 0 : video.volume);
  }

  renderFullscreen(on: boolean): void {
    setIcon(
      this.#fullscreenButton,
      on ? "exitFullscreen" : "enterFullscreen",
      on ? "Exit full screen" : "Full screen",
    );
  }

  /** Handles the keyboard shortcuts: space/k, m, f, ←/→. */
  keydown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    // Focused controls keep their native keys: arrows on sliders, space/enter on buttons.
    const target = event.composedPath()[0];
    if (target instanceof HTMLInputElement) return;
    if (target instanceof HTMLButtonElement && (event.key === " " || event.key === "Enter")) return;

    const host = this.#host;
    switch (event.key.toLowerCase()) {
      case " ":
      case "k":
        host.togglePlay();
        break;
      case "m":
        host.toggleMuted();
        break;
      case "f":
        host.toggleFullscreen();
        break;
      case "arrowleft":
        host.seek(host.video().currentTime - SEEK_STEP);
        break;
      case "arrowright":
        host.seek(host.video().currentTime + SEEK_STEP);
        break;
      default:
        return;
    }
    event.preventDefault();
    this.wake();
  }
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
