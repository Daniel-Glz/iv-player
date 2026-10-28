import { describe, expectTypeOf, it } from "vitest";
import type { Choice, Cue, Hotspot, Question, Scene, SceneEvent, Story } from "../src/index";
import { basicStory } from "./fixtures/basic-story";

describe("story format types", () => {
  it("accepts the basic branching story", () => {
    expectTypeOf(basicStory).toExtend<Story>();
  });

  it("narrows scene events by type", () => {
    const event = {} as SceneEvent;
    if (event.type === "question") {
      expectTypeOf(event).toEqualTypeOf<Question>();
    } else if (event.type === "hotspot") {
      expectTypeOf(event).toEqualTypeOf<Hotspot>();
    } else {
      expectTypeOf(event).toEqualTypeOf<Cue>();
    }
  });

  it("allows scenes and choices without branching", () => {
    expectTypeOf({ src: "end.mp4" }).toExtend<Scene>();
    expectTypeOf({ id: "a", label: "Continue" }).toExtend<Choice>();
  });

  it("takes free-form data", () => {
    expectTypeOf({ src: "a.mp4", data: { tags: ["intro"], level: 1 } }).toExtend<Scene>();
    expectTypeOf({
      type: "cue",
      id: "c",
      kind: "chapter",
      from: 0,
      data: { title: "Intro" },
    } as const).toExtend<Cue>();
  });

  it("rejects malformed definitions", () => {
    // @ts-expect-error scene without src
    const scene: Scene = { next: "final" };
    // @ts-expect-error question without options
    const question: Question = { type: "question", id: "q", at: 1, text: "?" };
    void scene;
    void question;
  });
});
