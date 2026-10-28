import { describe, expect, it } from "vitest";
import { type EngineEvents, type Question, StoryEngine, type Story } from "../src/index";

/** "Which are primes?", scored one point per prime, branching on the score. */
const primes: Question = {
  type: "question",
  id: "primes",
  at: 5,
  text: "¿Cuáles son primos?",
  multiple: true,
  max: 3,
  options: [
    { id: "two", label: "2", correct: true, set: { score: { add: 1 } } },
    { id: "four", label: "4", correct: false },
    { id: "five", label: "5", correct: true, set: { score: { add: 1 } } },
    { id: "nine", label: "9", if: { var: "hard", eq: true } },
  ],
  branches: [{ if: { var: "score", gte: 2 }, goto: "good" }],
  goto: "review",
};

const story: Story = {
  version: "0.1",
  start: "quiz",
  vars: { score: 0, hard: false },
  scenes: {
    quiz: { src: "quiz.mp4", events: [primes] },
    good: { src: "good.mp4" },
    review: { src: "review.mp4" },
  },
};

function asked(question: Question = primes) {
  const engine = new StoryEngine({
    ...story,
    scenes: { ...story.scenes, quiz: { src: "quiz.mp4", events: [question] } },
  });
  const answers: EngineEvents["answer"][] = [];
  engine.on("answer", (e) => answers.push(e));
  engine.start();
  engine.update(5);
  return { engine, answers };
}

describe("StoryEngine multiple answers", () => {
  it("applies every picked option's set, then branches on the question", () => {
    const { engine, answers } = asked();
    expect(engine.answer(["five", "two"])).toBe(true);

    expect(engine.vars["score"]).toBe(2);
    expect(engine.currentSceneId).toBe("good");
    const [answer] = answers;
    // In option order, whatever order they were given in.
    expect(answer?.choices.map((c) => c.id)).toEqual(["two", "five"]);
    expect(answer?.choice.id).toBe("two");
    expect(answer?.correct).toBe(true);
    expect(answer?.goto).toBe("good");
  });

  it("falls back to the question's goto and reports a wrong answer", () => {
    const { engine, answers } = asked();
    engine.answer(["two", "four"]);

    expect(engine.currentSceneId).toBe("review");
    expect(answers[0]?.correct).toBe(false);
  });

  it("counts a partial answer as wrong", () => {
    const { engine, answers } = asked();
    engine.answer("two");
    expect(answers[0]?.correct).toBe(false);
  });

  it("rejects unknown, hidden, repeated and out-of-range picks", () => {
    const { engine } = asked();
    expect(engine.answer([])).toBe(false);
    expect(engine.answer(["two", "six"])).toBe(false);
    expect(engine.answer(["two", "nine"])).toBe(false);
    expect(engine.answer(["two", "two"])).toBe(false);
    expect(engine.state).toBe("interacting");

    const limited = asked({ ...primes, min: 2, max: 2 }).engine;
    expect(limited.answer("two")).toBe(false);
    expect(limited.answer(["two", "four", "five"])).toBe(false);
    expect(limited.answer(["two", "four"])).toBe(true);
  });

  it("caps min to the options offered", () => {
    const { engine } = asked({
      ...primes,
      min: 3,
      options: primes.options.filter((o) => o.id !== "four"),
    });
    expect(engine.answer(["two", "five"])).toBe(true);
  });

  it("takes a single id only for single questions", () => {
    const { engine } = asked({ ...primes, multiple: false });
    expect(engine.answer(["two", "five"])).toBe(false);
    expect(engine.answer(["two"])).toBe(true);
  });

  it("lets single questions fall back to the question's goto and seek", () => {
    const single: Question = {
      ...primes,
      multiple: false,
      branches: [],
      options: [
        { id: "stay", label: "Stay", seek: 1 },
        { id: "go", label: "Go" },
      ],
    };
    const first = asked(single);
    const resumes: number[] = [];
    first.engine.on("resume", (e) => resumes.push(e.time));
    first.engine.answer("stay");
    expect(resumes).toEqual([1]);

    const second = asked(single);
    second.engine.answer("go");
    expect(second.engine.currentSceneId).toBe("review");

    const { goto: _, ...withoutGoto } = single;
    const third = asked({ ...withoutGoto, seek: 2 });
    const times: number[] = [];
    third.engine.on("resume", (e) => times.push(e.time));
    third.engine.answer("go");
    expect(times).toEqual([2]);
  });

  it("reports correct as undefined without marked options", () => {
    const { engine, answers } = asked({
      ...primes,
      options: primes.options.map(({ correct: _, ...option }) => option),
    });
    engine.answer("two");
    expect(answers[0]?.correct).toBeUndefined();
  });
});
