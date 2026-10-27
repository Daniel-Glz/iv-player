import type { Story } from "./types.js";

export interface StoryValidationError {
  /** JSON Pointer to the invalid field (an empty string means the root). */
  path: string;
  code: "invalid_type" | "invalid_value" | "duplicate_id" | "missing_scene" | "missing_geometry";
  message: string;
}

export type StoryValidationResult =
  | { valid: true; story: Story; errors: [] }
  | { valid: false; errors: StoryValidationError[] };

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const pointer = (path: string, key: string | number) =>
  `${path}/${String(key).replace(/~/g, "~0").replace(/\//g, "~1")}`;
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * Checks parsed story data without mutating it or loading media. Unknown fields
 * and non-empty format versions are allowed. Playback remains opt-in: validate
 * before constructing an engine or assigning the player's story property.
 */
export function validateStory(input: unknown): StoryValidationResult {
  const errors: StoryValidationError[] = [];
  const add = (path: string, code: StoryValidationError["code"], message: string) => {
    errors.push({ path, code, message });
  };
  const object = (value: unknown, path: string): value is RecordValue => {
    if (record(value)) return true;
    add(path, "invalid_type", "Expected an object.");
    return false;
  };
  const string = (value: unknown, path: string): value is string => {
    if (typeof value === "string" && value.trim().length > 0) return true;
    add(path, "invalid_value", "Expected a non-empty string.");
    return false;
  };
  const time = (value: unknown, path: string): value is number => {
    if (finite(value) && value >= 0) return true;
    add(path, "invalid_value", "Expected a finite, non-negative time in seconds.");
    return false;
  };
  const array = (value: unknown, path: string): value is unknown[] => {
    if (Array.isArray(value)) return true;
    add(path, "invalid_type", "Expected an array.");
    return false;
  };
  const unique = (value: unknown, path: string, seen: Set<string>) => {
    if (!string(value, path)) return;
    if (seen.has(value)) add(path, "duplicate_id", `Duplicate ID "${value}".`);
    seen.add(value);
  };
  const geometryFields = (value: RecordValue, path: string) => {
    if (
      value["shape"] !== undefined &&
      (typeof value["shape"] !== "string" ||
        !["rect", "ellipse", "polygon"].includes(value["shape"]))
    ) {
      add(pointer(path, "shape"), "invalid_value", "Expected rect, ellipse, or polygon.");
    }
    const area = value["area"];
    const areaPath = pointer(path, "area");
    if (area !== undefined && object(area, areaPath)) {
      for (const key of ["x", "y", "width", "height"]) {
        const n = area[key];
        if (!finite(n) || n < 0 || n > 1 || ((key === "width" || key === "height") && n === 0)) {
          add(
            pointer(areaPath, key),
            "invalid_value",
            "Expected a fraction from 0 to 1; dimensions must be positive.",
          );
        }
      }
      for (const [position, size] of [
        ["x", "width"],
        ["y", "height"],
      ] as const) {
        const a = area[position];
        const b = area[size];
        if (finite(a) && finite(b) && a + b > 1 + Number.EPSILON) {
          add(areaPath, "invalid_value", `${position} + ${size} must not exceed 1.`);
        }
      }
    }
    const points = value["points"];
    const pointsPath = pointer(path, "points");
    if (points !== undefined && array(points, pointsPath)) {
      if (points.length < 3)
        add(pointsPath, "invalid_value", "A polygon needs at least three points.");
      points.forEach((point, i) => {
        if (
          !Array.isArray(point) ||
          point.length !== 2 ||
          !point.every((n) => finite(n) && n >= 0 && n <= 1)
        ) {
          add(
            pointer(pointsPath, i),
            "invalid_value",
            "Expected [x, y] with finite coordinates from 0 to 1.",
          );
        }
      });
    }
  };
  const geometry = (base: RecordValue, frame: RecordValue, path: string) => {
    const shape = frame["shape"] ?? base["shape"] ?? "rect";
    const key = shape === "polygon" ? "points" : "area";
    if ((frame[key] ?? base[key]) === undefined) {
      add(
        pointer(path, key),
        "missing_geometry",
        `The resolved ${String(shape)} shape requires ${key}.`,
      );
    }
  };

  if (object(input, "")) {
    string(input["version"], "/version");
    const scenes = input["scenes"];
    const hasScenes = object(scenes, "/scenes");
    const reference = (value: unknown, path: string) => {
      if (string(value, path) && hasScenes && !Object.hasOwn(scenes, value)) {
        add(path, "missing_scene", `Scene "${value}" does not exist.`);
      }
    };
    reference(input["start"], "/start");
    const eventIds = new Set<string>();
    if (hasScenes) {
      if (Object.keys(scenes).length === 0)
        add("/scenes", "invalid_value", "Expected at least one scene.");
      for (const [id, scene] of Object.entries(scenes)) {
        const path = pointer("/scenes", id);
        string(id, path);
        if (!object(scene, path)) continue;
        string(scene["src"], pointer(path, "src"));
        if (scene["next"] !== undefined) reference(scene["next"], pointer(path, "next"));
        const events = scene["events"];
        const eventsPath = pointer(path, "events");
        if (events === undefined || !array(events, eventsPath)) continue;
        events.forEach((event, i) => {
          const p = pointer(eventsPath, i);
          if (!object(event, p)) return;
          unique(event["id"], pointer(p, "id"), eventIds);
          if (event["type"] === "question") {
            time(event["at"], pointer(p, "at"));
            string(event["text"], pointer(p, "text"));
            const options = event["options"];
            const op = pointer(p, "options");
            if (array(options, op)) {
              if (options.length === 0)
                add(op, "invalid_value", "A question needs at least one option.");
              const ids = new Set<string>();
              options.forEach((choice, j) => {
                const cp = pointer(op, j);
                if (!object(choice, cp)) return;
                unique(choice["id"], pointer(cp, "id"), ids);
                string(choice["label"], pointer(cp, "label"));
                if (choice["goto"] !== undefined) reference(choice["goto"], pointer(cp, "goto"));
              });
            }
          } else if (event["type"] === "hotspot") {
            time(event["from"], pointer(p, "from"));
            if (
              event["to"] !== undefined &&
              time(event["to"], pointer(p, "to")) &&
              finite(event["from"]) &&
              event["to"] <= event["from"]
            ) {
              add(pointer(p, "to"), "invalid_value", "Hotspot end must be after its start.");
            }
            string(event["label"], pointer(p, "label"));
            if (event["goto"] !== undefined) reference(event["goto"], pointer(p, "goto"));
            if (event["variant"] !== undefined) string(event["variant"], pointer(p, "variant"));
            geometryFields(event, p);
            const frames = event["keyframes"];
            if (frames === undefined || (Array.isArray(frames) && frames.length === 0)) {
              geometry(event, event, p);
            } else if (array(frames, pointer(p, "keyframes"))) {
              const times = new Set<number>();
              frames.forEach((frame, j) => {
                const fp = pointer(pointer(p, "keyframes"), j);
                if (!object(frame, fp)) return;
                if (time(frame["at"], pointer(fp, "at"))) {
                  if (times.has(frame["at"]))
                    add(pointer(fp, "at"), "invalid_value", "Keyframe times must be unique.");
                  times.add(frame["at"]);
                }
                if (
                  frame["easing"] !== undefined &&
                  (typeof frame["easing"] !== "string" ||
                    !["linear", "ease-in-out", "step"].includes(frame["easing"]))
                ) {
                  add(
                    pointer(fp, "easing"),
                    "invalid_value",
                    "Expected linear, ease-in-out, or step.",
                  );
                }
                geometryFields(frame, fp);
                geometry(event, frame, fp);
              });
            }
          } else {
            add(pointer(p, "type"), "invalid_value", "Expected question or hotspot.");
          }
        });
      }
    }
  }
  return errors.length === 0
    ? { valid: true, story: input as Story, errors: [] }
    : { valid: false, errors };
}
