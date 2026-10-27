/**
 * Server build of both entries, picked through the `react-server`, `workerd` and
 * `edge-light` export conditions: none of the player's DOM code, which can't run
 * there anyway. Rendering `<iv-player>` on the server only needs the tag; the
 * browser build defines it.
 *
 * Plain Node keeps the full build, which is safe to import too: test runners
 * like Vitest load dependencies through Node while providing a DOM, and need
 * the real element.
 */
import type { IvPlayer as Player } from "./player.js";

export type { HotspotRenderer, IvPlayerEventMap } from "./player.js";

/** Stand-in for the element class; players only exist in the browser. */
export const IvPlayer = class {} as unknown as typeof Player;

/** Does nothing on the server. */
export function defineIvPlayer(_name?: string): void {}
