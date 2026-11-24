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
];
