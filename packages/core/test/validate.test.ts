import { describe, expect, it } from "vitest";
import { validateStory, type ValidationResult } from "../src/index";
import { basicStory } from "./fixtures/basic-story";

// Core has no DOM/Node types, so no structuredClone; JSON round-trip is enough here.
function clone(value: unknown): any {
  return JSON.parse(JSON.stringify(value));
}

/** Mutable deep copy of the basic story, for building invalid variants. */
function story() {
  return clone(basicStory);
}

function errorsOf(result: ValidationResult) {
  return result.ok ? [] : result.errors;
}

describe("validateStory", () => {
  it("accepts a valid story and returns it as-is", () => {
    const input = story();
    const result = validateStory(input);

    expect(result).toEqual({ ok: true, story: input, warnings: [] });
    expect(result.ok && result.story).toBe(input);
  });

  it.each([null, "story", 42, []])("rejects a non-object root (%j)", (input) => {
    expect(errorsOf(validateStory(input))).toEqual([
      { path: "", message: "story must be an object" },
    ]);
  });

  describe("root", () => {
    it("requires a supported version", () => {
      const missing = story();
      delete missing.version;
      expect(errorsOf(validateStory(missing))).toContainEqual({
        path: "version",
        message: "must be a string",
      });

      const future = { ...story(), version: "9.0" };
      expect(errorsOf(validateStory(future))).toContainEqual({
        path: "version",
        message: 'unsupported version "9.0" (supported: 0.1)',
      });
    });

    it("requires start to name an existing scene", () => {
      expect(errorsOf(validateStory({ ...story(), start: "nope" }))).toEqual([
        { path: "start", message: 'unknown scene "nope"' },
      ]);
      expect(errorsOf(validateStory({ ...story(), start: 1 }))).toContainEqual({
        path: "start",
        message: "must be a string",
      });
    });

    it("requires scenes to be a non-empty object", () => {
      expect(errorsOf(validateStory({ ...story(), scenes: [] }))).toEqual([
        { path: "scenes", message: "must be an object of scenes keyed by id" },
      ]);
      expect(errorsOf(validateStory({ ...story(), scenes: {} }))).toEqual([
        { path: "scenes", message: "must contain at least one scene" },
        { path: "start", message: 'unknown scene "intro"' },
      ]);
    });
  });

  describe("scenes", () => {
    it("requires src", () => {
      const input = story();
      input.scenes.rio.src = "";
      expect(errorsOf(validateStory(input))).toEqual([
        { path: "scenes.rio.src", message: "must be a non-empty string" },
      ]);
    });

    it("requires next to name an existing scene", () => {
      const input = story();
      input.scenes.rio.next = "finale";
      expect(errorsOf(validateStory(input))).toEqual([
        { path: "scenes.rio.next", message: 'unknown scene "finale"' },
      ]);
    });

    it("requires events to be an array of known event types", () => {
      const notArray = story();
      notArray.scenes.final.events = {};
      expect(errorsOf(validateStory(notArray))).toEqual([
        { path: "scenes.final.events", message: "must be an array" },
      ]);

      const unknownType = story();
      unknownType.scenes.final.events = [{ type: "poll" }];
      expect(errorsOf(validateStory(unknownType))).toEqual([
        { path: "scenes.final.events[0].type", message: 'unknown event type "poll"' },
      ]);
    });

    it("uses bracket notation for scene ids that aren't identifiers", () => {
      const input = story();
      input.scenes["el río"] = { src: "" };
      input.scenes.intro.next = "el río";
      expect(errorsOf(validateStory(input))).toEqual([
        { path: 'scenes["el río"].src', message: "must be a non-empty string" },
      ]);
    });
  });

  describe("questions", () => {
    const q = "scenes.intro.events[0]";

    it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, "10"])("rejects at = %j", (at) => {
      const input = story();
      input.scenes.intro.events[0].at = at;
      expect(errorsOf(validateStory(input))).toEqual([
        { path: `${q}.at`, message: "must be a non-negative number of seconds" },
      ]);
    });

    it("requires text and at least one option", () => {
      const input = story();
      input.scenes.intro.events[0].text = "";
      input.scenes.intro.events[0].options = [];
      expect(errorsOf(validateStory(input))).toEqual([
        { path: `${q}.text`, message: "must be a non-empty string" },
        { path: `${q}.options`, message: "must be a non-empty array" },
      ]);
    });

    it("requires question ids to be unique across the story", () => {
      const input = story();
      input.scenes.final.events = [clone(input.scenes.intro.events[0])];
      expect(errorsOf(validateStory(input))).toEqual([
        {
          path: "scenes.final.events[0].id",
          message: `duplicate question id "q1" (first declared at ${q})`,
        },
      ]);
    });

    it("requires option ids to be unique within a question", () => {
      const input = story();
      input.scenes.intro.events[0].options[1].id = "a";
      expect(errorsOf(validateStory(input))).toEqual([
        { path: `${q}.options[1].id`, message: 'duplicate option id "a" in this question' },
      ]);
    });

    it("validates option label and goto", () => {
      const input = story();
      input.scenes.intro.events[0].options[0].label = 3;
      input.scenes.intro.events[0].options[1].goto = "mar";
      expect(errorsOf(validateStory(input))).toEqual([
        { path: `${q}.options[0].label`, message: "must be a non-empty string" },
        { path: `${q}.options[1].goto`, message: 'unknown scene "mar"' },
      ]);
    });

    it("allows options without goto", () => {
      const input = story();
      delete input.scenes.intro.events[0].options[0].goto;
      input.scenes.intro.next = "bosque";
      expect(validateStory(input)).toMatchObject({ ok: true, warnings: [] });
    });
  });

  describe("warnings", () => {
    it("flags unknown properties without failing", () => {
      const input = story();
      input.scenes.intro.events[0].options[0].goTo = "rio";
      input.title = "Mi historia";
      const result = validateStory(input);

      expect(result.ok).toBe(true);
      expect(result.warnings).toEqual([
        { path: "title", message: 'unknown property "title"' },
        { path: "scenes.intro.events[0].options[0].goTo", message: 'unknown property "goTo"' },
      ]);
    });

    it("flags scenes unreachable from start", () => {
      const input = story();
      input.scenes.intro.events[0].options[1].goto = "bosque";
      const result = validateStory(input);

      expect(result.ok).toBe(true);
      expect(result.warnings).toEqual([
        { path: "scenes.rio", message: "scene is unreachable from start" },
      ]);
    });

    it("reports warnings alongside errors", () => {
      const input = story();
      input.scenes.rio.src = 1;
      input.extra = true;
      const result = validateStory(input);

      expect(result.ok).toBe(false);
      expect(result.warnings).toHaveLength(1);
    });
  });
});
