import { describe, expect, expectTypeOf, it } from "vitest";
import { validateStory, type Story } from "../src/index";
import { basicStory } from "./fixtures/basic-story";

const area = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
const hotspot = { type: "hotspot", id: "h", from: 0, label: "Explore", area };
const question = {
  type: "question",
  id: "q",
  at: 0,
  text: "Continue?",
  options: [{ id: "yes", label: "Yes" }],
};
const storyWith = (...events: unknown[]) => ({
  version: "0.1",
  start: "intro",
  scenes: { intro: { src: "intro.mp4", events } },
});
const errorsOf = (input: unknown) => {
  const result = validateStory(input);
  expect(result.valid).toBe(false);
  return result.errors;
};

describe("validateStory", () => {
  it("returns the original typed story without modifying frozen input", () => {
    const input = Object.freeze(JSON.parse(JSON.stringify(basicStory)) as Story);
    const before = JSON.stringify(input);
    const result = validateStory(input);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expectTypeOf(result.story).toEqualTypeOf<Story>();
      expect(result.story).toBe(input);
      expect(result.errors).toEqual([]);
    }
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each([null, undefined, [], "story", 12, true])("rejects malformed root %j", (input) => {
    expect(errorsOf(input)).toContainEqual(
      expect.objectContaining({ path: "", code: "invalid_type" }),
    );
  });

  it("collects independent errors and escapes JSON Pointer scene names", () => {
    const errors = errorsOf({
      version: "",
      start: "missing",
      scenes: { "a/b~c": { src: "", next: "absent", events: [null] } },
    });
    expect(errors.map((e) => e.path)).toEqual([
      "/version",
      "/start",
      "/scenes/a~1b~0c/src",
      "/scenes/a~1b~0c/next",
      "/scenes/a~1b~0c/events/0",
    ]);
  });

  it("checks all scene reference kinds, including inherited property names", () => {
    const input = storyWith(
      { ...question, options: [{ id: "a", label: "A", goto: "constructor" }] },
      { ...hotspot, goto: "toString" },
    );
    expect(errorsOf(input).filter((e) => e.code === "missing_scene")).toHaveLength(2);
    expect(errorsOf({ version: "0.1", start: "toString", scenes: {} })).toContainEqual(
      expect.objectContaining({ path: "/start", code: "missing_scene" }),
    );
  });

  it("accepts loops, unknown metadata, and non-empty future versions", () => {
    expect(
      validateStory({
        version: "future",
        start: "a",
        metadata: {},
        scenes: { a: { src: "a.mp4", next: "a" } },
      }).valid,
    ).toBe(true);
  });

  it("requires event IDs to be unique across scenes and event types", () => {
    expect(errorsOf(storyWith(question, { ...hotspot, id: "q" }))).toContainEqual(
      expect.objectContaining({ code: "duplicate_id" }),
    );
    expect(
      errorsOf({
        version: "0.1",
        start: "a",
        scenes: { a: { src: "a", events: [question] }, b: { src: "b", events: [question] } },
      }),
    ).toContainEqual(expect.objectContaining({ code: "duplicate_id" }));
  });

  it("scopes option IDs to a question", () => {
    expect(validateStory(storyWith(question, { ...question, id: "q2" })).valid).toBe(true);
    expect(
      errorsOf(storyWith({ ...question, options: [question.options[0], question.options[0]] })),
    ).toContainEqual(expect.objectContaining({ code: "duplicate_id" }));
  });

  it.each([NaN, Infinity, -1, "2", null])("rejects invalid time %j", (at) => {
    expect(errorsOf(storyWith({ ...question, at }))).toContainEqual(
      expect.objectContaining({ path: "/scenes/intro/events/0/at" }),
    );
  });

  it.each([
    { ...question, options: [] },
    { ...question, options: null },
    { ...question, options: [null] },
    { ...question, text: " " },
    { ...hotspot, from: -1 },
    { ...hotspot, to: 0 },
    { ...hotspot, label: "" },
    { ...hotspot, shape: "triangle" },
    { ...hotspot, shape: ["rect"] },
    { ...hotspot, area: null },
    { ...hotspot, area: { ...area, width: 0 } },
    { ...hotspot, area: { ...area, x: 0.9 } },
    { ...hotspot, area: { ...area, y: NaN } },
    {
      ...hotspot,
      shape: "polygon",
      points: [
        [0, 0],
        [1, 1],
      ],
    },
    {
      ...hotspot,
      shape: "polygon",
      points: [
        [0, 0],
        [1, 0],
        [0, Infinity],
      ],
    },
    { ...hotspot, pause: "yes" },
    { ...hotspot, keyframes: null },
    { ...hotspot, keyframes: [null] },
    { ...hotspot, keyframes: [{ at: 0, easing: "bounce" }] },
    { ...hotspot, keyframes: [{ at: 0 }, { at: 0 }] },
    { type: "unknown", id: "x" },
  ])("rejects malformed interaction %#", (event) => {
    errorsOf(storyWith(event));
  });

  it("accepts static shapes, custom variants, and empty keyframes with static geometry", () => {
    for (const event of [
      hotspot,
      { ...hotspot, shape: "ellipse", variant: "custom" },
      { ...hotspot, pause: true },
      { ...hotspot, keyframes: [] },
      {
        ...hotspot,
        shape: "polygon",
        points: [
          [0, 0],
          [1, 0],
          [0, 1],
        ],
      },
    ]) {
      expect(validateStory(storyWith(event)).valid).toBe(true);
    }
  });

  it("resolves unsorted keyframes against the hotspot, not the preceding frame", () => {
    expect(
      validateStory(
        storyWith({
          ...hotspot,
          keyframes: [{ at: 8 }, { at: 1, shape: "ellipse", easing: "step" }],
        }),
      ).valid,
    ).toBe(true);
    const { area: _area, ...withoutArea } = hotspot;
    expect(
      validateStory(
        storyWith({
          ...withoutArea,
          keyframes: [
            { at: 0, area },
            { at: 1, area },
          ],
        }),
      ).valid,
    ).toBe(true);
    expect(
      errorsOf(storyWith({ ...withoutArea, keyframes: [{ at: 0, area }, { at: 1 }] })),
    ).toContainEqual(
      expect.objectContaining({
        path: "/scenes/intro/events/0/keyframes/1/area",
        code: "missing_geometry",
      }),
    );
    expect(errorsOf(storyWith(withoutArea))).toContainEqual(
      expect.objectContaining({ code: "missing_geometry" }),
    );
  });

  it.each([
    { version: "0.1", start: "a", scenes: null },
    { version: "0.1", start: "a", scenes: { a: null } },
    { version: "0.1", start: "a", scenes: { a: { src: "a", events: {} } } },
  ])("handles malformed scene containers %#", (input) => {
    errorsOf(input);
  });
});

describe("validateStory variables", () => {
  const withLogic = (logic: Record<string, unknown>, vars: unknown = { score: 0, name: "" }) => ({
    version: "0.1",
    start: "intro",
    vars,
    scenes: { intro: { src: "intro.mp4", ...logic }, end: { src: "end.mp4" } },
  });

  it("accepts vars, set, if and branches everywhere they're allowed", () => {
    const result = validateStory({
      version: "0.1",
      start: "intro",
      vars: { score: 0, key: false, name: "Ana" },
      scenes: {
        intro: {
          src: "intro.mp4",
          set: { score: 0 },
          branches: [{ if: [{ var: "score", gte: 1, lt: 3 }], goto: "end" }],
          events: [
            {
              ...question,
              options: [
                {
                  id: "a",
                  label: "A",
                  if: { var: "key", ne: true },
                  set: { score: { add: -1 }, name: "Bea" },
                  branches: [{ if: { var: "name", eq: "Bea" }, goto: "end" }],
                },
              ],
            },
            { ...hotspot, if: { var: "score", gt: 0 }, set: { key: true } },
          ],
        },
        end: { src: "end.mp4" },
      },
    });
    expect(result.errors).toEqual([]);
  });

  it.each([null, [], { n: null }, { n: Number.NaN }, { n: {} }])(
    "rejects malformed vars %j",
    (vars) => {
      expect(errorsOf(withLogic({}, vars)).map((e) => e.path)[0]).toMatch(/^\/vars/);
    },
  );

  it("reports undeclared variables in conditions and changes", () => {
    const errors = errorsOf(
      withLogic({
        set: { typo: 1 },
        branches: [{ if: { var: "scroe", gte: 1 }, goto: "end" }],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        path: "/scenes/intro/branches/0/if/var",
        code: "missing_variable",
      }),
      expect.objectContaining({ path: "/scenes/intro/set/typo", code: "missing_variable" }),
    ]);
  });

  it("checks branches, operators and operands", () => {
    const errors = errorsOf(
      withLogic({
        branches: [
          { if: { var: "score" }, goto: "end" },
          { if: [], goto: "nowhere" },
          { if: { var: "score", gt: "1", eq: [] } },
          "end",
        ],
      }),
    );
    expect(errors.map((e) => [e.path, e.code])).toEqual([
      ["/scenes/intro/branches/0/if", "invalid_value"],
      ["/scenes/intro/branches/1/if", "invalid_value"],
      ["/scenes/intro/branches/1/goto", "missing_scene"],
      ["/scenes/intro/branches/2/if/eq", "invalid_type"],
      ["/scenes/intro/branches/2/if/gt", "invalid_type"],
      ["/scenes/intro/branches/2/goto", "invalid_value"],
      ["/scenes/intro/branches/3", "invalid_type"],
    ]);
  });

  it("only adds to numeric variables, and only numbers", () => {
    const errors = errorsOf(
      withLogic({ set: { name: { add: 1 }, score: { add: "1" } }, if: { var: "score", eq: 1 } }),
    );
    expect(errors.map((e) => e.path)).toEqual([
      "/scenes/intro/set/name",
      "/scenes/intro/set/score/add",
    ]);
  });

  it("checks set and if on choices and hotspots", () => {
    const errors = errorsOf(
      storyWith(
        { ...question, options: [{ id: "a", label: "A", set: [] }] },
        { ...hotspot, if: { var: "x", eq: 1 } },
      ),
    );
    expect(errors.map((e) => [e.path, e.code])).toEqual([
      ["/scenes/intro/events/0/options/0/set", "invalid_type"],
      ["/scenes/intro/events/1/if/var", "missing_variable"],
    ]);
  });
});

