export interface LetterForm {
  text: string;
  label: string;
  color: string;
}

export interface WordExample {
  emoji: string;
  word: string;
  highlight?: string;
  highlightColor?: string;
  pos: string; // 'اول' | 'وسط' | 'آخر'
}

export interface UnitIntroData {
  letter: string;
  name: string;         // used in speech/display: "حرف آ", "صدای اَ", etc.
  description: string;
  accent: string;
  bg: string;
  forms?: LetterForm[];
  examples: WordExample[];
}

// 12-color palette — cycling by unit ord (ord-1) % 12
const C = {
  amber:   { accent: '#F59E0B', bg: '#FFFBEB' },
  blue:    { accent: '#2563EB', bg: '#EFF6FF' },
  rose:    { accent: '#E11D48', bg: '#FFF1F2' },
  green:   { accent: '#059669', bg: '#ECFDF5' },
  purple:  { accent: '#7C3AED', bg: '#F5F0FF' },
  sky:     { accent: '#0EA5E9', bg: '#EFF9FF' },
  orange:  { accent: '#EA580C', bg: '#FFF7ED' },
  emerald: { accent: '#10B981', bg: '#F0FFF4' },
  teal:    { accent: '#0D9488', bg: '#F0FDFA' },
  indigo:  { accent: '#4F46E5', bg: '#EEF2FF' },
  pink:    { accent: '#DB2777', bg: '#FDF2F8' },
  lime:    { accent: '#65A30D', bg: '#F7FEE7' },
};

// Secondary colors for form contrast (index = unit's color index in COLORS array)
// Paired to maximize visual contrast
const SEC = ['#10B981','#EA580C','#0D9488','#DB2777','#65A30D','#4F46E5','#2563EB','#F59E0B','#E11D48','#0EA5E9','#059669','#7C3AED'];

