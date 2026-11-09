// Lesson scoring rule (from the owner): every lesson is worth 3 stars and each wrong answer costs one star.
// A lesson with MAX_WRONG_TO_PASS + 1 or more wrong answers is NOT passed: no next lesson, no celebration, retry.
export const MAX_STARS = 3;
export const WRONG_TO_FAIL = 4;

export const starsForWrong = (wrong: number): number => Math.max(0, MAX_STARS - wrong);
export const lessonPassed = (wrong: number): boolean => wrong < WRONG_TO_FAIL;
