/**
 * `@iv-player/player/element`: the element class, without registering it.
 * Use it to pick the tag name or the moment it's defined; the main entry
 * registers `<iv-player>` on import.
 */
import { IvPlayer, type HotspotRenderer, type IvPlayerEventMap } from "./player.js";

export { IvPlayer };
export type { HotspotRenderer, IvPlayerEventMap };

declare global {
  // Lets `addEventListener("iv-answer", …)` infer the event's detail type.
  interface HTMLElementEventMap extends IvPlayerEventMap {}
}

/**
 * Registers the player as `name` (default `"iv-player"`). Does nothing if that
 * name is already taken, or where there's no `customElements` (on the server).
 * A class can only be registered once, so call it with a single name.
 */
export function defineIvPlayer(name = "iv-player"): void {
  if (typeof customElements === "undefined" || customElements.get(name)) return;
  customElements.define(name, IvPlayer);
}
