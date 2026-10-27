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

// On the server there's no registry: the element is defined once this runs in the browser.
if (typeof customElements !== "undefined" && !customElements.get("iv-player")) {
  customElements.define("iv-player", IvPlayer);
}
