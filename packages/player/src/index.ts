import { defineIvPlayer, type IvPlayer } from "./element.js";

export * from "./element.js";

declare global {
  interface HTMLElementTagNameMap {
    "iv-player": IvPlayer;
  }
}

// On the server there's no registry: the element is defined once this runs in the browser.
defineIvPlayer();
