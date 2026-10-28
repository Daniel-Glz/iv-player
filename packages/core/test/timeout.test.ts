import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type EngineEvents, type Question, StoryEngine } from "../src/index";

/** "Left or right?" at 5s, waiting 10s; staying still means "right". */
const question: Question = {
  type: "question",
  id: "q",
  at: 5,
  text: "¿Izquierda o derecha?",
  timeout: 10,
  default: "right",
  options: [
    { id: "left", label: "Izquierda", goto: "left" },
    { id: "right", label: "Derecha", goto: "right" },
    { id: "secret", label: "Secreto", goto: "left", if: { var: "key", eq: true } },
  ],
};

function asked(q: Question = question) {
  const engine = new StoryEngine({
    version: "0.1",
    start: "s",
    vars: { key: false },
    scenes: {
      s: { src: "s.mp4", next: "after", events: [q] },
      left: { src: "left.mp4" },
      right: { src: "right.mp4" },
      late: { src: "late.mp4" },
      after: { src: "after.mp4" },
    },
  });
  const log: [keyof EngineEvents, unknown][] = [];
  engine.on("timeout", (e) => log.push(["timeout", e.question.id]));
  engine.on("answer", (e) => log.push(["answer", e.choices.map((c) => c.id)]));
  engine.on("resume", (e) => log.push(["resume", e.time]));
  engine.on("scene", (e) => log.push(["scene", e.sceneId]));
  engine.start();
  engine.update(5);
  log.length = 0;
  return { engine, log };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("StoryEngine question timeouts", () => {
  it("answers with the default when the time runs out", () => {
    const { engine, log } = asked();
    vi.advanceTimersByTime(9999);
    expect(log).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(log).toEqual([
      ["timeout", "q"],
      ["answer", ["right"]],
      ["scene", "right"],
    ]);
    expect(engine.state).toBe("playing");
  });

  it("lets the question decide without a default, or else resumes", () => {
    const { default: _, ...withoutDefault } = question;
    const first = asked({ ...withoutDefault, goto: "late" });
    vi.advanceTimersByTime(10_000);
    expect(first.log).toEqual([
      ["timeout", "q"],
      ["scene", "late"],
    ]);

    const second = asked(withoutDefault);
    vi.advanceTimersByTime(10_000);
    expect(second.log).toEqual([
      ["timeout", "q"],
      ["resume", 5],
    ]);
  });

  it("falls back to the question when the default isn't offered", () => {
    const { log } = asked({ ...question, default: "secret", seek: 1 });
    vi.advanceTimersByTime(10_000);
    expect(log).toEqual([
      ["timeout", "q"],
      ["resume", 1],
    ]);
  });

  it("stops counting once answered or when leaving the scene", () => {
    const answered = asked();
    answered.engine.answer("left");
    answered.engine.goTo("s");
    answered.engine.update(5);
    vi.advanceTimersByTime(5000);
    answered.engine.goTo("after");
    vi.advanceTimersByTime(10_000);
    expect(answered.log.filter(([type]) => type === "timeout")).toEqual([]);
  });

  it("restarts the count each time the question is asked", () => {
    const { default: _, ...withoutDefault } = question;
    const { engine, log } = asked({ ...withoutDefault, seek: 0 });
    vi.advanceTimersByTime(10_000);
    engine.update(5);
    vi.advanceTimersByTime(9000);
    expect(log.filter(([type]) => type === "timeout")).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(log.filter(([type]) => type === "timeout")).toHaveLength(2);
  });

  it("takes a list of defaults for multiple questions", () => {
    const { log } = asked({
      ...question,
      multiple: true,
      options: question.options.map(({ goto: _, ...option }) => option),
      default: ["left", "right"],
      goto: "after",
    });
    vi.advanceTimersByTime(10_000);
    expect(log).toEqual([
      ["timeout", "q"],
      ["answer", ["left", "right"]],
      ["scene", "after"],
    ]);
  });

  it("moves on to next when the video had already ended", () => {
    const { default: _, ...withoutDefault } = question;
    const engine = new StoryEngine({
      version: "0.1",
      start: "s",
      scenes: {
        s: { src: "s.mp4", next: "after", events: [withoutDefault] },
        after: { src: "a.mp4" },
      },
    });
    engine.start();
    engine.mediaEnded();
    expect(engine.state).toBe("interacting");
    vi.advanceTimersByTime(10_000);
    expect(engine.currentSceneId).toBe("after");
  });
});

describe("pauseTimeout() and resumeTimeout()", () => {
  it("stops the count and goes on with the time left", () => {
    const { engine, log } = asked();
    vi.advanceTimersByTime(4000);
    engine.pauseTimeout();
    vi.advanceTimersByTime(60_000);
    expect(log).toEqual([]);

    engine.resumeTimeout();
    vi.advanceTimersByTime(5999);
    expect(log).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(log[0]).toEqual(["timeout", "q"]);
  });

  it("ignore questions without a timeout, and pausing twice", () => {
    const { engine, log } = asked();
    engine.pauseTimeout();
    vi.advanceTimersByTime(3000);
    engine.pauseTimeout();
    engine.resumeTimeout();
    engine.resumeTimeout();
    vi.advanceTimersByTime(9999);
    expect(log).toEqual([]);

    const { timeout: _, ...withoutTimeout } = question;
    const untimed = asked(withoutTimeout).engine;
    untimed.pauseTimeout();
    untimed.resumeTimeout();
    vi.advanceTimersByTime(60_000);
    expect(untimed.activeQuestion?.id).toBe("q");
  });

  it("forget a paused timeout once the question is answered", () => {
    const { engine, log } = asked();
    engine.pauseTimeout();
    engine.answer("left");
    engine.resumeTimeout();
    vi.advanceTimersByTime(60_000);
    expect(log.some(([type]) => type === "timeout")).toBe(false);
  });
});

describe("destroy()", () => {
  it("cancels the timeout and removes every listener", () => {
    const { engine, log } = asked();
    engine.destroy();
    vi.advanceTimersByTime(60_000);
    engine.goTo("left");
    expect(log).toEqual([]);
  });
});
