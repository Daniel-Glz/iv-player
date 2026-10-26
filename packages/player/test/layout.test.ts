import { describe, expect, it } from "vitest";
import { containRect } from "../src/layout";

describe("containRect", () => {
  it("fills the box when aspect ratios match", () => {
    expect(containRect(1600, 900, 1920, 1080)).toEqual({ left: 0, top: 0, width: 1600, height: 900 });
  });

  it("adds bars left and right for a taller picture", () => {
    expect(containRect(1600, 900, 1080, 1080)).toEqual({ left: 350, top: 0, width: 900, height: 900 });
  });

  it("adds bars top and bottom for a wider picture", () => {
    expect(containRect(800, 800, 1920, 1080)).toEqual({ left: 0, top: 175, width: 800, height: 450 });
  });

  it("uses the whole box until the media size is known", () => {
    expect(containRect(640, 360, 0, 0)).toEqual({ left: 0, top: 0, width: 640, height: 360 });
  });
});
