// Lesson scoring rule (from the owner): every lesson is worth 3 stars and each wrong answer costs one star.
// A lesson with WRONG_TO_FAIL or more wrong answers is NOT passed: 0 stars, no coins, next lesson stays locked, retry.
// The streak still counts for a failed lesson (the child showed up and tried).
export const MAX_STARS = 3;
export const WRONG_TO_FAIL = 3;

export const starsForWrong = (wrong: number): number => Math.max(0, MAX_STARS - wrong);
export const lessonPassed = (wrong: number): boolean => wrong < WRONG_TO_FAIL;
