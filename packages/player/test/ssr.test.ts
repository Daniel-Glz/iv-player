// @vitest-environment node
import { describe, expect, it } from "vitest";

// Frameworks import the package while rendering on the server, where there's no DOM.
describe("importing on the server", () => {
  it("runs without HTMLElement or customElements", async () => {
    expect(typeof HTMLElement).toBe("undefined");
    expect(typeof customElements).toBe("undefined");

    const { IvkitPlayer } = await import("../src/index");
    expect(IvkitPlayer.observedAttributes).toEqual(["muted", "controls"]);
  });

  it("loads the standalone bundle's source the same way", async () => {
    await expect(import("../src/player")).resolves.toHaveProperty("IvkitPlayer");
  });
});
