/**
 * Fullscreen of the whole player (videos, questions and hotspots). Where elements
 * can't go fullscreen (iPhone), it covers the viewport instead and marks the host
 * with the `pseudo-fullscreen` attribute.
 */
export class Fullscreen {
  /** The page's `overflow`, restored when leaving pseudo-fullscreen. */
  #savedOverflow = "";
  readonly #host: HTMLElement;
  /** Called whenever the player enters or leaves fullscreen. */
  readonly #changed: () => void;

  constructor(host: HTMLElement, changed: () => void) {
    this.#host = host;
    this.#changed = changed;
  }

  get active(): boolean {
    return document.fullscreenElement === this.#host || this.pseudo;
  }

  get pseudo(): boolean {
    return this.#host.hasAttribute("pseudo-fullscreen");
  }

  toggle(): void {
    const host = this.#host;
    if (document.fullscreenElement === host) {
      void document.exitFullscreen();
    } else if (this.pseudo) {
      this.setPseudo(false);
    } else if (document.fullscreenEnabled && typeof host.requestFullscreen === "function") {
      host.requestFullscreen().catch(() => this.setPseudo(true));
    } else {
      this.setPseudo(true);
    }
  }

  setPseudo(on: boolean): void {
    if (on === this.pseudo) return;
    this.#host.toggleAttribute("pseudo-fullscreen", on);
    // Keep the page behind from scrolling while the player covers it.
    const page = document.documentElement;
    if (on) {
      this.#savedOverflow = page.style.overflow;
      page.style.overflow = "hidden";
    } else {
      page.style.overflow = this.#savedOverflow;
    }
    this.#changed();
  }

  /** Starts following native fullscreen changes, e.g. when the viewer presses Escape. */
  connect(): void {
    document.addEventListener("fullscreenchange", this.#changed);
  }

  disconnect(): void {
    document.removeEventListener("fullscreenchange", this.#changed);
    this.setPseudo(false);
  }
}
