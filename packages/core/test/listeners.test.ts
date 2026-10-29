import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type EngineEvents, StoryEngine, type Story } from "../src/index";

const area = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };

/** a: a hotspot (1–3s, → b), a cue from 2s and a timed question at 5s. b counts visits. */
const story: Story = {
  version: "0.1",
  start: "a",
  vars: { n: 0 },
  scenes: {
    a: {
      src: "a.mp4",
      events: [
        {
          type: "question",
          id: "q",
          at: 5,
          text: "?",
          timeout: 3,
          options: [
            { id: "stay", label: "Stay" },
            { id: "go", label: "Go", goto: "b" },
            { id: "count", label: "Count", set: { n: { add: 1 } } },
          ],
        },
        { type: "hotspot", id: "h", from: 1, to: 3, label: "H", area, goto: "b" },
        { type: "cue", id: "c", kind: "chapter", from: 2 },
      ],
    },
    b: {
      src: "b.mp4",
      set: { n: { add: 1 } },
      events: [
        { type: "question", id: "bq", at: 2, text: "?", options: [{ id: "x", label: "X" }] },
      ],
    },
    menu: { src: "menu.mp4" },
  },
};

function record(engine: StoryEngine) {
  const log: string[] = [];
  engine.on("scene", (e) => log.push(`scene:${e.sceneId}`));
  engine.on("interaction", (e) => log.push(`interaction:${e.question.id}`));
  engine.on("resume", (e) => log.push(`resume:${e.time}`));
  engine.on("answer", (e) => log.push(`answer:${e.choice.id}`));
  engine.on("end", () => log.push("end"));
  return log;
}

describe("a listener that throws", () => {
  const reported: unknown[] = [];

  beforeEach(() => {
    reported.length = 0;
    vi.stubGlobal("queueMicrotask", (callback: () => void) => {
      try {
        callback();
      } catch (error) {
        reported.push(error);
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("doesn't stop the other listeners nor the engine, and is still reported", () => {
    const engine = new StoryEngine(story);
    const error = new Error("plugin bug");
    engine.on("vars", () => {
      throw error;
    });
    const log = record(engine);
    engine.start();
    engine.update(5);
    engine.answer("count");

    expect(log).toEqual(["scene:a", "interaction:q", "answer:count", "resume:5"]);
    expect(engine.state).toBe("playing");
    expect(reported).toEqual([error]);
  });
});

describe("a listener that moves the story", () => {
  it("wins over the branch of the answer", () => {
    const engine = new StoryEngine(story);
    const log = record(engine);
    engine.on("answer", () => engine.goTo("menu"));
    engine.start();
    engine.update(5);
    engine.answer("go");

    expect(log).toEqual(["scene:a", "interaction:q", "answer:go", "scene:menu"]);
    expect(engine.currentSceneId).toBe("menu");
  });

  it("wins over the resume of an answer that doesn't branch", () => {
    const engine = new StoryEngine(story);
    const log = record(engine);
    engine.on("answer", () => engine.goTo("menu"));
    engine.start();
    engine.update(5);
    engine.answer("stay");

    expect(log).toEqual(["scene:a", "interaction:q", "answer:stay", "scene:menu"]);
  });

  it("wins with a seek, too", () => {
    const engine = new StoryEngine(story);
    const log = record(engine);
    engine.on("answer", () => engine.seek(1));
    engine.start();
    engine.update(5);
    engine.answer("go");

    expect(log).toEqual(["scene:a", "interaction:q", "answer:go", "resume:1"]);
    expect(engine.currentSceneId).toBe("a");
  });

  it("wins from a vars listener while answering", () => {
    const engine = new StoryEngine(story);
    const log = record(engine);
    engine.on("vars", ({ vars }) => {
      if (vars["n"] === 1) engine.goTo("menu");
    });
    engine.start();
    engine.update(5);
    engine.answer("count");

    expect(log).toEqual(["scene:a", "interaction:q", "scene:menu"]);
  });

  it("wins over the branch of a hotspot", () => {
    const engine = new StoryEngine(story);
    const log = record(engine);
    engine.on("hotspot", () => engine.goTo("menu"));
    engine.start();
    engine.update(1);
    engine.activate("h");

    expect(log).toEqual(["scene:a", "scene:menu"]);
  });

  it("wins over a timeout", () => {
    vi.useFakeTimers();
    const engine = new StoryEngine(story);
    const log = record(engine);
    engine.on("timeout", () => engine.goTo("menu"));
    engine.start();
    engine.update(5);
    vi.advanceTimersByTime(3000);
    vi.useRealTimers();

    expect(log).toEqual(["scene:a", "interaction:q", "scene:menu"]);
  });

  it("stops the update that announced it, which can't ask the new scene's questions", () => {
    const engine = new StoryEngine(story);
    const log = record(engine);
    engine.on("cues", ({ cues }) => {
      if (cues.length > 0) engine.goTo("b");
    });
    engine.start();
    engine.update(2);

    expect(log).toEqual(["scene:a", "scene:b"]);
    expect(engine.state).toBe("playing");
  });

  it("wins while a scene is being entered, which is then never announced", () => {
    const engine = new StoryEngine(story);
    const log = record(engine);
    engine.on("vars", ({ vars }) => {
      if (vars["n"] === 1) engine.goTo("menu");
    });
    engine.goTo("b");

    expect(log).toEqual(["scene:menu"]);
    expect(engine.currentSceneId).toBe("menu");
  });
});

describe("listeners that don't move the story", () => {
  it("leave every transition as it was", () => {
    const engine = new StoryEngine(story);
    const log = record(engine);
    const seen: (keyof EngineEvents)[] = [];
    for (const type of ["vars", "hotspots", "cues", "answer", "hotspot"] as const) {
      engine.on(type, () => seen.push(type));
    }
    engine.start();
    engine.update(5);
    engine.answer("go");
    engine.update(2);
    engine.answer("x");

    expect(log).toEqual([
      "scene:a",
      "interaction:q",
      "answer:go",
      "scene:b",
      "interaction:bq",
      "answer:x",
      "resume:2",
    ]);
    expect(seen).toContain("vars");
  });
});
