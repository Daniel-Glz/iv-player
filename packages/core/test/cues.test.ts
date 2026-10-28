import { describe, expect, it } from "vitest";
import { StoryEngine, type Story } from "../src/index";

/**
 * talk: chapters "intro" (0–4s) and "body" (4s–end), a "tip" (2–6s) once `level`
 * is at least 1, and a question at 5s.
 */
const talk: Story = {
  version: "0.1",
  start: "talk",
  vars: { level: 0 },
  scenes: {
    talk: {
      src: "talk.mp4",
      next: "outro",
      events: [
        { type: "cue", id: "intro", kind: "chapter", from: 0, to: 4, data: { title: "Intro" } },
        { type: "cue", id: "body", kind: "chapter", from: 4 },
        { type: "cue", id: "tip", kind: "note", from: 2, to: 6, if: { var: "level", gte: 1 } },
        {
          type: "question",
          id: "q",
          at: 5,
          text: "¿Seguimos?",
          options: [{ id: "yes", label: "Sí" }],
        },
      ],
    },
    outro: { src: "outro.mp4" },
  },
};

/** Records `cues` emissions as lists of ids, plus scene, interaction and end markers. */
function record(engine: StoryEngine) {
  const log: (string | string[])[] = [];
  engine.on("cues", (e) => log.push(e.cues.map((c) => c.id)));
  engine.on("interaction", (e) => log.push(`interaction:${e.question.id}`));
  engine.on("scene", (e) => log.push(`scene:${e.sceneId}`));
  engine.on("end", () => log.push("end"));
  return log;
}

describe("StoryEngine cues", () => {
  it("emits the active cues whenever they change", () => {
    const engine = new StoryEngine(talk);
    const log = record(engine);
    engine.start();
    engine.update(0);
    engine.update(1);
    engine.update(4);
    expect(log).toEqual(["scene:talk", ["intro"], ["body"]]);
    expect(engine.activeCues.map((c) => c.id)).toEqual(["body"]);
  });

  it("follows seeking in either direction and checks conditions on every update", () => {
    const engine = new StoryEngine(talk);
    const log = record(engine);
    engine.start();
    engine.update(4.5);
    engine.update(3);
    engine.setVar("level", 1);
    engine.update(3);
    expect(log).toEqual(["scene:talk", ["body"], ["intro"], ["intro", "tip"]]);
  });

  it("keeps cues active during a question, which can start with one", () => {
    const engine = new StoryEngine(talk);
    const log = record(engine);
    engine.start();
    engine.update(5);
    expect(log).toEqual(["scene:talk", ["body"], "interaction:q"]);
    expect(engine.activeCues.map((c) => c.id)).toEqual(["body"]);
  });

  it("clears them when leaving the scene and when the story ends", () => {
    const engine = new StoryEngine(talk);
    const log = record(engine);
    engine.start();
    engine.update(1);
    engine.goTo("outro");
    engine.mediaEnded();
    expect(log).toEqual(["scene:talk", ["intro"], [], "scene:outro", "end"]);

    engine.start();
    engine.update(4);
    engine.goTo("outro");
    engine.mediaEnded();
    expect(log.slice(5)).toEqual(["scene:talk", ["body"], [], "scene:outro", "end"]);
  });
});
