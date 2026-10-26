import type { SceneId, Story } from "./types.js";

/** Story format versions this build of the engine can play. */
export const SUPPORTED_VERSIONS: readonly string[] = ["0.1"];

export interface ValidationIssue {
  /** Location of the problem, e.g. `scenes.intro.events[0].at`. Empty for the root. */
  path: string;
  message: string;
}

/**
 * Errors make the story unplayable. Warnings flag likely mistakes
 * (typos in property names, unreachable scenes) but don't block playback.
 */
export type ValidationResult =
  | { ok: true; story: Story; warnings: ValidationIssue[] }
  | { ok: false; errors: ValidationIssue[]; warnings: ValidationIssue[] };

const STORY_KEYS = ["version", "start", "scenes"];
const SCENE_KEYS = ["src", "events", "next"];
const QUESTION_KEYS = ["type", "id", "at", "text", "options"];
const CHOICE_KEYS = ["id", "label", "goto"];

/**
 * Checks that `input` is a playable story: correct shape, supported version,
 * unique ids and no references to missing scenes.
 *
 * Never throws. On success, `story` is `input` itself (not a copy), now typed.
 */
export function validateStory(input: unknown): ValidationResult {
  const validator = new Validator();
  validator.story(input);
  const { errors, warnings } = validator;
  return errors.length > 0
    ? { ok: false, errors, warnings }
    : { ok: true, story: input as Story, warnings };
}

type JsonObject = Record<string, unknown>;

class Validator {
  readonly errors: ValidationIssue[] = [];
  readonly warnings: ValidationIssue[] = [];

  /** `null` until `scenes` is known to be an object; reference checks are skipped before that. */
  private sceneIds: ReadonlySet<SceneId> | null = null;
  /** Question id → path where it was first declared. */
  private readonly questionIds = new Map<string, string>();
  /** Scene → scenes it can lead to, for the reachability check. */
  private readonly edges = new Map<SceneId, SceneId[]>();

  story(input: unknown): void {
    if (!isObject(input)) {
      this.error("", "story must be an object");
      return;
    }
    this.unknownKeys(input, STORY_KEYS, "");

    const version = input["version"];
    if (typeof version !== "string") {
      this.error("version", "must be a string");
    } else if (!SUPPORTED_VERSIONS.includes(version)) {
      this.error(
        "version",
        `unsupported version "${version}" (supported: ${SUPPORTED_VERSIONS.join(", ")})`,
      );
    }

    const scenes = input["scenes"];
    if (!isObject(scenes)) {
      this.error("scenes", "must be an object of scenes keyed by id");
    } else {
      this.sceneIds = new Set(Object.keys(scenes));
      if (this.sceneIds.size === 0) {
        this.error("scenes", "must contain at least one scene");
      }
      for (const [id, scene] of Object.entries(scenes)) {
        this.scene(scene, id, join("scenes", id));
      }
    }

    const start = input["start"];
    if (typeof start !== "string") {
      this.error("start", "must be a string");
    } else if (this.sceneRef(start, "start")) {
      this.unreachableScenes(start);
    }
  }

  private scene(value: unknown, sceneId: SceneId, path: string): void {
    if (!isObject(value)) {
      this.error(path, "scene must be an object");
      return;
    }
    this.unknownKeys(value, SCENE_KEYS, path);

    if (!isNonEmptyString(value["src"])) {
      this.error(`${path}.src`, "must be a non-empty string");
    }

    const next = value["next"];
    if (next !== undefined) {
      if (typeof next !== "string") {
        this.error(`${path}.next`, "must be a scene id");
      } else if (this.sceneRef(next, `${path}.next`)) {
        this.edge(sceneId, next);
      }
    }

    const events = value["events"];
    if (events !== undefined) {
      if (!Array.isArray(events)) {
        this.error(`${path}.events`, "must be an array");
      } else {
        events.forEach((event, i) => this.event(event, sceneId, `${path}.events[${i}]`));
      }
    }
  }

