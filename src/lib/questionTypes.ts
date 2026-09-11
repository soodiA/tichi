import type { QuestionType } from '../types';

export const TYPE_LABELS: Record<QuestionType, string> = {
  audio_picture: 'صدا + عکس',
  syllable_count: 'شمردن بخش (عدد)',
  flower_count: 'شمردن بخش (گل)',
  record: 'تکرار تلفظ',
  fill_blanks: 'پر کردن جای خالی',
  handwriting: 'دستخط',
  audio_options: 'انتخاب صدای درست',
  sentence_complete: 'تکمیل جمله',
  arrange: 'چیدن کلمات',
  similar_letters: 'حروف شبیه هم',
  phoneme: 'صداکشی',
  middle_blank: 'جای خالی وسط جمله',
  sound_to_text: 'صدا به نوشتار',
  color_letter: 'رنگ کردن حرف',
  pair_match: 'جفت‌یابی',
};

export const ALL_TYPES = Object.keys(TYPE_LABELS) as QuestionType[];

// Types not yet supported by the question-entry form (also unsupported in the live app — see QuestionWrapper.tsx).
export const UNSUPPORTED_TYPES: QuestionType[] = ['similar_letters', 'middle_blank'];

// Default question_text pre-filled when starting a new question of this type, taken
// from the most common existing phrasing per type in the live curriculum (queried
// from Supabase 2026-08-28) — she edits the embedded letter/word after, per her request
// that most questions of a type share the same wording.
export const QUESTION_TYPE_DEFAULT_TEXT: Partial<Record<QuestionType, string>> = {
  record: 'بخوان:',
  handwriting: 'با انگشت بنویس: ',
  audio_picture: 'کدام یکی با _ شروع میشه؟',
  sound_to_text: 'کدام گزینه درست است؟',
  color_letter: 'حرف _ را رنگ کن!',
  flower_count: 'کلمه‌ی «_» چند بخش داره',
  syllable_count: 'کلمه‌ی «_» چند بخش داره',
  phoneme: 'کلمه «_» را صداکشی کن',
  fill_blanks: 'حرف گم‌شده را پیدا کن',
  audio_options: 'کدام یکی «_» خوانده می‌شه؟',
  pair_match: 'کدام شکل‌ها صدای اول مثل هم دارند؟',
  arrange: 'جمله را مرتب کن.',
  sentence_complete: 'جمله را کامل کن: ...',
};
