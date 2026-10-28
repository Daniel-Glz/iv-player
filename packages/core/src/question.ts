import type { Question } from "./types.js";

/**
 * Fewest and most options an answer to `question` takes when `offered` options are
 * shown: exactly one, unless it's `multiple`. Then `min` defaults to 1 and is capped
 * to `offered`, so conditions hiding options never make it unanswerable, and `max`
 * defaults to `offered`.
 */
export function answerRange(
  question: {
    multiple?: Question["multiple"] | undefined;
    min?: number | undefined;
    max?: number | undefined;
  },
  offered: number,
): [min: number, max: number] {
  return question.multiple === true
    ? [Math.min(question.min ?? 1, offered), question.max ?? offered]
    : [1, 1];
}