  private event(value: unknown, sceneId: SceneId, path: string): void {
    if (!isObject(value)) {
      this.error(path, "event must be an object");
      return;
    }
    const type = value["type"];
    switch (type) {
      case "question":
        this.question(value, sceneId, path);
        break;
      default:
        this.error(
          `${path}.type`,
          typeof type === "string" ? `unknown event type "${type}"` : "must be a string",
        );
    }
  }

  private question(value: JsonObject, sceneId: SceneId, path: string): void {
    this.unknownKeys(value, QUESTION_KEYS, path);

    const id = value["id"];
    if (!isNonEmptyString(id)) {
      this.error(`${path}.id`, "must be a non-empty string");
    } else {
      const firstPath = this.questionIds.get(id);
      if (firstPath !== undefined) {
        this.error(`${path}.id`, `duplicate question id "${id}" (first declared at ${firstPath})`);
      } else {
        this.questionIds.set(id, path);
      }
    }

    const at = value["at"];
    if (typeof at !== "number" || !Number.isFinite(at) || at < 0) {
      this.error(`${path}.at`, "must be a non-negative number of seconds");
    }

    if (!isNonEmptyString(value["text"])) {
      this.error(`${path}.text`, "must be a non-empty string");
    }

    const options = value["options"];
    if (!Array.isArray(options) || options.length === 0) {
      this.error(`${path}.options`, "must be a non-empty array");
      return;
    }
    const choiceIds = new Set<string>();
    options.forEach((option, i) => this.choice(option, sceneId, `${path}.options[${i}]`, choiceIds));
  }

  private choice(value: unknown, sceneId: SceneId, path: string, seenIds: Set<string>): void {
    if (!isObject(value)) {
      this.error(path, "option must be an object");
      return;
    }
    this.unknownKeys(value, CHOICE_KEYS, path);

    const id = value["id"];
    if (!isNonEmptyString(id)) {
      this.error(`${path}.id`, "must be a non-empty string");
    } else if (seenIds.has(id)) {
      this.error(`${path}.id`, `duplicate option id "${id}" in this question`);
    } else {
      seenIds.add(id);
    }

    if (!isNonEmptyString(value["label"])) {
      this.error(`${path}.label`, "must be a non-empty string");
    }

    const goto = value["goto"];
    if (goto !== undefined) {
      if (typeof goto !== "string") {
        this.error(`${path}.goto`, "must be a scene id");
      } else if (this.sceneRef(goto, `${path}.goto`)) {
        this.edge(sceneId, goto);
      }
    }
  }

  /** Reports a reference to a missing scene. Returns whether the reference is valid. */
  private sceneRef(id: SceneId, path: string): boolean {
    if (this.sceneIds === null) return false;
    if (this.sceneIds.has(id)) return true;
    this.error(path, `unknown scene "${id}"`);
    return false;
  }

  private edge(from: SceneId, to: SceneId): void {
    const targets = this.edges.get(from);
    if (targets) targets.push(to);
    else this.edges.set(from, [to]);
  }

  private unreachableScenes(start: SceneId): void {
    if (this.sceneIds === null) return;
    const visited = new Set<SceneId>([start]);
    const queue = [start];
    for (let current = queue.shift(); current !== undefined; current = queue.shift()) {
      for (const target of this.edges.get(current) ?? []) {
        if (!visited.has(target)) {
          visited.add(target);
          queue.push(target);
        }
      }
    }
    for (const id of this.sceneIds) {
      if (!visited.has(id)) {
        this.warning(join("scenes", id), "scene is unreachable from start");
      }
    }
  }

  private unknownKeys(value: JsonObject, known: readonly string[], path: string): void {
    for (const key of Object.keys(value)) {
      if (!known.includes(key)) {
        this.warning(join(path, key), `unknown property "${key}"`);
      }
    }
  }

  private error(path: string, message: string): void {
    this.errors.push({ path, message });
  }

  private warning(path: string, message: string): void {
    this.warnings.push({ path, message });
  }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Appends `key` to a path, using bracket notation for keys that aren't identifiers. */
function join(base: string, key: string): string {
  if (/^[A-Za-z_$][\w$]*$/.test(key)) return base === "" ? key : `${base}.${key}`;
  return `${base}[${JSON.stringify(key)}]`;
}
