import { describe, expect, it } from "vitest";
import { boundsOf, hotspotGeometryAt, isAnimated, type Hotspot } from "../src/index";

const base = { type: "hotspot", id: "h", from: 0, label: "H" } as const;
const box = (x: number, y: number, width = 0.1, height = 0.1) => ({ x, y, width, height });

describe("hotspotGeometryAt", () => {
  it("returns a static rect by default", () => {
    const hotspot: Hotspot = { ...base, area: box(0.2, 0.3) };
    expect(hotspotGeometryAt(hotspot, 5)).toEqual({
      kind: "box",
      area: box(0.2, 0.3),
      roundness: 0,
    });
  });

  it("gives ellipses full roundness", () => {
    const hotspot: Hotspot = { ...base, shape: "ellipse", area: box(0, 0) };
    expect(hotspotGeometryAt(hotspot, 0)).toMatchObject({ kind: "box", roundness: 1 });
  });

  it("returns static polygons", () => {
    const points = [
      [0, 0],
      [1, 0],
      [0.5, 1],
    ] as const;
    expect(hotspotGeometryAt({ ...base, shape: "polygon", points }, 0)).toEqual({
      kind: "polygon",
      points,
    });
  });

  it("returns null without usable geometry", () => {
    expect(hotspotGeometryAt({ ...base }, 0)).toBeNull();
    expect(
      hotspotGeometryAt(
        {
          ...base,
          shape: "polygon",
          points: [
            [0, 0],
            [1, 1],
          ],
        },
        0,
      ),
    ).toBeNull();
  });

  describe("keyframes", () => {
    const moving: Hotspot = {
      ...base,
      // Declared out of order on purpose.
      keyframes: [
        { at: 4, area: box(0.8, 0.4) },
        { at: 2, area: box(0.2, 0.2) },
      ],
    };

    it("holds the first and last keyframes outside their range", () => {
      expect(hotspotGeometryAt(moving, 0)).toMatchObject({ area: box(0.2, 0.2) });
      expect(hotspotGeometryAt(moving, 9)).toMatchObject({ area: box(0.8, 0.4) });
    });

    it("interpolates position and size linearly by default", () => {
      const geometry = hotspotGeometryAt(moving, 3);
      expect(geometry?.kind).toBe("box");
      if (geometry?.kind !== "box") return;
      expect(geometry.area.x).toBeCloseTo(0.5);
      expect(geometry.area.y).toBeCloseTo(0.3);
    });

    it("applies the easing of the keyframe the transition starts from", () => {
      const eased: Hotspot = {
        ...base,
        keyframes: [
          { at: 0, area: box(0, 0), easing: "ease-in-out" },
          { at: 1, area: box(1, 0) },
        ],
      };
      const x = (t: number) => (hotspotGeometryAt(eased, t) as { area: { x: number } }).area.x;
      expect(x(0.25)).toBeCloseTo(0.125);
      expect(x(0.5)).toBeCloseTo(0.5);
      expect(x(0.75)).toBeCloseTo(0.875);
    });

    it("holds a step keyframe until the next one", () => {
      const stepped: Hotspot = {
        ...base,
        keyframes: [
          { at: 0, area: box(0, 0), easing: "step" },
          { at: 1, area: box(1, 1) },
        ],
      };
      expect(hotspotGeometryAt(stepped, 0.99)).toMatchObject({ area: box(0, 0) });
      expect(hotspotGeometryAt(stepped, 1)).toMatchObject({ area: box(1, 1) });
    });

    it("morphs a rect into an ellipse through roundness", () => {
      const morph: Hotspot = {
        ...base,
        area: box(0, 0),
        keyframes: [{ at: 0 }, { at: 2, shape: "ellipse" }],
      };
      expect(hotspotGeometryAt(morph, 1)).toMatchObject({ kind: "box", roundness: 0.5 });
    });

    it("morphs polygons with the same number of points", () => {
      const morph: Hotspot = {
        ...base,
        shape: "polygon",
        keyframes: [
          {
            at: 0,
            points: [
              [0, 0],
              [1, 0],
              [0, 1],
            ],
          },
          {
            at: 1,
            points: [
              [0, 0],
              [1, 0],
              [1, 1],
            ],
          },
        ],
      };
      expect(hotspotGeometryAt(morph, 0.5)).toEqual({
        kind: "polygon",
        points: [
          [0, 0],
          [1, 0],
          [0.5, 1],
        ],
      });
    });

    it("switches at once between shapes that can't morph", () => {
      const swap: Hotspot = {
        ...base,
        keyframes: [
          { at: 0, area: box(0, 0) },
          {
            at: 1,
            shape: "polygon",
            points: [
              [0, 0],
              [1, 0],
              [0, 1],
            ],
          },
        ],
      };
      expect(hotspotGeometryAt(swap, 0.9)?.kind).toBe("box");
      expect(hotspotGeometryAt(swap, 1)?.kind).toBe("polygon");
    });
  });
});

describe("boundsOf", () => {
  it("returns a box's area and a polygon's bounding box", () => {
    expect(boundsOf({ kind: "box", area: box(0.1, 0.2), roundness: 0 })).toEqual(box(0.1, 0.2));
    const bounds = boundsOf({
      kind: "polygon",
      points: [
        [0.2, 0.1],
        [0.6, 0.3],
        [0.4, 0.5],
      ],
    });
    expect(bounds.x).toBeCloseTo(0.2);
    expect(bounds.y).toBeCloseTo(0.1);
    expect(bounds.width).toBeCloseTo(0.4);
    expect(bounds.height).toBeCloseTo(0.4);
  });
});

describe("isAnimated", () => {
  it("is true only with two or more keyframes", () => {
    expect(isAnimated({ ...base, area: box(0, 0) })).toBe(false);
    expect(isAnimated({ ...base, keyframes: [{ at: 0, area: box(0, 0) }] })).toBe(false);
    expect(
      isAnimated({
        ...base,
        keyframes: [
          { at: 0, area: box(0, 0) },
          { at: 1, area: box(1, 1) },
        ],
      }),
    ).toBe(true);
  });
});
