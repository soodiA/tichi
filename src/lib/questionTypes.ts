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
