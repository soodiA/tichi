import type { Question } from '../types';

// Some question types repeat the same instruction with only the target letter/word
// changing (e.g. color_letter: "حرف آ را رنگ کن" / "حرف ب را رنگ کن" / ...).
// Soodeh wants ONE shared spoken prompt per type instead of a per-question recording.
// She records it via /audio-recorder, which uploads to Supabase storage and writes
// the same public URL into every row's question_audio_url for that type — so
// playback just reads question.questionAudioUrl as normal, no separate map needed.
// QUESTION_TYPE_PROMPT only holds the generic Persian text shown/spoken (TTS fallback
// before she's recorded real audio, and as the caption instead of the per-question text).
// audio_picture has two phrasings with different spoken prompts:
//   start: "کدام یکی با این صدا شروع میشه؟"   end: "صدای آخر کدام یکی شبیه این صداست؟"
// so its shared prompt is recorded once per phrasing. The end phrasing is told apart
// by its text ("آخر…" / "…ختم"); keep in sync with the ilike filters in AudioRecorder.
export const AUDIO_PICTURE_END_KEY = 'audio_picture_end';
export const isAudioPictureEnd = (text: string) => /آخر|ختم/.test(text);
export const promptKeyFor = (q: { type: string; questionText: string }): string =>
  q.type === 'audio_picture' && isAudioPictureEnd(q.questionText) ? AUDIO_PICTURE_END_KEY : q.type;

export const QUESTION_TYPE_PROMPT: Partial<Record<Question['type'], string>> = {
  color_letter: 'این شکل را رنگ کن',
  text_choice: 'کدام یکی درست نوشته شده؟',
  // The phrase itself lives in question_text and is rendered by Q12_MiddleBlank.
  middle_blank: 'گزینه صحیح را انتخاب کن.',
  audio_options: 'کدام صدا مربوط به این ترکیب است؟',
  // fill_blanks ("find the missing letter") must NEVER play a per-row recorded
  // question_audio_url — at least one existing row's recording speaks the full
  // correct word aloud, which gives away the answer. Any future per-row recording
  // for this type risks the same leak, so QuestionWrapper suppresses
  // question.questionAudioUrl specifically for this type (see audioUrl there) and
  // only offers the safe generic TTS reading of this prompt text.
  fill_blanks: 'حرف گم‌شده را پیدا کن',
};
