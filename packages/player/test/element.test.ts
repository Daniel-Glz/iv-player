import { describe, expect, it } from "vitest";
import { IvPlayer, defineIvPlayer } from "../src/element";
import * as server from "../src/server";

// Runs before anything imports the main entry, which registers <iv-player>.
describe("element entry", () => {
  it("doesn't register the element on import", () => {
    expect(customElements.get("iv-player")).toBeUndefined();
  });

  it("registers it under the name given", () => {
    defineIvPlayer("story-player");
    expect(customElements.get("story-player")).toBe(IvPlayer);
    expect(document.createElement("story-player")).toBeInstanceOf(IvPlayer);
  });

  it("ignores a name that's already taken", () => {
    expect(() => defineIvPlayer("story-player")).not.toThrow();
  });
});

describe("server build", () => {
  it("has the same exports, and defining is a no-op", () => {
    expect(Object.keys(server).sort()).toEqual(["IvPlayer", "defineIvPlayer"]);
    expect(() => server.defineIvPlayer("server-player")).not.toThrow();
    expect(customElements.get("server-player")).toBeUndefined();
  });
});
