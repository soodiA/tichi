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
  pos: string;
}

export interface UnitIntroData {
  letter: string;
  name: string;
  description: string;
  accent: string;
  bg: string;
  forms?: LetterForm[];
  examples: WordExample[];
}

// 12-color palette — unit ord cycles: (ord-1) % 12
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

// Secondary contrast colors per palette index
const SEC = ['#10B981','#EA580C','#0D9488','#DB2777','#65A30D','#4F46E5',
             '#2563EB','#F59E0B','#E11D48','#0EA5E9','#059669','#7C3AED'];

export const UNIT_INTROS: Record<string, UnitIntroData> = {

  // ── 1 ─ آ  (amber) ───────────────────────────────────────────────────────
  'آ': {
    letter: 'آ', name: 'آ',
    description: 'اولین حرف الفبای فارسی',
    ...C.amber,
    forms: [
      { text: 'آ', label: 'اول',     color: '#F59E0B' },
      { text: 'ا', label: 'غیر اول', color: SEC[0] },
    ],
    examples: [
      { emoji: '💧', word: 'آب',    highlight: 'آ', pos: 'اول' },
      { emoji: '☀️', word: 'آفتاب', highlight: 'آ', pos: 'اول' },
      { emoji: '💨', word: 'باد',   highlight: 'ا', highlightColor: SEC[0], pos: 'وسط' },
      { emoji: '🌊', word: 'دریا',  highlight: 'ا', highlightColor: SEC[0], pos: 'آخر' },
    ],
  },

  // ── 2 ─ ب  (blue) ────────────────────────────────────────────────────────
  'ب': {
    letter: 'ب', name: 'ب',
    description: 'دومین حرف الفبای فارسی',
    ...C.blue,
    forms: [
      { text: 'بـ', label: 'غیر آخر', color: '#2563EB' },
      { text: 'ب',  label: 'آخر',     color: SEC[1] },
    ],
    examples: [
      { emoji: '🐐', word: 'بز',   highlight: 'ب', pos: 'اول' },
      { emoji: '👨', word: 'بابا', highlight: 'ب', pos: 'اول' },
      { emoji: '📚', word: 'کتاب', highlight: 'ب', pos: 'آخر' },
    ],
  },

  // ── 3 ─ اَ  (rose) ────────────────────────────────────────────────────────
  'اَ': {
    letter: 'اَ', name: 'صدای اَ',
    description: 'صدای کوتاه «اَ» (فتحه) — روی حرف میاد',
    ...C.rose,
    forms: [
      { text: 'اَ',  label: 'اول',     color: '#E11D48' },
      { text: 'ـَـ', label: 'غیر اول', color: SEC[2] },
    ],
    examples: [
      { emoji: '🌿', word: 'سَر', highlight: 'سَ', pos: 'اول' },
      { emoji: '🚪', word: 'دَر', highlight: 'دَ', pos: 'اول' },
      { emoji: '🐑', word: 'بَره', highlight: 'بَ', pos: 'اول' },
    ],
  },

  // ── 4 ─ د  (green) ────────────────────────────────────────────────────────
  'د': {
    letter: 'د', name: 'د',
    description: 'حرفی که در کلمه دریا هست',
    ...C.green,
    forms: [
      { text: 'د', label: 'تنها', color: '#059669' },
    ],
    examples: [
      { emoji: '🌊', word: 'دریا',  highlight: 'د', pos: 'اول' },
      { emoji: '🌳', word: 'درخت',  highlight: 'د', pos: 'اول' },
      { emoji: '💨', word: 'باد',   highlight: 'د', pos: 'آخر' },
    ],
  },

  // ── 5 ─ م  (purple) ───────────────────────────────────────────────────────
  'م': {
    letter: 'م', name: 'م',
    description: 'حرفی که در کلمه ماه هست',
    ...C.purple,
    forms: [
      { text: 'مـ', label: 'غیر آخر', color: '#7C3AED' },
      { text: 'م',  label: 'آخر',     color: SEC[4] },
    ],
    examples: [
      { emoji: '🌙', word: 'ماه',   highlight: 'م', pos: 'اول' },
      { emoji: '👩', word: 'مامان', highlight: 'م', pos: 'اول' },
      { emoji: '🕌', word: 'دام',   highlight: 'م', pos: 'آخر' },
    ],
  },

  // ── 6 ─ س  (sky) ─────────────────────────────────────────────────────────
  'س': {
    letter: 'س', name: 'س',
    description: 'حرفی که در کلمه سیب هست',
    ...C.sky,
    forms: [
      { text: 'سـ', label: 'غیر آخر', color: '#0EA5E9' },
      { text: 'س',  label: 'آخر',     color: SEC[5] },
    ],
    examples: [
      { emoji: '🍎', word: 'سیب',   highlight: 'س', pos: 'اول' },
      { emoji: '⭐', word: 'ستاره', highlight: 'س', pos: 'اول' },
      { emoji: '💨', word: 'نفس',   highlight: 'س', pos: 'آخر' },
    ],
  },

  // ── 7 ─ ت  (orange) ───────────────────────────────────────────────────────
  'ت': {
    letter: 'ت', name: 'ت',
    description: 'حرفی که در کلمه توت هست',
    ...C.orange,
    forms: [
      { text: 'تـ', label: 'غیر آخر', color: '#EA580C' },
      { text: 'ت',  label: 'آخر',     color: SEC[6] },
    ],
    examples: [
      { emoji: '🫐', word: 'توت',  highlight: 'ت', pos: 'اول' },
      { emoji: '🌴', word: 'تاب',  highlight: 'ت', pos: 'اول' },
      { emoji: '🥛', word: 'ماست', highlight: 'ت', pos: 'آخر' },
    ],
  },

  // ── 8 ─ او  (emerald) ─────────────────────────────────────────────────────
  'او': {
    letter: 'او', name: 'صدای او',
    description: 'صدای بلند «او» — مثل صدای توت',
    ...C.emerald,
    forms: [
      { text: 'او', label: 'اول',     color: '#10B981' },
      { text: 'و',  label: 'غیر اول', color: SEC[7] },
    ],
    examples: [
      { emoji: '⚽', word: 'توپ', highlight: 'و', pos: 'وسط' },
      { emoji: '☁️', word: 'دود', highlight: 'و', pos: 'وسط' },
      { emoji: '🌅', word: 'روز', highlight: 'و', pos: 'وسط' },
    ],
  },

  // ── 9 ─ ر  (teal) ────────────────────────────────────────────────────────
  'ر': {
    letter: 'ر', name: 'ر',
    description: 'حرفی که در کلمه رنگ هست',
    ...C.teal,
    forms: [
      { text: 'ر', label: 'تنها', color: '#0D9488' },
    ],
    examples: [
      { emoji: '🎨', word: 'رنگ',  highlight: 'ر', pos: 'اول' },
      { emoji: '🌧️', word: 'باران', highlight: 'ر', pos: 'وسط' },
      { emoji: '☁️',  word: 'ابر',  highlight: 'ر', pos: 'آخر' },
    ],
  },

  // ── 10 ─ ن  (indigo) ─────────────────────────────────────────────────────
  'ن': {
    letter: 'ن', name: 'ن',
    description: 'حرفی که در کلمه نان هست',
    ...C.indigo,
    forms: [
      { text: 'نـ', label: 'غیر آخر', color: '#4F46E5' },
      { text: 'ن',  label: 'آخر',     color: SEC[9] },
    ],
    examples: [
      { emoji: '🍞', word: 'نان',   highlight: 'ن', pos: 'اول' },
      { emoji: '🌧️', word: 'باران', highlight: 'ن', pos: 'آخر' },
      { emoji: '💅', word: 'ناخن',  highlight: 'ن', pos: 'اول' },
    ],
  },

  // ── 11 ─ ای  (pink) ───────────────────────────────────────────────────────
  'ای': {
    letter: 'ای', name: 'صدای ای',
    description: 'صدای بلند «ای» — چهار شکل داره',
    ...C.pink,
    forms: [
      { text: 'ایـ', label: 'اول',       color: '#DB2777' },
      { text: 'یـ',  label: 'وسط',       color: SEC[10] },
      { text: 'ی',   label: 'آخر',       color: SEC[10] },
      { text: 'ای',  label: 'آخر تنها',  color: '#DB2777' },
    ],
    examples: [
      { emoji: '🇮🇷', word: 'ایران',    highlight: 'ای', pos: 'اول' },
      { emoji: '👩',  word: 'سیما',     highlight: 'ی',  pos: 'وسط' },
      { emoji: '💧',  word: 'آبی',      highlight: 'ی',  pos: 'آخر' },
      { emoji: '⭐',  word: 'ستاره‌ای', highlight: 'ای', pos: 'آخر' },
    ],
  },

  // ── 12 ─ ز  (lime) ────────────────────────────────────────────────────────
  'ز': {
    letter: 'ز', name: 'ز',
    description: 'حرفی که در کلمه زنبور هست',
    ...C.lime,
    forms: [
      { text: 'ز', label: 'تنها', color: '#65A30D' },
    ],
    examples: [
      { emoji: '🐝', word: 'زنبور', highlight: 'ز', pos: 'اول' },
      { emoji: '🟡', word: 'زرد',   highlight: 'ز', pos: 'اول' },
      { emoji: '🦅', word: 'باز',   highlight: 'ز', pos: 'آخر' },
    ],
  },

  // ── 13 ─ اِ  (amber) ──────────────────────────────────────────────────────
  'اِ': {
    letter: 'اِ', name: 'صدای اِ',
    description: 'صدای کوتاه «اِ» (کسره) — روی حرف یا ته کلمه',
    ...C.amber,
    forms: [
      { text: 'اِ',  label: 'اول',         color: '#F59E0B' },
      { text: 'ـِ',  label: 'غیر اول',     color: SEC[0] },
      { text: 'ـه',  label: 'آخر چسبان',   color: SEC[0] },
      { text: 'ه',   label: 'آخر تنها',    color: '#F59E0B' },
    ],
    examples: [
      { emoji: '❤️', word: 'دِل',   highlight: 'دِ', pos: 'اول' },
      { emoji: '📚', word: 'کِتاب', highlight: 'کِ', pos: 'اول' },
      { emoji: '🌿', word: 'بِهار', highlight: 'بِ', pos: 'اول' },
    ],
  },

  // ── 14 ─ ش  (blue) ────────────────────────────────────────────────────────
  'ش': {
    letter: 'ش', name: 'ش',
    description: 'حرفی که در کلمه شیر هست',
    ...C.blue,
    forms: [
      { text: 'شـ', label: 'غیر آخر', color: '#2563EB' },
      { text: 'ش',  label: 'آخر',     color: SEC[1] },
    ],
    examples: [
      { emoji: '🦁', word: 'شیر',  highlight: 'ش', pos: 'اول' },
      { emoji: '😊', word: 'شادی', highlight: 'ش', pos: 'اول' },
      { emoji: '🎨', word: 'نقاش', highlight: 'ش', pos: 'آخر' },
    ],
  },

  // ── 15 ─ ی  (rose) ────────────────────────────────────────────────────────
  'ی': {
    letter: 'ی', name: 'ی',
    description: 'حرفی که در کلمه یاس هست',
    ...C.rose,
    forms: [
      { text: 'یـ', label: 'غیر اول', color: '#E11D48' },
      { text: 'ی',  label: 'آخر',     color: SEC[2] },
    ],
    examples: [
      { emoji: '🌸', word: 'یاس',  highlight: 'ی', pos: 'اول' },
      { emoji: '🍎', word: 'سیب',  highlight: 'ی', pos: 'وسط' },
      { emoji: '🎮', word: 'بازی', highlight: 'ی', pos: 'آخر' },
    ],
  },

  // ── 16 ─ اُ  (green) ──────────────────────────────────────────────────────
  'اُ': {
    letter: 'اُ', name: 'صدای اُ',
    description: 'صدای کوتاه «اُ» (ضمه) — روی حرف میاد',
    ...C.green,
    forms: [
      { text: 'اُ',  label: 'اول',     color: '#059669' },
      { text: 'ـُـ', label: 'غیر اول', color: SEC[3] },
    ],
    examples: [
      { emoji: '🌸', word: 'گُل',  highlight: 'گُ', pos: 'اول' },
      { emoji: '🌉', word: 'پُل',  highlight: 'پُ', pos: 'اول' },
      { emoji: '🐔', word: 'مُرغ', highlight: 'مُ', pos: 'اول' },
    ],
  },

  // ── 17 ─ ک  (purple) ──────────────────────────────────────────────────────
  'ک': {
    letter: 'ک', name: 'ک',
    description: 'حرفی که در کلمه کتاب هست',
    ...C.purple,
    forms: [
      { text: 'کـ', label: 'غیر آخر', color: '#7C3AED' },
      { text: 'ک',  label: 'آخر',     color: SEC[4] },
    ],
    examples: [
      { emoji: '📚', word: 'کتاب', highlight: 'ک', pos: 'اول' },
      { emoji: '⛰️', word: 'کوه',  highlight: 'ک', pos: 'اول' },
      { emoji: '🐟', word: 'ماهک', highlight: 'ک', pos: 'آخر' },
    ],
  },

  // ── 18 ─ و  (sky) ─────────────────────────────────────────────────────────
  'و': {
    letter: 'و', name: 'و',
    description: 'حرفی که در کلمه وَرزِش هست',
    ...C.sky,
    forms: [
      { text: 'و', label: 'تنها', color: '#0EA5E9' },
    ],
    examples: [
      { emoji: '🏋️', word: 'وَرزِش', highlight: 'و', pos: 'اول' },
      { emoji: '🌅', word: 'روز',    highlight: 'و', pos: 'وسط' },
      { emoji: '☁️',  word: 'دود',    highlight: 'و', pos: 'وسط' },
    ],
  },

  // ── 19 ─ پ  (orange) ──────────────────────────────────────────────────────
  'پ': {
    letter: 'پ', name: 'پ',
    description: 'حرفی که در کلمه پدر هست',
    ...C.orange,
    forms: [
      { text: 'پـ', label: 'غیر آخر', color: '#EA580C' },
      { text: 'پ',  label: 'آخر',     color: SEC[6] },
    ],
    examples: [
      { emoji: '👨', word: 'پدر',   highlight: 'پ', pos: 'اول' },
      { emoji: '🐦', word: 'پرنده', highlight: 'پ', pos: 'اول' },
      { emoji: '🦋', word: 'پروانه', highlight: 'پ', pos: 'اول' },
    ],
  },

  // ── 20 ─ گ  (emerald) ─────────────────────────────────────────────────────
  'گ': {
    letter: 'گ', name: 'گ',
    description: 'حرفی که در کلمه گاو هست',
    ...C.emerald,
    forms: [
      { text: 'گـ', label: 'غیر آخر', color: '#10B981' },
      { text: 'گ',  label: 'آخر',     color: SEC[7] },
    ],
    examples: [
      { emoji: '🐄', word: 'گاو',  highlight: 'گ', pos: 'اول' },
      { emoji: '🐱', word: 'گربه', highlight: 'گ', pos: 'اول' },
      { emoji: '🎨', word: 'رنگ',  highlight: 'گ', pos: 'آخر' },
    ],
  },

  // ── 21 ─ ف  (teal) ────────────────────────────────────────────────────────
  'ف': {
    letter: 'ف', name: 'ف',
    description: 'حرفی که در کلمه فیل هست',
    ...C.teal,
    forms: [
      { text: 'فـ', label: 'غیر آخر', color: '#0D9488' },
      { text: 'ف',  label: 'آخر',     color: SEC[8] },
    ],
    examples: [
      { emoji: '🐘', word: 'فیل',  highlight: 'ف', pos: 'اول' },
      { emoji: '🏔️', word: 'فندق', highlight: 'ف', pos: 'اول' },
      { emoji: '🌊', word: 'کف',   highlight: 'ف', pos: 'آخر' },
    ],
  },

  // ── 22 ─ خ  (indigo) ──────────────────────────────────────────────────────
  'خ': {
    letter: 'خ', name: 'خ',
    description: 'حرفی که در کلمه خانه هست',
    ...C.indigo,
    forms: [
      { text: 'خـ', label: 'غیر آخر', color: '#4F46E5' },
      { text: 'خ',  label: 'آخر',     color: SEC[9] },
    ],
    examples: [
      { emoji: '🏠', word: 'خانه', highlight: 'خ', pos: 'اول' },
      { emoji: '🐻', word: 'خرس',  highlight: 'خ', pos: 'اول' },
      { emoji: '🦌', word: 'شاخ',  highlight: 'خ', pos: 'آخر' },
    ],
  },

  // ── 23 ─ ق  (pink) ────────────────────────────────────────────────────────
  'ق': {
    letter: 'ق', name: 'ق',
    description: 'حرفی که در کلمه قلب هست',
    ...C.pink,
    forms: [
      { text: 'قـ', label: 'غیر آخر', color: '#DB2777' },
      { text: 'ق',  label: 'آخر',     color: SEC[10] },
    ],
    examples: [
      { emoji: '❤️', word: 'قلب',  highlight: 'ق', pos: 'اول' },
      { emoji: '🔴', word: 'قرمز', highlight: 'ق', pos: 'اول' },
      { emoji: '🏠', word: 'اتاق', highlight: 'ق', pos: 'آخر' },
    ],
  },

  // ── 24 ─ ل  (lime) ────────────────────────────────────────────────────────
  'ل': {
    letter: 'ل', name: 'ل',
    description: 'حرفی که در کلمه لیمو هست',
    ...C.lime,
    forms: [
      { text: 'لـ', label: 'غیر آخر', color: '#65A30D' },
      { text: 'ل',  label: 'آخر',     color: SEC[11] },
    ],
    examples: [
      { emoji: '🍋', word: 'لیمو', highlight: 'ل', pos: 'اول' },
      { emoji: '🐢', word: 'لاک',  highlight: 'ل', pos: 'اول' },
      { emoji: '🪁', word: 'بال',  highlight: 'ل', pos: 'آخر' },
    ],
  },

  // ── 25 ─ ج  (amber) ───────────────────────────────────────────────────────
  'ج': {
    letter: 'ج', name: 'ج',
    description: 'حرفی که در کلمه جنگل هست',
    ...C.amber,
    forms: [
      { text: 'جـ', label: 'غیر آخر', color: '#F59E0B' },
      { text: 'ج',  label: 'آخر',     color: SEC[0] },
    ],
    examples: [
      { emoji: '🌲', word: 'جنگل', highlight: 'ج', pos: 'اول' },
      { emoji: '🐣', word: 'جوجه', highlight: 'ج', pos: 'اول' },
      { emoji: '🏰', word: 'برج',  highlight: 'ج', pos: 'آخر' },
    ],
  },

  // ── 26 ─ ـُ استثنا  (blue) ────────────────────────────────────────────────
  'ـُ استثنا': {
    letter: 'و', name: 'اُ استثنا',
    description: 'گاهی «و» صدای «اُ» میده بدون علامت — مثل خورشید، نوک، دو',
    ...C.blue,
    examples: [
      { emoji: '☀️', word: 'خورشید', highlight: 'و', pos: 'وسط' },
      { emoji: '✏️', word: 'نوک',    highlight: 'و', pos: 'وسط' },
      { emoji: '2️⃣', word: 'دو',     highlight: 'و', pos: 'آخر' },
    ],
  },

  // ── 27 ─ ه  (rose) ────────────────────────────────────────────────────────
  'ه': {
    letter: 'ه', name: 'ه',
    description: 'حرفی که در کلمه هوا هست',
    ...C.rose,
    forms: [
      { text: 'هـ',  label: 'اول',         color: '#E11D48' },
      { text: 'ـهـ', label: 'وسط',         color: SEC[2] },
      { text: 'ـه',  label: 'آخر چسبان',   color: SEC[2] },
      { text: 'ه',   label: 'آخر تنها',    color: '#E11D48' },
    ],
    examples: [
      { emoji: '🌬️', word: 'هوا',     highlight: 'ه', pos: 'اول' },
      { emoji: '🍉',  word: 'هندوانه', highlight: 'ه', pos: 'اول' },
      { emoji: '🌙',  word: 'ماه',     highlight: 'ه', pos: 'آخر' },
    ],
  },

  // ── 28 ─ چ  (green) ───────────────────────────────────────────────────────
  'چ': {
    letter: 'چ', name: 'چ',
    description: 'حرفی که در کلمه چشم هست',
    ...C.green,
    forms: [
      { text: 'چـ', label: 'غیر آخر', color: '#059669' },
      { text: 'چ',  label: 'آخر',     color: SEC[3] },
    ],
    examples: [
      { emoji: '👁️', word: 'چشم', highlight: 'چ', pos: 'اول' },
      { emoji: '☂️',  word: 'چتر', highlight: 'چ', pos: 'اول' },
      { emoji: '🚫',  word: 'هیچ', highlight: 'چ', pos: 'آخر' },
    ],
  },

  // ── 29 ─ ژ  (purple) ──────────────────────────────────────────────────────
  'ژ': {
    letter: 'ژ', name: 'ژ',
    description: 'حرفی که در کلمه ژله هست',
    ...C.purple,
    forms: [
      { text: 'ژ', label: 'تنها', color: '#7C3AED' },
    ],
    examples: [
      { emoji: '🍮', word: 'ژله',  highlight: 'ژ', pos: 'اول' },
      { emoji: '🧥', word: 'ژاکت', highlight: 'ژ', pos: 'اول' },
      { emoji: '🌸', word: 'ژیلا', highlight: 'ژ', pos: 'اول' },
    ],
  },

  // ── 30 ─ خوا  (sky) ───────────────────────────────────────────────────────
  'خوا': {
    letter: 'خوا', name: 'خوا',
    description: '«خوا» مثل «خا» خونده میشه — مثل خواهر، خواب',
    ...C.sky,
    examples: [
      { emoji: '😴', word: 'خواب',   highlight: 'خ', pos: 'اول' },
      { emoji: '👧', word: 'خواهر',  highlight: 'خ', pos: 'اول' },
      { emoji: '🙏', word: 'خواستن', highlight: 'خ', pos: 'اول' },
    ],
  },

  // ── 31 ─ تشدید  (orange) ──────────────────────────────────────────────────
  'تشدید': {
    letter: 'ّ', name: 'تشدید',
    description: 'تشدید یعنی صدا را دو بار بگو — مثل نجّار، بنّا',
    ...C.orange,
    examples: [
      { emoji: '🪚', word: 'نجّار', highlight: 'ج', pos: 'وسط' },
      { emoji: '🧱', word: 'بنّا',  highlight: 'ن', pos: 'وسط' },
      { emoji: '🛁', word: 'حمّام', highlight: 'م', pos: 'وسط' },
    ],
  },

  // ── 32 ─ ص  (emerald) ─────────────────────────────────────────────────────
  'ص': {
    letter: 'ص', name: 'ص',
    description: 'حرفی که در کلمه صبح هست',
    ...C.emerald,
    forms: [
      { text: 'صـ', label: 'غیر آخر', color: '#10B981' },
      { text: 'ص',  label: 'آخر',     color: SEC[7] },
    ],
    examples: [
      { emoji: '🌄', word: 'صبح',  highlight: 'ص', pos: 'اول' },
      { emoji: '✅', word: 'صادق', highlight: 'ص', pos: 'اول' },
      { emoji: '💫', word: 'خاص',  highlight: 'ص', pos: 'آخر' },
    ],
  },

  // ── 33 ─ ذ  (teal) ────────────────────────────────────────────────────────
  'ذ': {
    letter: 'ذ', name: 'ذ',
    description: 'حرفی که در کلمه ذرت هست',
    ...C.teal,
    forms: [
      { text: 'ذ', label: 'تنها', color: '#0D9488' },
    ],
    examples: [
      { emoji: '🌽', word: 'ذرت', highlight: 'ذ', pos: 'اول' },
      { emoji: '🧠', word: 'ذهن', highlight: 'ذ', pos: 'اول' },
      { emoji: '⚡', word: 'لذت', highlight: 'ذ', pos: 'وسط' },
    ],
  },

  // ── 34 ─ ع  (indigo) ──────────────────────────────────────────────────────
  'ع': {
    letter: 'ع', name: 'ع',
    description: 'حرفی که در کلمه عروس هست',
    ...C.indigo,
    forms: [
      { text: 'عـ',  label: 'اول',       color: '#4F46E5' },
      { text: 'ـعـ', label: 'وسط',       color: SEC[9] },
      { text: 'ـع',  label: 'آخر چسبان', color: SEC[9] },
      { text: 'ع',   label: 'آخر تنها',  color: '#4F46E5' },
    ],
    examples: [
      { emoji: '👰', word: 'عروس', highlight: 'ع', pos: 'اول' },
      { emoji: '🚩', word: 'علم',  highlight: 'ع', pos: 'اول' },
      { emoji: '➕', word: 'جمع',  highlight: 'ع', pos: 'آخر' },
    ],
  },

  // ── 35 ─ ث  (pink) ────────────────────────────────────────────────────────
  'ث': {
    letter: 'ث', name: 'ث',
    description: 'حرفی که مثل «س» خونده میشه',
    ...C.pink,
    forms: [
      { text: 'ثـ', label: 'غیر آخر', color: '#DB2777' },
      { text: 'ث',  label: 'آخر',     color: SEC[10] },
    ],
    examples: [
      { emoji: '💰', word: 'ثروت', highlight: 'ث', pos: 'اول' },
      { emoji: '📌', word: 'ثابت', highlight: 'ث', pos: 'اول' },
      { emoji: '🔬', word: 'بحث',  highlight: 'ث', pos: 'آخر' },
    ],
  },

  // ── 36 ─ ح  (lime) ────────────────────────────────────────────────────────
  'ح': {
    letter: 'ح', name: 'ح',
    description: 'حرفی که در کلمه حیوان هست',
    ...C.lime,
    forms: [
      { text: 'حـ', label: 'غیر آخر', color: '#65A30D' },
      { text: 'ح',  label: 'آخر',     color: SEC[11] },
    ],
    examples: [
      { emoji: '🐾', word: 'حیوان', highlight: 'ح', pos: 'اول' },
      { emoji: '💬', word: 'حرف',   highlight: 'ح', pos: 'اول' },
      { emoji: '🌄', word: 'صبح',   highlight: 'ح', pos: 'آخر' },
    ],
  },

  // ── 37 ─ ض  (amber) ───────────────────────────────────────────────────────
  'ض': {
    letter: 'ض', name: 'ض',
    description: 'حرفی که مثل «ز» خونده میشه',
    ...C.amber,
    forms: [
      { text: 'ضـ', label: 'غیر آخر', color: '#F59E0B' },
      { text: 'ض',  label: 'آخر',     color: SEC[0] },
    ],
    examples: [
      { emoji: '🎯', word: 'ضربه', highlight: 'ض', pos: 'اول' },
      { emoji: '⚪', word: 'ضعیف', highlight: 'ض', pos: 'اول' },
      { emoji: '🏋️', word: 'ورزش', highlight: 'ض', pos: 'وسط' },
    ],
  },

  // ── 38 ─ ط  (blue) ────────────────────────────────────────────────────────
  'ط': {
    letter: 'ط', name: 'ط',
    description: 'حرفی که در کلمه طوطی هست',
    ...C.blue,
    forms: [
      { text: 'طـ', label: 'غیر آخر', color: '#2563EB' },
      { text: 'ط',  label: 'آخر',     color: SEC[1] },
    ],
    examples: [
      { emoji: '🦜', word: 'طوطی',  highlight: 'ط', pos: 'اول' },
      { emoji: '🌿', word: 'طبیعت', highlight: 'ط', pos: 'اول' },
      { emoji: '✏️', word: 'خط',    highlight: 'ط', pos: 'آخر' },
    ],
  },

  // ── 39 ─ غ  (rose) ────────────────────────────────────────────────────────
  'غ': {
    letter: 'غ', name: 'غ',
    description: 'حرفی که در کلمه غذا هست',
    ...C.rose,
    forms: [
      { text: 'غـ',  label: 'اول',       color: '#E11D48' },
      { text: 'ـغـ', label: 'وسط',       color: SEC[2] },
      { text: 'ـغ',  label: 'آخر چسبان', color: SEC[2] },
      { text: 'غ',   label: 'آخر تنها',  color: '#E11D48' },
    ],
    examples: [
      { emoji: '🍽️', word: 'غذا', highlight: 'غ', pos: 'اول' },
      { emoji: '👹', word: 'غول', highlight: 'غ', pos: 'اول' },
      { emoji: '🌳', word: 'باغ', highlight: 'غ', pos: 'آخر' },
    ],
  },

  // ── 40 ─ ظ  (green) ───────────────────────────────────────────────────────
  'ظ': {
    letter: 'ظ', name: 'ظ',
    description: 'حرفی که مثل «ز» خونده میشه',
    ...C.green,
    forms: [
      { text: 'ظـ', label: 'غیر آخر', color: '#059669' },
      { text: 'ظ',  label: 'آخر',     color: SEC[3] },
    ],
    examples: [
      { emoji: '🦁', word: 'ظالم',  highlight: 'ظ', pos: 'اول' },
      { emoji: '👁️', word: 'ظاهر',  highlight: 'ظ', pos: 'اول' },
      { emoji: '📜', word: 'لفظ',   highlight: 'ظ', pos: 'آخر' },
    ],
  },
};
