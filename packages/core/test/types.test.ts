import { describe, expectTypeOf, it } from "vitest";
import type { Choice, Hotspot, Question, Scene, SceneEvent, Story } from "../src/index";
import { basicStory } from "./fixtures/basic-story";

describe("story format types", () => {
  it("accepts the basic branching story", () => {
    expectTypeOf(basicStory).toExtend<Story>();
  });

  it("narrows scene events by type", () => {
    const event = {} as SceneEvent;
    if (event.type === "question") {
      expectTypeOf(event).toEqualTypeOf<Question>();
    } else {
      expectTypeOf(event).toEqualTypeOf<Hotspot>();
    }
  });

  it("allows scenes and choices without branching", () => {
    expectTypeOf({ src: "end.mp4" }).toExtend<Scene>();
    expectTypeOf({ id: "a", label: "Seguir" }).toExtend<Choice>();
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
