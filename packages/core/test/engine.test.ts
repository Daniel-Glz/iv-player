import { describe, expect, it, vi } from "vitest";
import { StoryEngine, type EngineEvents, type Story } from "../src/index";
import { basicStory } from "./fixtures/basic-story";

/** One scene with two questions declared out of order, neither of which branches. */
const quiz: Story = {
  version: "0.1",
  start: "lesson",
  scenes: {
    lesson: {
      src: "lesson.mp4",
      next: "outro",
      events: [
        { type: "question", id: "late", at: 20, text: "¿Segunda?", options: [{ id: "ok", label: "Sí" }] },
        { type: "question", id: "early", at: 5, text: "¿Primera?", options: [{ id: "ok", label: "Sí" }] },
      ],
    },
    outro: { src: "outro.mp4" },
  },
};

/** Records every event as a compact `[type, detail]` tuple, in emission order. */
function record(engine: StoryEngine) {
  const log: [keyof EngineEvents, string | number][] = [];
  engine.on("scene", (e) => log.push(["scene", e.sceneId]));
  engine.on("interaction", (e) => log.push(["interaction", e.question.id]));
  engine.on("answer", (e) => log.push(["answer", e.choice.id]));
  engine.on("resume", (e) => log.push(["resume", e.time]));
  engine.on("end", (e) => log.push(["end", e.sceneId]));
  return log;
}

describe("StoryEngine", () => {
  it("plays the basic story through a branch to the end", () => {
    const engine = new StoryEngine(basicStory);
    const log = record(engine);

    engine.start();
    engine.update(9.9);
    engine.update(10.1);
    engine.answer("a");
    engine.mediaEnded();
    engine.mediaEnded();

    expect(log).toEqual([
      ["scene", "intro"],
      ["interaction", "q1"],
      ["answer", "a"],
      ["scene", "bosque"],
      ["scene", "final"],
      ["end", "final"],
    ]);
    expect(engine.state).toBe("ended");
  });

  it("exposes state, current scene and active question", () => {
    const engine = new StoryEngine(basicStory);
    expect(engine.state).toBe("idle");
    expect(engine.currentSceneId).toBeNull();

    engine.start();
    expect(engine.state).toBe("playing");
    expect(engine.currentSceneId).toBe("intro");

    engine.update(10);
    expect(engine.state).toBe("interacting");
    expect(engine.activeQuestion?.id).toBe("q1");

    engine.answer("b");
    expect(engine.state).toBe("playing");
    expect(engine.currentSceneId).toBe("rio");
    expect(engine.activeQuestion).toBeNull();
  });

  it("ignores time updates and media end while a question is showing", () => {
    const engine = new StoryEngine(basicStory);
    const log = record(engine);
    engine.start();
    engine.update(10);
    engine.update(12);
    engine.mediaEnded();

    expect(log).toEqual([
      ["scene", "intro"],
      ["interaction", "q1"],
    ]);
  });

  it("rejects answers with no active question or an unknown option", () => {
    const engine = new StoryEngine(basicStory);
    engine.start();
    expect(engine.answer("a")).toBe(false);

    engine.update(10);
    expect(engine.answer("zzz")).toBe(false);
    expect(engine.state).toBe("interacting");
    expect(engine.answer("a")).toBe(true);
    expect(engine.answer("a")).toBe(false);
  });

  it("resumes the current scene when the choice has no goto", () => {
    const engine = new StoryEngine(quiz);
    const log = record(engine);
    engine.start();
    engine.update(5);
    engine.answer("ok");

    expect(log).toEqual([
      ["scene", "lesson"],
      ["interaction", "early"],
      ["answer", "ok"],
      ["resume", 5],
    ]);
  });

  it("fires questions in time order, one at a time, even when seeking past them", () => {
    const engine = new StoryEngine(quiz);
    const log = record(engine);
    engine.start();
    engine.update(30);
    engine.answer("ok");
    engine.update(30);
    engine.answer("ok");
    engine.update(31);

    expect(log.filter(([type]) => type === "interaction")).toEqual([
      ["interaction", "early"],
      ["interaction", "late"],
    ]);
  });

  it("asks questions missed before the video ended, then moves on", () => {
    const engine = new StoryEngine(quiz);
    const log = record(engine);
    engine.start();
    engine.mediaEnded();
    engine.answer("ok");
    engine.answer("ok");

    expect(log).toEqual([
      ["scene", "lesson"],
      ["interaction", "early"],
      ["answer", "ok"],
      ["interaction", "late"],
      ["answer", "ok"],
      ["scene", "outro"],
    ]);
  });

  it("re-arms a scene's questions when it is entered again", () => {
    const loop: Story = {
      version: "0.1",
      start: "s",
      scenes: {
        s: {
          src: "s.mp4",
          events: [
            {
              type: "question",
              id: "again",
              at: 1,
              text: "¿Otra vez?",
              options: [
                { id: "yes", label: "Sí", goto: "s" },
                { id: "no", label: "No" },
              ],
            },
          ],
        },
      },
    };
    const engine = new StoryEngine(loop);
    const log = record(engine);
    engine.start();
    engine.update(1);
    engine.answer("yes");
    engine.update(1);
    engine.answer("no");
    engine.mediaEnded();

    expect(log).toEqual([
      ["scene", "s"],
      ["interaction", "again"],
      ["answer", "yes"],
      ["scene", "s"],
      ["interaction", "again"],
      ["answer", "no"],
      ["resume", 1],
      ["end", "s"],
    ]);
  });

  it("restarts from the start scene when start() is called again", () => {
    const engine = new StoryEngine(basicStory);
    engine.start();
    engine.update(10);
    engine.answer("b");
    engine.start();

    expect(engine.currentSceneId).toBe("intro");
    expect(engine.state).toBe("playing");
    engine.update(10);
    expect(engine.activeQuestion?.id).toBe("q1");
  });

  it("goes to any scene before start(), e.g. to resume a saved story", () => {
    const engine = new StoryEngine(basicStory);
    const log = record(engine);
    engine.goTo("rio");
    engine.mediaEnded();

    expect(log).toEqual([
      ["scene", "rio"],
      ["scene", "final"],
    ]);
  });

  it("dismisses the question on screen when going to another scene", () => {
    const engine = new StoryEngine(basicStory);
    const log = record(engine);
    engine.start();
    engine.update(10);
    engine.goTo("bosque");

    expect(log.slice(-1)).toEqual([["scene", "bosque"]]);
    expect(engine.state).toBe("playing");
    expect(engine.activeQuestion).toBeNull();
    expect(engine.answer("a")).toBe(false);
  });

  it("goes to a scene after the story ended", () => {
    const engine = new StoryEngine(basicStory);
    engine.goTo("final");
    engine.mediaEnded();
    expect(engine.state).toBe("ended");

    engine.goTo("intro");
    expect(engine.state).toBe("playing");
    engine.update(10);
    expect(engine.activeQuestion?.id).toBe("q1");
  });

  it("throws when going to a scene that does not exist", () => {
    const engine = new StoryEngine(basicStory);
    expect(() => engine.goTo("nope")).toThrow('Scene "nope" does not exist');
    expect(engine.state).toBe("idle");
  });

  it("stops calling a listener after it unsubscribes", () => {
    const engine = new StoryEngine(basicStory);
    const listener = vi.fn();
    const off = engine.on("scene", listener);
    engine.start();
    off();
    engine.start();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("throws if the start scene does not exist", () => {
    expect(() => new StoryEngine({ ...basicStory, start: "nope" })).toThrow(
      'Start scene "nope" does not exist',
    );
  });
});
