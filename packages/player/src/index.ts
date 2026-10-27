import { defineIvkitPlayer, type IvkitPlayer } from "./element.js";

export * from "./element.js";

declare global {
  interface HTMLElementTagNameMap {
    "ivkit-player": IvkitPlayer;
  }
}

// On the server there's no registry: the element is defined once this runs in the browser.
defineIvkitPlayer();
