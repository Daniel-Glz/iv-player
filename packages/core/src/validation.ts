import { EASINGS, HOTSPOT_SHAPES, type Story } from "./types.js";

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

/** State shared while walking a story. */
interface Context {
  errors: StoryValidationError[];
  /** The story's scenes, or `null` if they aren't an object, so references can't be checked. */
  scenes: RecordValue | null;
  /** IDs of the questions and hotspots seen so far: they're unique across the story. */
  eventIds: Set<string>;
}

/**
 * Checks parsed story data without mutating it or loading media. Unknown fields
 * and non-empty format versions are allowed. Playback remains opt-in: validate
 * before constructing an engine or assigning the player's story property.
 */
export function validateStory(input: unknown): StoryValidationResult {
  const ctx: Context = { errors: [], scenes: null, eventIds: new Set() };
  if (isObject(ctx, input, "")) checkStory(ctx, input);
  return ctx.errors.length === 0
    ? { valid: true, story: input as Story, errors: [] }
    : { valid: false, errors: ctx.errors };
}

function checkStory(ctx: Context, story: RecordValue): void {
  isString(ctx, story["version"], "/version");
  const scenes = story["scenes"];
  if (isObject(ctx, scenes, "/scenes")) ctx.scenes = scenes;
  checkReference(ctx, story["start"], "/start");
  if (!ctx.scenes) return;

  const entries = Object.entries(ctx.scenes);
  if (entries.length === 0)
    addError(ctx, "/scenes", "invalid_value", "Expected at least one scene.");
  for (const [id, scene] of entries) {
    const path = pointer("/scenes", id);
    isString(ctx, id, path);
    if (isObject(ctx, scene, path)) checkScene(ctx, scene, path);
  }
}

function checkScene(ctx: Context, scene: RecordValue, path: string): void {
  isString(ctx, scene["src"], pointer(path, "src"));
  if (scene["next"] !== undefined) checkReference(ctx, scene["next"], pointer(path, "next"));
  const events = scene["events"];
  const eventsPath = pointer(path, "events");
  if (events === undefined || !isArray(ctx, events, eventsPath)) return;
  events.forEach((event, i) => {
    const eventPath = pointer(eventsPath, i);
    if (isObject(ctx, event, eventPath)) checkEvent(ctx, event, eventPath);
  });
}

function checkEvent(ctx: Context, event: RecordValue, path: string): void {
  checkUnique(ctx, event["id"], pointer(path, "id"), ctx.eventIds);
  if (event["type"] === "question") checkQuestion(ctx, event, path);
  else if (event["type"] === "hotspot") checkHotspot(ctx, event, path);
  else addError(ctx, pointer(path, "type"), "invalid_value", "Expected question or hotspot.");
}

function checkQuestion(ctx: Context, question: RecordValue, path: string): void {
  isTime(ctx, question["at"], pointer(path, "at"));
  isString(ctx, question["text"], pointer(path, "text"));
  const options = question["options"];
  const optionsPath = pointer(path, "options");
  if (!isArray(ctx, options, optionsPath)) return;
  if (options.length === 0) {
    addError(ctx, optionsPath, "invalid_value", "A question needs at least one option.");
  }
  // Choice IDs only need to be unique within their question.
  const choiceIds = new Set<string>();
  options.forEach((choice, i) => {
    const choicePath = pointer(optionsPath, i);
    if (!isObject(ctx, choice, choicePath)) return;
    checkUnique(ctx, choice["id"], pointer(choicePath, "id"), choiceIds);
    isString(ctx, choice["label"], pointer(choicePath, "label"));
    if (choice["goto"] !== undefined)
      checkReference(ctx, choice["goto"], pointer(choicePath, "goto"));
  });
}

function checkHotspot(ctx: Context, hotspot: RecordValue, path: string): void {
  const from = hotspot["from"];
  const to = hotspot["to"];
  isTime(ctx, from, pointer(path, "from"));
  if (
    to !== undefined &&
    isTime(ctx, to, pointer(path, "to")) &&
    isFiniteNumber(from) &&
    to <= from
  ) {
    addError(ctx, pointer(path, "to"), "invalid_value", "Hotspot end must be after its start.");
  }
  isString(ctx, hotspot["label"], pointer(path, "label"));
  if (hotspot["goto"] !== undefined) checkReference(ctx, hotspot["goto"], pointer(path, "goto"));
  if (hotspot["pause"] !== undefined) isBoolean(ctx, hotspot["pause"], pointer(path, "pause"));
  if (hotspot["variant"] !== undefined) isString(ctx, hotspot["variant"], pointer(path, "variant"));
  checkGeometryFields(ctx, hotspot, path);

  const keyframes = hotspot["keyframes"];
  const keyframesPath = pointer(path, "keyframes");
  if (keyframes === undefined || (Array.isArray(keyframes) && keyframes.length === 0)) {
    checkResolvedGeometry(ctx, hotspot, hotspot, path);
  } else if (isArray(ctx, keyframes, keyframesPath)) {
    const times = new Set<number>();
    keyframes.forEach((keyframe, i) => {
      const keyframePath = pointer(keyframesPath, i);
      if (isObject(ctx, keyframe, keyframePath)) {
        checkKeyframe(ctx, hotspot, keyframe, keyframePath, times);
      }
    });
  }
}

function checkKeyframe(
  ctx: Context,
  hotspot: RecordValue,
  keyframe: RecordValue,
  path: string,
  times: Set<number>,
): void {
  const at = keyframe["at"];
  if (isTime(ctx, at, pointer(path, "at"))) {
    if (times.has(at)) {
      addError(ctx, pointer(path, "at"), "invalid_value", "Keyframe times must be unique.");
    }
    times.add(at);
  }
  if (keyframe["easing"] !== undefined) {
    isOneOf(ctx, keyframe["easing"], pointer(path, "easing"), EASINGS);
  }
  checkGeometryFields(ctx, keyframe, path);
  checkResolvedGeometry(ctx, hotspot, keyframe, path);
}

