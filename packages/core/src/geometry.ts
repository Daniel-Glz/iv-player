import type { Area, Easing, Hotspot, HotspotKeyframe, Point } from "./types.js";

/**
 * Resolved shape of a hotspot at a given time, in fractions of the video frame.
 *
 * Rectangles and ellipses are both a `box`: `roundness` is 0 for a rectangle,
 * 1 for an ellipse, and in between while morphing from one to the other.
 */
export type HotspotGeometry =
  | { kind: "box"; area: Area; roundness: number }
  | { kind: "polygon"; points: readonly Point[] };

/**
 * Where and how `hotspot` is drawn at `time` (seconds of the scene).
 *
 * With `keyframes`, interpolates between the two around `time`: boxes morph
 * into boxes and polygons into polygons with the same number of points; any
 * other change of shape happens at once, when the next keyframe is reached.
 * Returns `null` if the hotspot defines no usable geometry.
 */
export function hotspotGeometryAt(hotspot: Hotspot, time: number): HotspotGeometry | null {
  const keyframes = sortedKeyframes(hotspot);
  if (keyframes.length === 0) return geometryOf(hotspot, hotspot);

  const first = keyframes[0]!;
  const last = keyframes[keyframes.length - 1]!;
  if (time <= first.at) return geometryOf(hotspot, first);
  if (time >= last.at) return geometryOf(hotspot, last);

  let index = 0;
  while (keyframes[index + 1]!.at <= time) index++;
  const from = keyframes[index]!;
  const to = keyframes[index + 1]!;
  const a = geometryOf(hotspot, from);
  const b = geometryOf(hotspot, to);
  if (!a || !b) return a ?? b;

  const progress = ease(from.easing, (time - from.at) / (to.at - from.at));
  if (a.kind === "box" && b.kind === "box") {
    return {
      kind: "box",
      area: {
        x: lerp(a.area.x, b.area.x, progress),
        y: lerp(a.area.y, b.area.y, progress),
        width: lerp(a.area.width, b.area.width, progress),
        height: lerp(a.area.height, b.area.height, progress),
      },
      roundness: lerp(a.roundness, b.roundness, progress),
    };
  }
  if (a.kind === "polygon" && b.kind === "polygon" && a.points.length === b.points.length) {
    return {
      kind: "polygon",
      points: a.points.map(([x, y], i) => {
        const [x2, y2] = b.points[i]!;
        return [lerp(x, x2, progress), lerp(y, y2, progress)] as const;
      }),
    };
  }
  return progress < 1 ? a : b;
}

/** Bounding box of a geometry. */
export function boundsOf(geometry: HotspotGeometry): Area {
  if (geometry.kind === "box") return geometry.area;
  const xs = geometry.points.map(([x]) => x);
  const ys = geometry.points.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** Whether `hotspot` changes over time and must be redrawn as the video plays. */
export function isAnimated(hotspot: Hotspot): boolean {
  return (hotspot.keyframes?.length ?? 0) > 1;
}

const sorted = new WeakMap<readonly HotspotKeyframe[], readonly HotspotKeyframe[]>();

/** Keyframes ordered by time, computed once per hotspot (this runs on every frame). */
function sortedKeyframes(hotspot: Hotspot): readonly HotspotKeyframe[] {
  const keyframes = hotspot.keyframes;
  if (!keyframes) return [];
  let result = sorted.get(keyframes);
  if (!result) {
    result = [...keyframes].sort((a, b) => a.at - b.at);
    sorted.set(keyframes, result);
  }
  return result;
}

/** Geometry described by `source` (a keyframe or the hotspot), falling back to the hotspot's fields. */
function geometryOf(
  hotspot: Hotspot,
  source: Pick<HotspotKeyframe, "shape" | "area" | "points">,
): HotspotGeometry | null {
  const shape = source.shape ?? hotspot.shape ?? "rect";
  if (shape === "polygon") {
    const points = source.points ?? hotspot.points;
    return points && points.length >= 3 ? { kind: "polygon", points } : null;
  }
  const area = source.area ?? hotspot.area;
  return area ? { kind: "box", area, roundness: shape === "ellipse" ? 1 : 0 } : null;
}

function ease(easing: Easing | undefined, progress: number): number {
  switch (easing) {
    case "step":
      return 0;
    case "ease-in-out":
      return progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
    default:
      return progress;
  }
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}
