import type { Question } from '../types';

// Some question types repeat the same instruction with only the target letter/word
// changing (e.g. color_letter: "حرف آ را رنگ کن" / "حرف ب را رنگ کن" / ...).
// Soodeh wants ONE shared spoken prompt per type instead of a per-question recording.
// She records it via /audio-recorder, which uploads to Supabase storage and writes
// the same public URL into every row's question_audio_url for that type — so
// playback just reads question.questionAudioUrl as normal, no separate map needed.
// QUESTION_TYPE_PROMPT only holds the generic Persian text shown/spoken (TTS fallback
// before she's recorded real audio, and as the caption instead of the per-question text).
export const QUESTION_TYPE_PROMPT: Partial<Record<Question['type'], string>> = {
  color_letter: 'این شکل را رنگ کن',
};
