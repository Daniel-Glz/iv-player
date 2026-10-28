import { describe, expect, it } from "vitest";
import { StoryEngine, type EngineEvents, type Story } from "../src/index";

const area = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };

/**
 * A two-question quiz scored in `score`. The outro branches on the score, and
 * a bonus option and hotspot only show once `key` is found.
 */
const quiz: Story = {
  version: "0.1",
  start: "q1",
  vars: { score: 0, key: false, visits: 0 },
  scenes: {
    q1: {
      src: "q1.mp4",
      next: "q2",
      set: { visits: { add: 1 } },
      events: [
        {
          type: "hotspot",
          id: "key",
          from: 1,
          to: 3,
          area,
          label: "Llave",
          set: { key: true },
        },
        {
          type: "question",
          id: "first",
          at: 5,
          text: "¿2 + 2?",
          options: [
            { id: "right", label: "4", set: { score: { add: 1 } } },
            { id: "wrong", label: "5" },
            { id: "bonus", label: "Usar la llave", if: { var: "key", eq: true } },
          ],
        },
      ],
    },
    q2: {
      src: "q2.mp4",
      events: [
        {
          type: "question",
          id: "second",
          at: 5,
          text: "¿3 + 3?",
          options: [
            {
              id: "right",
              label: "6",
              set: { score: { add: 1 } },
              branches: [{ if: { var: "score", gte: 2 }, goto: "perfect" }],
              goto: "done",
            },
            { id: "wrong", label: "7", goto: "done" },
          ],
        },
        {
          type: "hotspot",
          id: "secret",
          from: 0,
          area,
          label: "Secreto",
          if: [
            { var: "key", eq: true },
            { var: "score", gte: 1 },
          ],
        },
      ],
    },
    done: {
      src: "done.mp4",
      branches: [
        { if: { var: "score", eq: 0 }, goto: "retry" },
        { if: { var: "score", gte: 1, lt: 2 }, goto: "almost" },
      ],
    },
    perfect: { src: "perfect.mp4" },
    almost: { src: "almost.mp4" },
    retry: { src: "retry.mp4" },
  },
};

function record(engine: StoryEngine) {
  const log: [keyof EngineEvents, unknown][] = [];
  engine.on("scene", (e) => log.push(["scene", e.sceneId]));
  engine.on("vars", (e) => log.push(["vars", { ...e.vars }]));
  engine.on("answer", (e) => log.push(["answer", e.goto]));
  engine.on("hotspot", (e) => log.push(["hotspot", e.goto]));
  return log;
}

describe("StoryEngine variables", () => {
  it("starts from the story's vars and counts scene visits", () => {
    const engine = new StoryEngine(quiz);
    expect(engine.vars).toEqual({ score: 0, key: false, visits: 0 });

    engine.start();
    expect(engine.vars["visits"]).toBe(1);
    engine.goTo("q1");
    expect(engine.vars["visits"]).toBe(2);
  });

  it("applies set before branching, so branches see the new values", () => {
    const engine = new StoryEngine(quiz);
    const log = record(engine);
    engine.start();
    engine.update(5);
    engine.answer("right");
    engine.mediaEnded();
    engine.update(5);
    engine.answer("right");

    expect(log).toEqual([
      ["vars", { score: 0, key: false, visits: 1 }],
      ["scene", "q1"],
      ["vars", { score: 1, key: false, visits: 1 }],
      ["answer", undefined],
      ["scene", "q2"],
      ["vars", { score: 2, key: false, visits: 1 }],
      ["answer", "perfect"],
      ["scene", "perfect"],
    ]);
  });

  it("falls back to goto, then to next, when no branch holds", () => {
    const engine = new StoryEngine(quiz);
    engine.start();
    engine.update(5);
    engine.answer("right");
    engine.mediaEnded();
    engine.update(5);
    engine.answer("wrong");
    expect(engine.currentSceneId).toBe("done");

    // score is 1: the scene's second branch holds.
    engine.mediaEnded();
    expect(engine.currentSceneId).toBe("almost");
  });

  it("takes the first scene branch that holds, or ends without next", () => {
    const engine = new StoryEngine(quiz);
    engine.goTo("done");
    engine.mediaEnded();
    expect(engine.currentSceneId).toBe("retry");

    engine.setVar("score", 5);
    engine.goTo("done");
    engine.mediaEnded();
    expect(engine.state).toBe("ended");
  });

  it("offers only the options whose if holds", () => {
    const engine = new StoryEngine(quiz);
    const offered: string[][] = [];
    engine.on("interaction", (e) => offered.push(e.options.map((o) => o.id)));
    engine.start();
    engine.update(5);
    expect(engine.answer("bonus")).toBe(false);

    engine.goTo("q1");
    engine.update(2);
    engine.activate("key");
    engine.update(5);
    expect(offered).toEqual([
      ["right", "wrong"],
      ["right", "wrong", "bonus"],
    ]);
    expect(engine.answer("bonus")).toBe(true);
  });

  it("skips a question whose options are all hidden", () => {
    const engine = new StoryEngine({
      version: "0.1",
      start: "s",
      vars: { open: false },
      scenes: {
        s: {
          src: "s.mp4",
          next: "t",
          events: [
            {
              type: "question",
              id: "q",
              at: 1,
              text: "?",
              options: [{ id: "a", label: "A", if: { var: "open", eq: true } }],
            },
          ],
        },
        t: { src: "t.mp4" },
      },
    });
    engine.start();
    engine.update(2);
    expect(engine.state).toBe("playing");
    expect(engine.activeQuestion).toBeNull();

    // Also when it's still pending as the video ends.
    engine.goTo("s");
    engine.mediaEnded();
    expect(engine.currentSceneId).toBe("t");
  });

  it("shows hotspots only while all their conditions hold, rechecked on every update", () => {
    const engine = new StoryEngine(quiz);
    const shown = () => engine.visibleHotspots.map((h) => h.id);
    engine.goTo("q2");
    engine.update(1);
    expect(shown()).toEqual([]);

    engine.setVar("key", true);
    engine.update(1.1);
    expect(shown()).toEqual([]);
    engine.setVar("score", 1);
    engine.update(1.2);
    expect(shown()).toEqual(["secret"]);
  });

  it("reports the resolved goto of hotspots and applies their set", () => {
    const engine = new StoryEngine(quiz);
    const log = record(engine);
    engine.start();
    engine.update(2);
    engine.activate("key");

    expect(log.slice(-2)).toEqual([
      ["vars", { score: 0, key: true, visits: 1 }],
      ["hotspot", undefined],
    ]);
  });

  it("resets variables on start, but not on goTo", () => {
    const engine = new StoryEngine(quiz);
    engine.setVar("score", 3);
    engine.goTo("q2");
    expect(engine.vars["score"]).toBe(3);

    engine.start();
    expect(engine.vars["score"]).toBe(0);
  });

  it("compares numbers only with ordering operators", () => {
    const engine = new StoryEngine({
      version: "0.1",
      start: "s",
      vars: { n: "5" },
      scenes: {
        s: {
          src: "s.mp4",
          branches: [
            { if: { var: "missing", gte: 0 }, goto: "a" },
            { if: { var: "n", ne: 5 }, goto: "b" },
          ],
        },
        a: { src: "a.mp4" },
        b: { src: "b.mp4" },
      },
    });
    engine.start();
    engine.mediaEnded();
    expect(engine.currentSceneId).toBe("b");
  });
});