describe("validateStory correct, seek and href", () => {
  it("accepts them", () => {
    const result = validateStory(
      storyWith(
        { ...question, options: [{ id: "a", label: "A", correct: true, seek: 0 }] },
        { ...hotspot, seek: 1.5, href: "https://example.com" },
      ),
    );
    expect(result.errors).toEqual([]);
  });

  it("checks their types", () => {
    const errors = errorsOf(
      storyWith(
        { ...question, options: [{ id: "a", label: "A", correct: "yes", seek: -1 }] },
        { ...hotspot, seek: "1", href: "" },
      ),
    );
    expect(errors.map((e) => [e.path, e.code])).toEqual([
      ["/scenes/intro/events/0/options/0/correct", "invalid_type"],
      ["/scenes/intro/events/0/options/0/seek", "invalid_value"],
      ["/scenes/intro/events/1/seek", "invalid_value"],
      ["/scenes/intro/events/1/href", "invalid_value"],
    ]);
  });
});

describe("validateStory multiple questions", () => {
  const options = [
    { id: "a", label: "A", correct: true },
    { id: "b", label: "B" },
    { id: "c", label: "C" },
  ];

  it("accepts multiple, min, max and the question's goto, branches and seek", () => {
    const result = validateStory({
      ...storyWith({
        ...question,
        options,
        multiple: true,
        min: 1,
        max: 3,
        branches: [{ if: { var: "n", gte: 1 }, goto: "intro" }],
        goto: "intro",
        seek: 0,
      }),
      vars: { n: 0 },
    });
    expect(result.errors).toEqual([]);
  });

  it("checks the counts against the options", () => {
    const errors = errorsOf(
      storyWith(
        { ...question, options, multiple: "yes", min: 2 },
        { ...question, id: "q2", options, multiple: true, min: 0, max: 4 },
        { ...question, id: "q3", options, multiple: true, min: 3, max: 2 },
        { ...question, id: "q4", options, multiple: true, min: 1.5 },
      ),
    );
    expect(errors.map((e) => [e.path, e.code])).toEqual([
      ["/scenes/intro/events/0/multiple", "invalid_type"],
      ["/scenes/intro/events/0/min", "invalid_value"],
      ["/scenes/intro/events/1/min", "invalid_value"],
      ["/scenes/intro/events/1/max", "invalid_value"],
      ["/scenes/intro/events/2/max", "invalid_value"],
      ["/scenes/intro/events/3/min", "invalid_value"],
    ]);
  });

  it("checks the question's goto, branches and seek", () => {
    const errors = errorsOf(storyWith({ ...question, goto: "nowhere", branches: {}, seek: -1 }));
    expect(errors.map((e) => [e.path, e.code])).toEqual([
      ["/scenes/intro/events/0/goto", "missing_scene"],
      ["/scenes/intro/events/0/seek", "invalid_value"],
      ["/scenes/intro/events/0/branches", "invalid_type"],
    ]);
  });

  it("doesn't let options of a multiple question branch or seek", () => {
    const errors = errorsOf(
      storyWith({
        ...question,
        multiple: true,
        options: [{ id: "a", label: "A", goto: "intro", branches: [], seek: 1 }],
      }),
    );
    expect(errors.map((e) => [e.path, e.code])).toEqual([
      ["/scenes/intro/events/0/options/0/goto", "invalid_value"],
      ["/scenes/intro/events/0/options/0/branches", "invalid_value"],
      ["/scenes/intro/events/0/options/0/seek", "invalid_value"],
    ]);
  });
});
