import { IvPlayer, type IvPlayerEventMap } from "./player.js";

export { IvPlayer };
export type { IvPlayerEventMap };

declare global {
  interface HTMLElementTagNameMap {
    "iv-player": IvPlayer;
  }
  // Lets `addEventListener("iv-answer", …)` infer the event's detail type.
  interface HTMLElementEventMap extends IvPlayerEventMap {}
}

if (!customElements.get("iv-player")) {
  customElements.define("iv-player", IvPlayer);
}