/** Checks the `shape`, `area` and `points` that `value` (a hotspot or a keyframe) defines. */
function checkGeometryFields(ctx: Context, value: RecordValue, path: string): void {
  if (value["shape"] !== undefined) {
    isOneOf(ctx, value["shape"], pointer(path, "shape"), HOTSPOT_SHAPES);
  }
  const area = value["area"];
  const areaPath = pointer(path, "area");
  if (area !== undefined && isObject(ctx, area, areaPath)) checkArea(ctx, area, areaPath);
  const points = value["points"];
  const pointsPath = pointer(path, "points");
  if (points !== undefined && isArray(ctx, points, pointsPath))
    checkPoints(ctx, points, pointsPath);
}

function checkArea(ctx: Context, area: RecordValue, path: string): void {
  for (const key of ["x", "y", "width", "height"]) {
    const n = area[key];
    const isSize = key === "width" || key === "height";
    if (!isFraction(n) || (isSize && n === 0)) {
      addError(
        ctx,
        pointer(path, key),
        "invalid_value",
        "Expected a fraction from 0 to 1; dimensions must be positive.",
      );
    }
  }
  const spans = [
    ["x", "width"],
    ["y", "height"],
  ] as const;
  for (const [position, size] of spans) {
    const start = area[position];
    const length = area[size];
    if (isFiniteNumber(start) && isFiniteNumber(length) && start + length > 1 + Number.EPSILON) {
      addError(ctx, path, "invalid_value", `${position} + ${size} must not exceed 1.`);
    }
  }
}

function checkPoints(ctx: Context, points: unknown[], path: string): void {
  if (points.length < 3) {
    addError(ctx, path, "invalid_value", "A polygon needs at least three points.");
  }
  points.forEach((point, i) => {
    if (!Array.isArray(point) || point.length !== 2 || !point.every(isFraction)) {
      addError(
        ctx,
        pointer(path, i),
        "invalid_value",
        "Expected [x, y] with finite coordinates from 0 to 1.",
      );
    }
  });
}

/**
 * Checks that the shape `keyframe` resolves to has its geometry, taking what it
 * leaves out from `hotspot`. A hotspot without keyframes is passed as both.
 */
function checkResolvedGeometry(
  ctx: Context,
  hotspot: RecordValue,
  keyframe: RecordValue,
  path: string,
): void {
  const shape = keyframe["shape"] ?? hotspot["shape"] ?? "rect";
  const key = shape === "polygon" ? "points" : "area";
  if ((keyframe[key] ?? hotspot[key]) === undefined) {
    addError(
      ctx,
      pointer(path, key),
      "missing_geometry",
      `The resolved ${String(shape)} shape requires ${key}.`,
    );
  }
}

/** Checks that `value` names a scene of the story. */
function checkReference(ctx: Context, value: unknown, path: string): void {
  if (isString(ctx, value, path) && ctx.scenes && !Object.hasOwn(ctx.scenes, value)) {
    addError(ctx, path, "missing_scene", `Scene "${value}" does not exist.`);
  }
}

/** Checks that `value` is an ID not in `seen` yet, and adds it. */
function checkUnique(ctx: Context, value: unknown, path: string, seen: Set<string>): void {
  if (!isString(ctx, value, path)) return;
  if (seen.has(value)) addError(ctx, path, "duplicate_id", `Duplicate ID "${value}".`);
  seen.add(value);
}

// Each `is*` check below reports an error when it fails, so callers only branch on the result.

function isObject(ctx: Context, value: unknown, path: string): value is RecordValue {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return true;
  addError(ctx, path, "invalid_type", "Expected an object.");
  return false;
}

function isArray(ctx: Context, value: unknown, path: string): value is unknown[] {
  if (Array.isArray(value)) return true;
  addError(ctx, path, "invalid_type", "Expected an array.");
  return false;
}

function isString(ctx: Context, value: unknown, path: string): value is string {
  if (typeof value === "string" && value.trim().length > 0) return true;
  addError(ctx, path, "invalid_value", "Expected a non-empty string.");
  return false;
}

function isBoolean(ctx: Context, value: unknown, path: string): value is boolean {
  if (typeof value === "boolean") return true;
  addError(ctx, path, "invalid_type", "Expected a boolean.");
  return false;
}

function isTime(ctx: Context, value: unknown, path: string): value is number {
  if (isFiniteNumber(value) && value >= 0) return true;
  addError(ctx, path, "invalid_value", "Expected a finite, non-negative time in seconds.");
  return false;
}

function isOneOf<T extends string>(
  ctx: Context,
  value: unknown,
  path: string,
  allowed: readonly T[],
): value is T {
  if (allowed.includes(value as T)) return true;
  // "Expected a, b, or c."
  const list = `${allowed.slice(0, -1).join(", ")}, or ${allowed.at(-1)}`;
  addError(ctx, path, "invalid_value", `Expected ${list}.`);
  return false;
}

function addError(
  ctx: Context,
  path: string,
  code: StoryValidationError["code"],
  message: string,
): void {
  ctx.errors.push({ path, code, message });
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFraction(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

/** `path` extended with `key`, escaped as JSON Pointer requires. */
function pointer(path: string, key: string | number): string {
  return `${path}/${String(key).replace(/~/g, "~0").replace(/\//g, "~1")}`;
}
