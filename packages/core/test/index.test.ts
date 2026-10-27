import { describe, expect, it } from "vitest";
import pkg from "../package.json";
import { VERSION } from "../src/index";

describe("@ivkit/core", () => {
  it("exposes the published version", () => {
    expect(VERSION).toBe(pkg.version);
  });
});
