import { describe, expect, it } from "vitest";
import { IvkitPlayer, defineIvkitPlayer } from "../src/element";
import * as server from "../src/server";

// Runs before anything imports the main entry, which registers <ivkit-player>.
describe("element entry", () => {
  it("doesn't register the element on import", () => {
    expect(customElements.get("ivkit-player")).toBeUndefined();
  });

  it("registers it under the name given", () => {
    defineIvkitPlayer("story-player");
    expect(customElements.get("story-player")).toBe(IvkitPlayer);
    expect(document.createElement("story-player")).toBeInstanceOf(IvkitPlayer);
  });

  it("ignores a name that's already taken", () => {
    expect(() => defineIvkitPlayer("story-player")).not.toThrow();
  });
});

describe("server build", () => {
  it("has the same exports, and defining is a no-op", () => {
    expect(Object.keys(server).sort()).toEqual(["IvkitPlayer", "defineIvkitPlayer"]);
    expect(() => server.defineIvkitPlayer("server-player")).not.toThrow();
    expect(customElements.get("server-player")).toBeUndefined();
  });
});