// Keyed by units.letter value in the DB
export const UNIT_INTROS: Record<string, UnitIntroData> = {

  // ── Unit 1 — آ  (amber, idx 0) ──────────────────────────────────────────
  'آ': {
    letter: 'آ', name: 'آ',
    description: 'اولین حرف الفبای فارسی',
    ...C.amber,
    forms: [
      { text: 'آ',  label: 'اول کلمه',         color: '#F59E0B' },
      { text: 'ا',  label: 'آخر تنها / غیر اول', color: SEC[0] },
    ],
    examples: [
      { emoji: '💧', word: 'آب',     highlight: 'آ', pos: 'اول' },
      { emoji: '☀️', word: 'آفتاب', highlight: 'آ', pos: 'اول' },
      { emoji: '💨', word: 'باد',    highlight: 'ا', highlightColor: SEC[0], pos: 'وسط' },
      { emoji: '🌊', word: 'دریا',   highlight: 'ا', highlightColor: SEC[0], pos: 'آخر' },
    ],
  },

  // ── Unit 2 — ب  (blue, idx 1) ───────────────────────────────────────────
  'ب': {
    letter: 'ب', name: 'ب',
    description: 'دومین حرف الفبای فارسی',
    ...C.blue,
    forms: [
      { text: 'بـ',  label: 'اول کلمه',   color: '#2563EB' },
      { text: 'ـبـ', label: 'غیر اول',    color: SEC[1] },
      { text: 'ـب',  label: 'آخر چسبان',  color: SEC[1] },
      { text: 'ب',   label: 'آخر تنها',   color: '#2563EB' },
    ],
    examples: [
      { emoji: '🐐', word: 'بز',    highlight: 'ب', highlightColor: '#2563EB', pos: 'اول' },
      { emoji: '👨', word: 'بابا',  highlight: 'ب', highlightColor: '#2563EB', pos: 'اول' },
      { emoji: '📚', word: 'کتاب',  highlight: 'ب', pos: 'آخر' },
    ],
  },

  // ── Unit 3 — اَ  (rose, idx 2) ───────────────────────────────────────────
  'اَ': {
    letter: 'اَ', name: 'صدای اَ',
    description: 'صدای کوتاه «اَ» (فتحه) — روی حرف میاد',
    ...C.rose,
    forms: [
      { text: 'اَ',  label: 'اول کلمه',  color: '#E11D48' },
      { text: 'ـَـ', label: 'غیر اول',   color: SEC[2] },
      { text: 'ـَ',  label: 'آخر کلمه',  color: SEC[2] },
    ],
    examples: [
      { emoji: '🌿', word: 'سَر',  highlight: 'سَ', pos: 'اول' },
      { emoji: '🚪', word: 'دَر',  highlight: 'دَ', pos: 'اول' },
      { emoji: '💔', word: 'بَد',  highlight: 'بَ', pos: 'اول' },
    ],
  },

  // ── Unit 4 — د  (green, idx 3) ───────────────────────────────────────────
  'د': {
    letter: 'د', name: 'د',
    description: 'حرفی که در کلمه دریا هست',
    ...C.green,
    forms: [
      { text: 'د',  label: 'اول کلمه / آخر تنها', color: '#059669' },
      { text: 'ـد', label: 'غیر اول / آخر چسبان', color: SEC[3] },
    ],
    examples: [
      { emoji: '🌊', word: 'دریا',  highlight: 'د', pos: 'اول' },
      { emoji: '🌳', word: 'درخت',  highlight: 'د', pos: 'اول' },
      { emoji: '💨', word: 'باد',   highlight: 'د', pos: 'آخر' },
    ],
  },

  // ── Unit 5 — م  (purple, idx 4) ──────────────────────────────────────────
  'م': {
    letter: 'م', name: 'م',
    description: 'حرفی که در کلمه ماه هست',
    ...C.purple,
    forms: [
      { text: 'مـ',  label: 'اول کلمه',  color: '#7C3AED' },
      { text: 'ـمـ', label: 'غیر اول',   color: SEC[4] },
      { text: 'ـم',  label: 'آخر چسبان', color: SEC[4] },
      { text: 'م',   label: 'آخر تنها',  color: '#7C3AED' },
    ],
    examples: [
      { emoji: '🌙', word: 'ماه',    highlight: 'م', pos: 'اول' },
      { emoji: '👩', word: 'مامان',  highlight: 'م', pos: 'اول' },
      { emoji: '🕌', word: 'دام',    highlight: 'م', pos: 'آخر' },
    ],
  },

  // ── Unit 6 — س  (sky, idx 5) ─────────────────────────────────────────────
  'س': {
    letter: 'س', name: 'س',
    description: 'حرفی که در کلمه سیب هست',
    ...C.sky,
    forms: [
      { text: 'سـ',  label: 'اول کلمه',  color: '#0EA5E9' },
      { text: 'ـسـ', label: 'غیر اول',   color: SEC[5] },
      { text: 'ـس',  label: 'آخر چسبان', color: SEC[5] },
      { text: 'س',   label: 'آخر تنها',  color: '#0EA5E9' },
    ],
    examples: [
      { emoji: '🍎', word: 'سیب',    highlight: 'س', pos: 'اول' },
      { emoji: '⭐', word: 'ستاره',  highlight: 'س', pos: 'اول' },
      { emoji: '💨', word: 'نفس',    highlight: 'س', pos: 'آخر' },
    ],
  },

  // ── Unit 7 — ت  (orange, idx 6) ──────────────────────────────────────────
  'ت': {
    letter: 'ت', name: 'ت',
    description: 'حرفی که در کلمه توت هست',
    ...C.orange,
    forms: [
      { text: 'تـ',  label: 'اول کلمه',  color: '#EA580C' },
      { text: 'ـتـ', label: 'غیر اول',   color: SEC[6] },
      { text: 'ـت',  label: 'آخر چسبان', color: SEC[6] },
      { text: 'ت',   label: 'آخر تنها',  color: '#EA580C' },
    ],
    examples: [
      { emoji: '🫐', word: 'توت',   highlight: 'ت', pos: 'اول' },
      { emoji: '🌴', word: 'تاب',   highlight: 'ت', pos: 'اول' },
      { emoji: '🥛', word: 'ماست',  highlight: 'ت', pos: 'آخر' },
    ],
  },

  // ── Unit 8 — او  (emerald, idx 7) ────────────────────────────────────────
  'او': {
    letter: 'او', name: 'صدای او',
    description: 'صدای بلند «او» — مثل صدای گاو',
    ...C.emerald,
    forms: [
      { text: 'او',  label: 'اول کلمه',            color: '#10B981' },
      { text: 'ـو',  label: 'غیر اول / آخر چسبان', color: SEC[7] },
      { text: 'و',   label: 'آخر تنها',             color: SEC[7] },
    ],
    examples: [
      { emoji: '⚽', word: 'توپ',   highlight: 'و', pos: 'وسط' },
      { emoji: '☁️', word: 'دود',   highlight: 'و', pos: 'وسط' },
      { emoji: '🌅', word: 'روز',   highlight: 'و', pos: 'وسط' },
    ],
  },

  // ── Unit 9 — ر  (teal, idx 8) ────────────────────────────────────────────
  'ر': {
    letter: 'ر', name: 'ر',
    description: 'حرفی که در کلمه رنگ هست',
    ...C.teal,
    forms: [
      { text: 'ر',  label: 'اول کلمه / آخر تنها', color: '#0D9488' },
      { text: 'ـر', label: 'غیر اول / آخر چسبان', color: SEC[8] },
    ],
    examples: [
      { emoji: '🎨', word: 'رنگ',   highlight: 'ر', pos: 'اول' },
      { emoji: '🌧️', word: 'باران', highlight: 'ر', pos: 'وسط' },
      { emoji: '☁️',  word: 'ابر',   highlight: 'ر', pos: 'آخر' },
    ],
  },

  // ── Unit 10 — ن  (indigo, idx 9) ─────────────────────────────────────────
  'ن': {
    letter: 'ن', name: 'ن',
    description: 'حرفی که در کلمه نان هست',
    ...C.indigo,
    forms: [
      { text: 'نـ',  label: 'اول کلمه',  color: '#4F46E5' },
      { text: 'ـنـ', label: 'غیر اول',   color: SEC[9] },
      { text: 'ـن',  label: 'آخر چسبان', color: SEC[9] },
      { text: 'ن',   label: 'آخر تنها',  color: '#4F46E5' },
    ],
    examples: [
      { emoji: '🍞', word: 'نان',    highlight: 'ن', pos: 'اول' },
      { emoji: '🌧️', word: 'باران',  highlight: 'ن', pos: 'آخر' },
      { emoji: '💅', word: 'ناخن',   highlight: 'ن', pos: 'اول' },
    ],
  },

  // ── Unit 11 — ای  (pink, idx 10) ─────────────────────────────────────────
  'ای': {
    letter: 'ای', name: 'صدای ای',
    description: 'صدای بلند «ای» — مثل صدای سیب',
    ...C.pink,
    forms: [
      { text: 'ای',  label: 'اول کلمه',            color: '#DB2777' },
      { text: 'ـیـ', label: 'غیر اول',              color: SEC[10] },
      { text: 'ـی',  label: 'آخر چسبان / آخر تنها', color: SEC[10] },
    ],
    examples: [
      { emoji: '🍎', word: 'سیب',   highlight: 'ی', pos: 'وسط' },
      { emoji: '🏹', word: 'تیر',   highlight: 'ی', pos: 'وسط' },
      { emoji: '🎮', word: 'بازی',  highlight: 'ی', pos: 'آخر' },
    ],
  },

  // ── Unit 12 — ز  (lime, idx 11) ──────────────────────────────────────────
  'ز': {
    letter: 'ز', name: 'ز',
    description: 'حرفی که در کلمه زنبور هست',
    ...C.lime,
    forms: [
      { text: 'ز',  label: 'اول کلمه / آخر تنها', color: '#65A30D' },
      { text: 'ـز', label: 'غیر اول / آخر چسبان', color: SEC[11] },
    ],
    examples: [
      { emoji: '🐝', word: 'زنبور',  highlight: 'ز', pos: 'اول' },
      { emoji: '🟡', word: 'زرد',    highlight: 'ز', pos: 'اول' },
      { emoji: '🦅', word: 'باز',    highlight: 'ز', pos: 'آخر' },
    ],
  },

  // ── Unit 13 — اِ  (amber, idx 0) ─────────────────────────────────────────
  'اِ': {
    letter: 'اِ', name: 'صدای اِ',
    description: 'صدای کوتاه «اِ» (کسره) — زیر حرف میاد',
    ...C.amber,
    forms: [
      { text: 'اِ',  label: 'اول کلمه',  color: '#F59E0B' },
      { text: 'ـِـ', label: 'غیر اول',   color: SEC[0] },
      { text: 'ـه',  label: 'آخر چسبان', color: SEC[0] },
      { text: 'ه',   label: 'آخر تنها',  color: '#F59E0B' },
    ],
    examples: [
      { emoji: '❤️', word: 'دِل',    highlight: 'دِ', pos: 'اول' },
      { emoji: '📚', word: 'کِتاب',  highlight: 'کِ', pos: 'اول' },
      { emoji: '🌿', word: 'بِهار',  highlight: 'بِ', pos: 'اول' },
    ],
  },

  // ── Unit 14 — ش  (blue, idx 1) ───────────────────────────────────────────
  'ش': {
    letter: 'ش', name: 'ش',
    description: 'حرفی که در کلمه شیر هست',
    ...C.blue,
    forms: [
      { text: 'شـ',  label: 'اول کلمه',  color: '#2563EB' },
      { text: 'ـشـ', label: 'غیر اول',   color: SEC[1] },
      { text: 'ـش',  label: 'آخر چسبان', color: SEC[1] },
      { text: 'ش',   label: 'آخر تنها',  color: '#2563EB' },
    ],
    examples: [
      { emoji: '🦁', word: 'شیر',    highlight: 'ش', pos: 'اول' },
      { emoji: '😊', word: 'شادی',   highlight: 'ش', pos: 'اول' },
      { emoji: '🎨', word: 'نقاش',   highlight: 'ش', pos: 'آخر' },
    ],
  },

  // ── Unit 15 — ی  (rose, idx 2) ───────────────────────────────────────────
  'ی': {
    letter: 'ی', name: 'ی',
    description: 'حرفی که در کلمه یاد هست',
    ...C.rose,
    forms: [
      { text: 'یـ',  label: 'اول کلمه',  color: '#E11D48' },
      { text: 'ـیـ', label: 'غیر اول',   color: SEC[2] },
      { text: 'ـی',  label: 'آخر چسبان', color: SEC[2] },
      { text: 'ی',   label: 'آخر تنها',  color: '#E11D48' },
    ],
    examples: [
      { emoji: '🧠', word: 'یاد',   highlight: 'ی', pos: 'اول' },
      { emoji: '🍎', word: 'سیب',   highlight: 'ی', pos: 'وسط' },
      { emoji: '🎮', word: 'بازی',  highlight: 'ی', pos: 'آخر' },
    ],
  },

  // ── Unit 16 — اُ  (green, idx 3) ─────────────────────────────────────────
  'اُ': {
    letter: 'اُ', name: 'صدای اُ',
    description: 'صدای کوتاه «اُ» (ضمه) — روی حرف میاد',
    ...C.green,
    forms: [
      { text: 'اُ',  label: 'اول کلمه', color: '#059669' },
      { text: 'ـُـ', label: 'غیر اول',  color: SEC[3] },
      { text: 'ـُ',  label: 'آخر کلمه', color: SEC[3] },
    ],
    examples: [
      { emoji: '🌸', word: 'گُل',   highlight: 'گُ', pos: 'اول' },
      { emoji: '🌉', word: 'پُل',   highlight: 'پُ', pos: 'اول' },
      { emoji: '🐔', word: 'مُرغ',  highlight: 'مُ', pos: 'اول' },
    ],
  },

  // ── Unit 17 — ک  (purple, idx 4) ─────────────────────────────────────────
  'ک': {
    letter: 'ک', name: 'ک',
    description: 'حرفی که در کلمه کتاب هست',
    ...C.purple,
    forms: [
      { text: 'کـ',  label: 'اول کلمه',  color: '#7C3AED' },
      { text: 'ـکـ', label: 'غیر اول',   color: SEC[4] },
      { text: 'ـک',  label: 'آخر چسبان', color: SEC[4] },
      { text: 'ک',   label: 'آخر تنها',  color: '#7C3AED' },
    ],
    examples: [
      { emoji: '📚', word: 'کتاب', highlight: 'ک', pos: 'اول' },
      { emoji: '⛰️', word: 'کوه',  highlight: 'ک', pos: 'اول' },
      { emoji: '🐟', word: 'ماهک', highlight: 'ک', pos: 'آخر' },
    ],
  },

  // ── Unit 18 — و  (sky, idx 5) ────────────────────────────────────────────
  'و': {
    letter: 'و', name: 'و',
    description: 'حرفی که در کلمه وانت هست',
    ...C.sky,
    forms: [
      { text: 'و',  label: 'اول کلمه / آخر تنها', color: '#0EA5E9' },
      { text: 'ـو', label: 'غیر اول / آخر چسبان', color: SEC[5] },
    ],
    examples: [
      { emoji: '🚐', word: 'وانت',  highlight: 'و', pos: 'اول' },
      { emoji: '🌅', word: 'روز',   highlight: 'و', pos: 'وسط' },
      { emoji: '☁️',  word: 'دود',   highlight: 'و', pos: 'وسط' },
    ],
  },

  // ── Unit 19 — پ  (orange, idx 6) ─────────────────────────────────────────
  'پ': {
    letter: 'پ', name: 'پ',
    description: 'حرفی که در کلمه پدر هست',
    ...C.orange,
    forms: [
      { text: 'پـ',  label: 'اول کلمه',  color: '#EA580C' },
      { text: 'ـپـ', label: 'غیر اول',   color: SEC[6] },
      { text: 'ـپ',  label: 'آخر چسبان', color: SEC[6] },
      { text: 'پ',   label: 'آخر تنها',  color: '#EA580C' },
    ],
    examples: [
      { emoji: '👨', word: 'پدر',    highlight: 'پ', pos: 'اول' },
      { emoji: '🐦', word: 'پرنده',  highlight: 'پ', pos: 'اول' },
      { emoji: '🦋', word: 'پروانه', highlight: 'پ', pos: 'اول' },
    ],
  },

  // ── Unit 20 — گ  (emerald, idx 7) ────────────────────────────────────────
  'گ': {
    letter: 'گ', name: 'گ',
    description: 'حرفی که در کلمه گاو هست',
    ...C.emerald,
    forms: [
      { text: 'گـ',  label: 'اول کلمه',  color: '#10B981' },
      { text: 'ـگـ', label: 'غیر اول',   color: SEC[7] },
      { text: 'ـگ',  label: 'آخر چسبان', color: SEC[7] },
      { text: 'گ',   label: 'آخر تنها',  color: '#10B981' },
    ],
    examples: [
      { emoji: '🐄', word: 'گاو',   highlight: 'گ', pos: 'اول' },
      { emoji: '🐱', word: 'گربه',  highlight: 'گ', pos: 'اول' },
      { emoji: '🎨', word: 'رنگ',   highlight: 'گ', pos: 'آخر' },
    ],
  },

  // ── Unit 21 — ف  (teal, idx 8) ───────────────────────────────────────────
  'ف': {
    letter: 'ف', name: 'ف',
    description: 'حرفی که در کلمه فیل هست',
    ...C.teal,
    forms: [
      { text: 'فـ',  label: 'اول کلمه',  color: '#0D9488' },
      { text: 'ـفـ', label: 'غیر اول',   color: SEC[8] },
      { text: 'ـف',  label: 'آخر چسبان', color: SEC[8] },
      { text: 'ف',   label: 'آخر تنها',  color: '#0D9488' },
    ],
    examples: [
      { emoji: '🐘', word: 'فیل',   highlight: 'ف', pos: 'اول' },
      { emoji: '🏔️', word: 'فندق',  highlight: 'ف', pos: 'اول' },
      { emoji: '🌊', word: 'کف',    highlight: 'ف', pos: 'آخر' },
    ],
  },

  // ── Unit 22 — خ  (indigo, idx 9) ─────────────────────────────────────────
  'خ': {
    letter: 'خ', name: 'خ',
    description: 'حرفی که در کلمه خانه هست',
    ...C.indigo,
    forms: [
      { text: 'خـ',  label: 'اول کلمه',  color: '#4F46E5' },
      { text: 'ـخـ', label: 'غیر اول',   color: SEC[9] },
      { text: 'ـخ',  label: 'آخر چسبان', color: SEC[9] },
      { text: 'خ',   label: 'آخر تنها',  color: '#4F46E5' },
    ],
    examples: [
      { emoji: '🏠', word: 'خانه', highlight: 'خ', pos: 'اول' },
      { emoji: '🐻', word: 'خرس',  highlight: 'خ', pos: 'اول' },
      { emoji: '🦌', word: 'شاخ',  highlight: 'خ', pos: 'آخر' },
    ],
  },

  // ── Unit 23 — ق  (pink, idx 10) ──────────────────────────────────────────
  'ق': {
    letter: 'ق', name: 'ق',
    description: 'حرفی که در کلمه قلب هست',
    ...C.pink,
    forms: [
      { text: 'قـ',  label: 'اول کلمه',  color: '#DB2777' },
      { text: 'ـقـ', label: 'غیر اول',   color: SEC[10] },
      { text: 'ـق',  label: 'آخر چسبان', color: SEC[10] },
      { text: 'ق',   label: 'آخر تنها',  color: '#DB2777' },
    ],
    examples: [
      { emoji: '❤️', word: 'قلب',   highlight: 'ق', pos: 'اول' },
      { emoji: '🔴', word: 'قرمز',  highlight: 'ق', pos: 'اول' },
      { emoji: '🏠', word: 'اتاق',  highlight: 'ق', pos: 'آخر' },
    ],
  },

  // ── Unit 24 — ل  (lime, idx 11) ──────────────────────────────────────────
  'ل': {
    letter: 'ل', name: 'ل',
    description: 'حرفی که در کلمه لیمو هست',
    ...C.lime,
    forms: [
      { text: 'لـ',  label: 'اول کلمه',  color: '#65A30D' },
      { text: 'ـلـ', label: 'غیر اول',   color: SEC[11] },
      { text: 'ـل',  label: 'آخر چسبان', color: SEC[11] },
      { text: 'ل',   label: 'آخر تنها',  color: '#65A30D' },
    ],
    examples: [
      { emoji: '🍋', word: 'لیمو',  highlight: 'ل', pos: 'اول' },
      { emoji: '🐢', word: 'لاک',   highlight: 'ل', pos: 'اول' },
      { emoji: '🪁', word: 'بال',   highlight: 'ل', pos: 'آخر' },
    ],
  },

  // ── Unit 25 — ج  (amber, idx 0) ──────────────────────────────────────────
  'ج': {
    letter: 'ج', name: 'ج',
    description: 'حرفی که در کلمه جنگل هست',
    ...C.amber,
    forms: [
      { text: 'جـ',  label: 'اول کلمه',  color: '#F59E0B' },
      { text: 'ـجـ', label: 'غیر اول',   color: SEC[0] },
      { text: 'ـج',  label: 'آخر چسبان', color: SEC[0] },
      { text: 'ج',   label: 'آخر تنها',  color: '#F59E0B' },
    ],
    examples: [
      { emoji: '🌲', word: 'جنگل',  highlight: 'ج', pos: 'اول' },
      { emoji: '🐣', word: 'جوجه',  highlight: 'ج', pos: 'اول' },
      { emoji: '🏰', word: 'برج',   highlight: 'ج', pos: 'آخر' },
    ],
  },

  // ── Unit 26 — ـُ استثنا  (blue, idx 1) ───────────────────────────────────
  'ـُ استثنا': {
    letter: 'ـُ', name: 'اُ استثنا',
    description: 'گاهی حرف «و» صدای «اُ» میده بدون علامت',
    ...C.blue,
    examples: [
      { emoji: '🙏', word: 'خُدا',   highlight: 'خُ', pos: 'اول' },
      { emoji: '💫', word: 'نُقطه',  highlight: 'نُ', pos: 'اول' },
      { emoji: '📖', word: 'سُوره',  highlight: 'سُ', pos: 'اول' },
    ],
  },

  // ── Unit 27 — ه  (rose, idx 2) ───────────────────────────────────────────
  'ه': {
    letter: 'ه', name: 'ه',
    description: 'حرفی که در کلمه هوا هست',
    ...C.rose,
    forms: [
      { text: 'هـ',  label: 'اول کلمه',  color: '#E11D48' },
      { text: 'ـهـ', label: 'غیر اول',   color: SEC[2] },
      { text: 'ـه',  label: 'آخر چسبان', color: SEC[2] },
      { text: 'ه',   label: 'آخر تنها',  color: '#E11D48' },
    ],
    examples: [
      { emoji: '🌬️', word: 'هوا',     highlight: 'ه', pos: 'اول' },
      { emoji: '🍉',  word: 'هندوانه', highlight: 'ه', pos: 'اول' },
      { emoji: '🌙',  word: 'ماه',     highlight: 'ه', pos: 'آخر' },
    ],
  },

  // ── Unit 28 — چ  (green, idx 3) ──────────────────────────────────────────
  'چ': {
    letter: 'چ', name: 'چ',
    description: 'حرفی که در کلمه چشم هست',
    ...C.green,
    forms: [
      { text: 'چـ',  label: 'اول کلمه',  color: '#059669' },
      { text: 'ـچـ', label: 'غیر اول',   color: SEC[3] },
      { text: 'ـچ',  label: 'آخر چسبان', color: SEC[3] },
      { text: 'چ',   label: 'آخر تنها',  color: '#059669' },
    ],
    examples: [
      { emoji: '👁️', word: 'چشم',  highlight: 'چ', pos: 'اول' },
      { emoji: '☂️',  word: 'چتر',  highlight: 'چ', pos: 'اول' },
      { emoji: '🚫',  word: 'هیچ',  highlight: 'چ', pos: 'آخر' },
    ],
  },

  // ── Unit 29 — ژ  (purple, idx 4) ─────────────────────────────────────────
  'ژ': {
    letter: 'ژ', name: 'ژ',
    description: 'حرفی که در کلمه ژله هست',
    ...C.purple,
    forms: [
      { text: 'ژ',  label: 'اول کلمه / آخر تنها', color: '#7C3AED' },
      { text: 'ـژ', label: 'غیر اول / آخر چسبان', color: SEC[4] },
    ],
    examples: [
      { emoji: '🍮', word: 'ژله',   highlight: 'ژ', pos: 'اول' },
      { emoji: '🧥', word: 'ژاکت',  highlight: 'ژ', pos: 'اول' },
      { emoji: '🌸', word: 'ژیلا',  highlight: 'ژ', pos: 'اول' },
    ],
  },

  // ── Unit 30 — خوا  (sky, idx 5) ──────────────────────────────────────────
  'خوا': {
    letter: 'خوا', name: 'خوا',
    description: '«خوا» مثل «خا» خونده میشه',
    ...C.sky,
    examples: [
      { emoji: '😴', word: 'خواب',    highlight: 'خ', pos: 'اول' },
      { emoji: '👧', word: 'خواهر',   highlight: 'خ', pos: 'اول' },
      { emoji: '🙏', word: 'خواستن',  highlight: 'خ', pos: 'اول' },
    ],
  },

  // ── Unit 31 — تشدید  (orange, idx 6) ─────────────────────────────────────
  'تشدید': {
    letter: 'ّ', name: 'تشدید',
    description: 'تشدید یعنی صدا را دو بار بگو',
    ...C.orange,
    examples: [
      { emoji: '🐯', word: 'ببر',    highlight: 'ب', pos: 'اول' },
      { emoji: '🛁', word: 'حمّام',  highlight: 'م', pos: 'وسط' },
      { emoji: '🌡️', word: 'تبّت',  highlight: 'ب', pos: 'وسط' },
    ],
  },

  // ── Unit 32 — ص  (emerald, idx 7) ────────────────────────────────────────
  'ص': {
    letter: 'ص', name: 'ص',
    description: 'حرفی که در کلمه صبح هست',
    ...C.emerald,
    forms: [
      { text: 'صـ',  label: 'اول کلمه',  color: '#10B981' },
      { text: 'ـصـ', label: 'غیر اول',   color: SEC[7] },
      { text: 'ـص',  label: 'آخر چسبان', color: SEC[7] },
      { text: 'ص',   label: 'آخر تنها',  color: '#10B981' },
    ],
    examples: [
      { emoji: '🌄', word: 'صبح',   highlight: 'ص', pos: 'اول' },
      { emoji: '✅', word: 'صادق',  highlight: 'ص', pos: 'اول' },
      { emoji: '💫', word: 'خاص',   highlight: 'ص', pos: 'آخر' },
    ],
  },

  // ── Unit 33 — ذ  (teal, idx 8) ───────────────────────────────────────────
  'ذ': {
    letter: 'ذ', name: 'ذ',
    description: 'حرفی که در کلمه ذرت هست',
    ...C.teal,
    forms: [
      { text: 'ذ',  label: 'اول کلمه / آخر تنها', color: '#0D9488' },
      { text: 'ـذ', label: 'غیر اول / آخر چسبان', color: SEC[8] },
    ],
    examples: [
      { emoji: '🌽', word: 'ذرت',   highlight: 'ذ', pos: 'اول' },
      { emoji: '🧠', word: 'ذهن',   highlight: 'ذ', pos: 'اول' },
      { emoji: '⚡', word: 'لذت',   highlight: 'ذ', pos: 'وسط' },
    ],
  },

  // ── Unit 34 — ع  (indigo, idx 9) ─────────────────────────────────────────
  'ع': {
    letter: 'ع', name: 'ع',
    description: 'حرفی که در کلمه عروس هست',
    ...C.indigo,
    forms: [
      { text: 'عـ',  label: 'اول کلمه',  color: '#4F46E5' },
      { text: 'ـعـ', label: 'غیر اول',   color: SEC[9] },
      { text: 'ـع',  label: 'آخر چسبان', color: SEC[9] },
      { text: 'ع',   label: 'آخر تنها',  color: '#4F46E5' },
    ],
    examples: [
      { emoji: '👰', word: 'عروس',  highlight: 'ع', pos: 'اول' },
      { emoji: '🚩', word: 'علم',   highlight: 'ع', pos: 'اول' },
      { emoji: '➕', word: 'جمع',   highlight: 'ع', pos: 'آخر' },
    ],
  },

  // ── Unit 35 — ث  (pink, idx 10) ──────────────────────────────────────────
  'ث': {
    letter: 'ث', name: 'ث',
    description: 'حرفی که مثل «س» خونده میشه',
    ...C.pink,
    forms: [
      { text: 'ثـ',  label: 'اول کلمه',  color: '#DB2777' },
      { text: 'ـثـ', label: 'غیر اول',   color: SEC[10] },
      { text: 'ـث',  label: 'آخر چسبان', color: SEC[10] },
      { text: 'ث',   label: 'آخر تنها',  color: '#DB2777' },
    ],
    examples: [
      { emoji: '💰', word: 'ثروت',  highlight: 'ث', pos: 'اول' },
      { emoji: '📌', word: 'ثابت',  highlight: 'ث', pos: 'اول' },
      { emoji: '🔬', word: 'بحث',   highlight: 'ث', pos: 'آخر' },
    ],
  },

  // ── Unit 36 — ح  (lime, idx 11) ──────────────────────────────────────────
  'ح': {
    letter: 'ح', name: 'ح',
    description: 'حرفی که در کلمه حیوان هست',
    ...C.lime,
    forms: [
      { text: 'حـ',  label: 'اول کلمه',  color: '#65A30D' },
      { text: 'ـحـ', label: 'غیر اول',   color: SEC[11] },
      { text: 'ـح',  label: 'آخر چسبان', color: SEC[11] },
      { text: 'ح',   label: 'آخر تنها',  color: '#65A30D' },
    ],
    examples: [
      { emoji: '🐾', word: 'حیوان', highlight: 'ح', pos: 'اول' },
      { emoji: '💬', word: 'حرف',   highlight: 'ح', pos: 'اول' },
      { emoji: '🌄', word: 'صبح',   highlight: 'ح', pos: 'آخر' },
    ],
  },

  // ── Unit 37 — ض  (amber, idx 0) ──────────────────────────────────────────
  'ض': {
    letter: 'ض', name: 'ض',
    description: 'حرفی که مثل «ز» خونده میشه',
    ...C.amber,
    forms: [
      { text: 'ضـ',  label: 'اول کلمه',  color: '#F59E0B' },
      { text: 'ـضـ', label: 'غیر اول',   color: SEC[0] },
      { text: 'ـض',  label: 'آخر چسبان', color: SEC[0] },
      { text: 'ض',   label: 'آخر تنها',  color: '#F59E0B' },
    ],
    examples: [
      { emoji: '🎯', word: 'ضربه',  highlight: 'ض', pos: 'اول' },
      { emoji: '⚪', word: 'ضعیف',  highlight: 'ض', pos: 'اول' },
      { emoji: '🏋️', word: 'ورزش',  highlight: 'ض', pos: 'وسط' },
    ],
  },

  // ── Unit 38 — ط  (blue, idx 1) ───────────────────────────────────────────
  'ط': {
    letter: 'ط', name: 'ط',
    description: 'حرفی که در کلمه طوطی هست',
    ...C.blue,
    forms: [
      { text: 'طـ',  label: 'اول کلمه',  color: '#2563EB' },
      { text: 'ـطـ', label: 'غیر اول',   color: SEC[1] },
      { text: 'ـط',  label: 'آخر چسبان', color: SEC[1] },
      { text: 'ط',   label: 'آخر تنها',  color: '#2563EB' },
    ],
    examples: [
      { emoji: '🦜', word: 'طوطی',   highlight: 'ط', pos: 'اول' },
      { emoji: '🌿', word: 'طبیعت',  highlight: 'ط', pos: 'اول' },
      { emoji: '✏️', word: 'خط',     highlight: 'ط', pos: 'آخر' },
    ],
  },

  // ── Unit 39 — غ  (rose, idx 2) ───────────────────────────────────────────
  'غ': {
    letter: 'غ', name: 'غ',
    description: 'حرفی که در کلمه غذا هست',
    ...C.rose,
    forms: [
      { text: 'غـ',  label: 'اول کلمه',  color: '#E11D48' },
      { text: 'ـغـ', label: 'غیر اول',   color: SEC[2] },
      { text: 'ـغ',  label: 'آخر چسبان', color: SEC[2] },
      { text: 'غ',   label: 'آخر تنها',  color: '#E11D48' },
    ],
    examples: [
      { emoji: '🍽️', word: 'غذا',  highlight: 'غ', pos: 'اول' },
      { emoji: '👹', word: 'غول',   highlight: 'غ', pos: 'اول' },
      { emoji: '🌳', word: 'باغ',   highlight: 'غ', pos: 'آخر' },
    ],
  },

  // ── Unit 40 — ظ  (green, idx 3) ──────────────────────────────────────────
  'ظ': {
    letter: 'ظ', name: 'ظ',
    description: 'حرفی که مثل «ز» خونده میشه',
    ...C.green,
    forms: [
      { text: 'ظـ',  label: 'اول کلمه',  color: '#059669' },
      { text: 'ـظـ', label: 'غیر اول',   color: SEC[3] },
      { text: 'ـظ',  label: 'آخر چسبان', color: SEC[3] },
      { text: 'ظ',   label: 'آخر تنها',  color: '#059669' },
    ],
    examples: [
      { emoji: '🦁', word: 'ظالم',   highlight: 'ظ', pos: 'اول' },
      { emoji: '👁️', word: 'ظاهر',   highlight: 'ظ', pos: 'اول' },
      { emoji: '📜', word: 'لفظ',    highlight: 'ظ', pos: 'آخر' },
    ],
  },
};
