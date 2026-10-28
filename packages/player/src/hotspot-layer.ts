import {
  boundsOf,
  hotspotGeometryAt,
  isAnimated,
  type Hotspot,
  type HotspotGeometry,
} from "@ivkit/core";
import { containRect } from "./layout.js";

/** Customizes a hotspot's button right after the player creates it. See `IvkitPlayer.renderHotspot`. */
export type HotspotRenderer = (hotspot: Hotspot, element: HTMLButtonElement) => void;

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

/**
 * Draws the visible hotspots as buttons over the picture of the active video.
 *
 * Animated hotspots follow the `MediaController`'s `time` events, i.e. the exact
 * time of every presented frame. Videos without frame callbacks only report
 * `timeupdate` (~4 Hz), so there they're also moved on every animation frame.
 */
export class HotspotLayer {
  renderer: HotspotRenderer | null = null;
  /** Buttons of the hotspots on screen. */
  #buttons = new Map<Hotspot, HTMLButtonElement>();
  #animated = false;
  #animationFrame = 0;

  readonly #element: HTMLElement;
  /** Box the videos are fitted in. */
  readonly #stage: HTMLElement;
  /** The video on top, whose picture the hotspots are drawn over. */
  readonly #video: () => HTMLVideoElement;

  constructor(element: HTMLElement, stage: HTMLElement, video: () => HTMLVideoElement) {
    this.#element = element;
    this.#stage = stage;
    this.#video = video;
  }

  /** Replaces the hotspots on screen. */
  render(hotspots: readonly Hotspot[]): void {
    this.#buttons = new Map(hotspots.map((hotspot) => [hotspot, this.#create(hotspot)]));
    this.#element.replaceChildren(...this.#buttons.values());
    this.#animated = hotspots.some(isAnimated);
    this.position();
    this.animate();
  }

  /** Places every hotspot at its geometry for `time` (default: the current playback time). */
  position(time = this.#video().currentTime): void {
    for (const [hotspot, button] of this.#buttons) {
      const geometry = hotspotGeometryAt(hotspot, time);
      button.hidden = geometry === null;
      if (geometry) applyGeometry(button, geometry);
    }
  }

  /** Playback reached `time`: moves the animated hotspots there. */
  update(time: number): void {
    if (this.#animated) this.position(time);
  }

  /** Matches the layer to the picture of the active video, excluding letterboxing. */
  layout(): void {
    const video = this.#video();
    const rect = containRect(
      this.#stage.clientWidth,
      this.#stage.clientHeight,
      video.videoWidth,
      video.videoHeight,
    );
    Object.assign(this.#element.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  /**
   * Moves animated hotspots on every animation frame while any is on screen, if the
   * video can't report its frames. `currentTime` read that way runs up to most of a
   * frame ahead of the picture, which shows as lag on fast motion; it's only the fallback.
   */
  animate(): void {
    this.stop();
    const video = this.#video();
    if (
      !this.#animated ||
      !video.isConnected ||
      typeof video.requestVideoFrameCallback === "function"
    ) {
      return;
    }
    const tick = () => {
      this.position();
      this.#animationFrame = requestAnimationFrame(tick);
    };
    this.#animationFrame = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.#animationFrame);
  }

  #create(hotspot: Hotspot): HTMLButtonElement {
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
    this.renderer?.(hotspot, button);
    return button;
  }
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
