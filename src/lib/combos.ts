export // All consonants with their curriculum ordinal
const CONSONANTS = [
  { letter: 'م', uid: 'mim', ord: 5 },
  { letter: 'س', uid: 'sin', ord: 6 },
  { letter: 'ت', uid: 'te', ord: 7 },
  { letter: 'ر', uid: 're', ord: 9 },
  { letter: 'ن', uid: 'noon', ord: 10 },
  { letter: 'ز', uid: 'ze', ord: 12 },
  { letter: 'ش', uid: 'shin', ord: 14 },
  { letter: 'ی', uid: 'ye', ord: 15 },
  { letter: 'ک', uid: 'kaf', ord: 17 },
  { letter: 'و', uid: 'vav', ord: 18 },
  { letter: 'پ', uid: 'pe', ord: 19 },
  { letter: 'گ', uid: 'gaf', ord: 20 },
  { letter: 'ف', uid: 'fe', ord: 21 },
  { letter: 'خ', uid: 'khe', ord: 22 },
  { letter: 'ق', uid: 'qaf', ord: 23 },
  { letter: 'ل', uid: 'lam', ord: 24 },
  { letter: 'ج', uid: 'jim', ord: 25 },
  { letter: 'ه', uid: 'he', ord: 27 },
  { letter: 'چ', uid: 'che', ord: 28 },
  { letter: 'ژ', uid: 'zhe', ord: 29 },
  { letter: 'ص', uid: 'sad', ord: 32 },
  { letter: 'ذ', uid: 'zal', ord: 33 },
  { letter: 'ع', uid: 'ein', ord: 34 },
  { letter: 'ث', uid: 'se', ord: 35 },
  { letter: 'ح', uid: 'he2', ord: 36 },
  { letter: 'ض', uid: 'zad', ord: 37 },
  { letter: 'ط', uid: 'ta2', ord: 38 },
  { letter: 'غ', uid: 'ghein', ord: 39 },
  { letter: 'ظ', uid: 'za2', ord: 40 },
];

// Vowel suffix and introduction ordinal
export const VOWELS = [
  { key: 'aa',  suffix: 'ا',  label: 'آ',  introOrd: 1 },
  { key: 'fat', suffix: 'َ',  label: 'اَ', introOrd: 3 },
  { key: 'oo',  suffix: 'و',  label: 'او', introOrd: 8 },
  { key: 'ei',  suffix: 'ی',  label: 'ای', introOrd: 11 },
  { key: 'kas', suffix: 'ِ',  label: 'اِ', introOrd: 13 },
  { key: 'dam', suffix: 'ُ',  label: 'اُ', introOrd: 16 },
];

export function comboText(letter: string, suffix: string) {
  return letter + suffix;
}


// Clip lookup for a combo's text (e.g. "با", "مَ") against recordings made in
// /record-combos (storage "combos/<uid>-<vowelKey>--<ts>.<ext>").
const strip = (t: string) => t.normalize('NFC').replace(/\u200c/g, '');
export function comboKeyForText(text: string): string | undefined {
  const t = strip(text);
  for (const c of CONSONANTS) for (const v of VOWELS) {
    if (strip(comboText(c.letter, v.suffix)) === t) return `${c.uid}-${v.key}`;
  }
  return undefined;
}
