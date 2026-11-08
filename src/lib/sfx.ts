// Short sound effects shipped with the app (public/sounds), so they work offline and air-gapped.
// Best-effort: browsers may block audio before a user gesture, and a failure must never break a lesson.
const BASE = import.meta.env.BASE_URL;
const FILES = {
  correct: `${BASE}sounds/correct.mp3`,
  wrong: `${BASE}sounds/wrong.mp3`,
  victory: `${BASE}sounds/victory.mp3`,
} as const;

export type Sfx = keyof typeof FILES;

export function playSfx(kind: Sfx): void {
  try {
    const a = new Audio(FILES[kind]);
    a.volume = 0.9;
    a.play().catch(() => {});
  } catch { /* ignore */ }
}
