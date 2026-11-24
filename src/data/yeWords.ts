// "ای" + "یـ" side by side: the first part ends with ی (the ee sound) and the second starts
// with ی (the ya sound). We write ONE ی but say both. Requested by Soodeh for section ی.
export interface YeWord {
  word: string;
  parts: string[]; // syllables, as pronounced; the joint ی sits at the end of parts[i] and start of parts[i+1]
  emoji: string;
}

export const YE_WORDS: YeWord[] = [
  { word: 'بیا',     parts: ['بی', 'یا'],        emoji: '👋' },
  { word: 'خیابان',  parts: ['خی', 'یا', 'بان'], emoji: '🛣️' },
  { word: 'سیاه',    parts: ['سی', 'یاه'],       emoji: '⚫' },
  { word: 'بیابان',  parts: ['بی', 'یا', 'بان'], emoji: '🏜️' },
  { word: 'پیاز',    parts: ['پی', 'یاز'],       emoji: '🧅' },
  { word: 'کیان',    parts: ['کی', 'یان'],       emoji: '👦' },
  { word: 'خیار',    parts: ['خی', 'یار'],       emoji: '🥒' },
];

// Spoken + shown on the opening page, before the examples.
export const YE_RULE =
  'وقتی حرف «ی» و حرف «ی» کنار هم قرار می‌گیرند، به طوری که «ی» در آخر بخش اول و «ی» در اول بخش دوم باشد، یکی از آن‌ها را می‌نویسیم ولی هر دو را می‌خوانیم. مثل:';

// Narration clips for the lesson pages (recorded in /ye-lesson-recorder, stored in the 'intro' folder).
// Page 0 is the rule page, pages 1..n are YE_WORDS in order.
export const yeClipKey = (page: number) => `ye-lesson-${page}`;
export const YE_PAGE_COUNT = YE_WORDS.length + 1;
