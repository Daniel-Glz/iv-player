import { describe, expect, it } from "vitest";
import { answerRange } from "../src/index";

describe("answerRange", () => {
  it("takes exactly one option unless the question is multiple", () => {
    expect(answerRange({}, 3)).toEqual([1, 1]);
    expect(answerRange({ min: 2, max: 3 }, 3)).toEqual([1, 1]);
  });

  it("defaults a multiple question to one through all offered options", () => {
    expect(answerRange({ multiple: true }, 4)).toEqual([1, 4]);
  });

  it("keeps the question's own bounds", () => {
    expect(answerRange({ multiple: true, min: 2, max: 3 }, 4)).toEqual([2, 3]);
  });

  it("caps min to the options offered", () => {
    expect(answerRange({ multiple: true, min: 3 }, 2)).toEqual([2, 2]);
  });
});
