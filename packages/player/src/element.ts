/**
 * `@ivkit/player/element`: the element class, without registering it.
 * Use it to pick the tag name or the moment it's defined; the main entry
 * registers `<ivkit-player>` on import.
 */
import {
  IvkitPlayer,
  type HotspotRenderer,
  type IvkitPlayerEventMap,
  type PlayerPlugin,
  type PlayerPluginContext,
} from "./player.js";

export { IvkitPlayer };
export type { HotspotRenderer, IvkitPlayerEventMap, PlayerPlugin, PlayerPluginContext };

declare global {
  // Lets `addEventListener("iv-answer", …)` infer the event's detail type.
  interface HTMLElementEventMap extends IvkitPlayerEventMap {}
}

/**
 * Registers the player as `name` (default `"ivkit-player"`). Does nothing if that
 * name is already taken, or where there's no `customElements` (on the server).
 * A class can only be registered once, so call it with a single name.
 */
export function defineIvkitPlayer(name = "ivkit-player"): void {
  if (typeof customElements === "undefined" || customElements.get(name)) return;
  customElements.define(name, IvkitPlayer);
}
