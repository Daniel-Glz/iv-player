import { version } from "../package.json";

/** The version of @ivkit/core, read from its package.json at build time. */
export const VERSION: string = version;

export type * from "./types.js";
export { StoryEngine } from "./engine.js";
export type { EngineEvents, EngineState } from "./engine.js";
export { boundsOf, hotspotGeometryAt, isAnimated } from "./geometry.js";
export type { HotspotGeometry } from "./geometry.js";
export { MediaController } from "./media.js";
export type { MediaControllerEvents, MediaElement, VideoFrameCallback } from "./media.js";
export type { Listener } from "./emitter.js";

export { validateStory } from "./validation.js";
export type { StoryValidationError, StoryValidationResult } from "./validation.js";
