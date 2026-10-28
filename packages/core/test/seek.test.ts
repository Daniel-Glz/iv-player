import { describe, expect, it } from "vitest";
import { StoryEngine, type EngineEvents, type Story } from "../src/index";

const area = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };

/**
 * A quiz that replays the explanation (2–8s) on a wrong answer, with a hotspot
 * that skips the explanation and another that pauses at 3s.
 */
const story: Story = {
  version: "0.1",
  start: "lesson",
  scenes: {
    lesson: {
      src: "lesson.mp4",
      next: "outro",
      events: [
        { type: "hotspot", id: "hint", from: 3, to: 4, area, label: "Pista", pause: true },
        { type: "hotspot", id: "skip", from: 0, to: 2, area, label: "Saltar", seek: 7.5 },
        {
          type: "question",
          id: "early",
          at: 5,
          text: "¿Lista?",
          options: [{ id: "ok", label: "Sí" }],
        },
        {
          type: "question",
          id: "quiz",
          at: 8,
          text: "¿2 + 2?",
          options: [
            { id: "right", label: "4", correct: true },
            { id: "wrong", label: "5", seek: 2 },
            { id: "next", label: "Siguiente", seek: 2, goto: "outro" },
          ],
        },
      ],
    },
    outro: { src: "outro.mp4" },
  },
};

function record(engine: StoryEngine) {
  const log: [keyof EngineEvents, unknown][] = [];
  engine.on("scene", (e) => log.push(["scene", e.sceneId]));
  engine.on("interaction", (e) => log.push(["interaction", e.question.id]));
  engine.on("resume", (e) => log.push(["resume", e.time]));
  engine.on("pause", (e) => log.push(["pause", e.hotspot.id]));
  return log;
}

describe("seek", () => {
  it("replays from seek and asks the questions after it again", () => {
    const engine = new StoryEngine(story);
    const log = record(engine);
    engine.start();
    engine.update(3);
    engine.update(5);
    engine.answer("ok");
    engine.update(8);
    engine.answer("wrong");
    engine.update(3);
    engine.update(5);

    expect(log).toEqual([
      ["scene", "lesson"],
      ["pause", "hint"],
      ["interaction", "early"],
      ["resume", 5],
      ["interaction", "quiz"],
      ["resume", 2],
      ["pause", "hint"],
      ["interaction", "early"],
    ]);
  });

  it("skips the questions before the seek, and goto wins over seek", () => {
    const engine = new StoryEngine(story);
    const log = record(engine);
    engine.start();
    engine.update(1);
    engine.activate("skip");
    engine.update(8);
    engine.answer("next");

    expect(log).toEqual([
      ["scene", "lesson"],
      ["resume", 7.5],
      ["interaction", "quiz"],
      ["scene", "outro"],
    ]);
  });

  it("keeps playing after a seek from a question asked as the video ended", () => {
    const engine = new StoryEngine(story);
    engine.start();
    engine.update(6);
    engine.answer("ok");
    engine.mediaEnded();
    expect(engine.activeQuestion?.id).toBe("quiz");

    engine.answer("wrong");
    expect(engine.state).toBe("playing");
    expect(engine.currentSceneId).toBe("lesson");
    engine.mediaEnded();
    expect(engine.activeQuestion?.id).toBe("early");
  });

  it("reports correct on the chosen option", () => {
    const engine = new StoryEngine(story);
    const correct: (boolean | undefined)[] = [];
    engine.on("answer", (e) => correct.push(e.choice.correct));
    engine.start();
    engine.update(8);
    engine.answer("ok");
    engine.update(8);
    engine.answer("right");
    expect(correct).toEqual([undefined, true]);
  });
});
