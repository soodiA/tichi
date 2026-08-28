import type { Question } from '../types';

// Some question types repeat the same instruction with only the target letter/word
// changing (e.g. color_letter: "حرف آ را رنگ کن" / "حرف ب را رنگ کن" / ...).
// Soodeh wants ONE shared spoken prompt per type instead of a per-question recording.
// QUESTION_TYPE_PROMPT holds the generic Persian text (used for the TTS fallback and
// as the caption shown instead of the per-question text, when set for a type).
// QUESTION_TYPE_AUDIO holds the recorded file for that type once she sends it — path
// is relative to public/, resolved the same way as image paths (see media.ts).
export const QUESTION_TYPE_PROMPT: Partial<Record<Question['type'], string>> = {
  color_letter: 'این شکل را رنگ کن',
};

export const QUESTION_TYPE_AUDIO: Partial<Record<Question['type'], string>> = {
  // color_letter: 'audio/types/color_letter.mp3',  // add once Soodeh sends the recording
};

export const resolveTypeAudioSrc = (path: string): string => {
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return import.meta.env.BASE_URL + path.replace(/^\//, '');
};
