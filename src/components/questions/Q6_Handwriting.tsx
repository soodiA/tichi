import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Question } from '../../types';

const SIZE = 300;
const PEN_WIDTH = 5;      // thin pen line, not a fat brush
const HIT_RADIUS = 32;
const PEN_COLOR = '#1e1b4b';

// Paths below are drawn/calibrated by Soodeh via /path-editor (2026-08-28), keyed by the
// literal glyph string as it appears in curriculum data — her editor's per-letter/per-form
// taxonomy (see PathEditor.tsx ENTRIES) collapses to this flat glyph->strokes map because
// several distinct pedagogical entries (e.g. kasra's final-alone vs he's final-alone) render
// as the same glyph and share one path.
const STROKE_PATHS: Record<string, [number, number][][]> = {
  'اَ': [
    [[148, 63], [149, 218]],
    [[170, 19], [124, 39]],
  ],
  'ـَ': [
    [[172, 80], [124, 101]],
  ],
  'اِ': [
    [[145, 62], [145, 219]],
    [[173, 252], [126, 273]],
  ],
  'ـِ': [
    [[175, 240], [129, 262]],
  ],
  'ـه': [
    [[244, 210], [162, 209], [148, 197], [138, 106], [106, 120], [73, 146], [73, 168], [80, 189], [110, 204], [141, 188]],
  ],
  'ه': [
    [[135, 116], [185, 152], [193, 190], [167, 210], [124, 210], [105, 173], [132, 132]],
  ],
  'اُ': [
    [[150, 64], [150, 218]],
    [[157, 27], [140, 19], [140, 19], [144, -1], [144, -1], [166, 1], [166, 1], [166, 20], [147, 35], [118, 44]],
  ],
  'ـُ': [
    [[167, 100], [145, 91], [154, 71], [175, 86], [160, 109], [128, 115]],
  ],
  'آ': [
    [[147, 77], [146, 216]],
    [[183, 38], [160, 50], [130, 34], [104, 57]],
  ],
  'ا': [
    [[147, 61], [146, 218]],
  ],
  'أ': [ [[147, 61], [146, 218]] ],
  'إ': [ [[147, 61], [146, 218]] ],
  'ئ': [ [[147, 61], [146, 218]] ],
  'او': [
    [[208, 64], [206, 216]],
    [[127, 216], [85, 208], [80, 168], [80, 168], [106, 129], [140, 141], [159, 177], [162, 219], [138, 258], [87, 273]],
  ],
  'و': [
    [[160, 203], [122, 203], [112, 172], [129, 141], [158, 136], [178, 147], [194, 182], [188, 228], [169, 255], [117, 279]],
  ],
  'ایـ': [
    [[224, 64], [221, 214]],
    [[169, 135], [176, 189], [153, 219], [51, 218]],
    [[148, 245], [162, 263]],
    [[105, 247], [123, 261]],
  ],
  'یـ': [
    [[200, 134], [205, 188], [189, 214], [78, 213]],
    [[175, 249], [189, 264]],
    [[136, 250], [152, 259]],
  ],
  'ی': [
    [[217, 137], [184, 131], [162, 144], [150, 170], [156, 204], [184, 209], [219, 213], [219, 239], [195, 263], [153, 273], [108, 267], [80, 237], [75, 200], [86, 153]],
  ],
  'ای': [
    [[237, 63], [236, 216]],
    [[189, 135], [152, 124], [124, 147], [116, 188], [185, 198], [191, 239], [147, 270], [66, 263], [45, 210], [55, 166]],
  ],
  'بـ': [
    [[195, 134], [197, 198], [162, 218], [85, 218]],
    [[159, 247], [173, 261]],
  ],
  'ب': [
    [[233, 131], [237, 190], [219, 208], [96, 214], [63, 191], [62, 135]],
    [[144, 246], [156, 258]],
  ],
  'پـ': [
    [[200, 134], [199, 207], [159, 220], [79, 219]],
    [[176, 244], [187, 256]],
    [[133, 245], [146, 257]],
    [[154, 270], [167, 282]],
  ],
  'پ': [
    [[233, 135], [238, 186], [219, 214], [90, 212], [61, 184], [63, 132]],
    [[167, 242], [183, 256]],
    [[126, 238], [139, 253]],
    [[142, 270], [154, 279]],
  ],
  'تـ': [
    [[199, 135], [203, 186], [177, 212], [79, 213]],
    [[189, 89], [202, 100]],
    [[145, 88], [160, 98]],
  ],
  'ت': [
    [[233, 135], [239, 177], [223, 208], [88, 212], [62, 183], [67, 129]],
    [[160, 112], [175, 126]],
    [[122, 111], [136, 126]],
  ],
  'ثـ': [
    [[199, 136], [206, 186], [181, 215], [81, 215]],
    [[163, 59], [181, 71]],
    [[141, 86], [159, 101]],
    [[187, 87], [199, 99]],
  ],
  'ث': [
    [[237, 130], [238, 186], [220, 213], [82, 212], [61, 188], [61, 130]],
    [[140, 87], [159, 103]],
    [[123, 119], [134, 131]],
    [[160, 116], [178, 132]],
  ],
  'جـ': [
    [[114, 154], [151, 122], [202, 136], [250, 154], [166, 190], [108, 197], [43, 197]],
    [[170, 251], [188, 268]],
  ],
  'ج': [
    [[79, 148], [114, 115], [185, 135], [215, 142], [164, 152], [102, 186], [81, 238], [109, 283], [175, 297], [220, 280]],
    [[156, 214], [172, 226]],
  ],
  'چـ': [
    [[120, 154], [153, 120], [219, 140], [249, 153], [176, 185], [145, 192], [35, 190]],
    [[189, 242], [203, 253]],
    [[148, 240], [162, 258]],
    [[175, 273], [185, 286]],
  ],
  'چ': [
    [[87, 149], [117, 117], [184, 140], [218, 146], [153, 164], [99, 191], [82, 231], [94, 276], [140, 293], [215, 285]],
    [[138, 206], [151, 225]],
    [[181, 202], [195, 214]],
    [[166, 233], [181, 246]],
  ],
  'حـ': [
    [[83, 148], [150, 137], [218, 152], [218, 180],
     [195, 215], [162, 255], [163, 285], [192, 298]],
  ],
  'ح': [
    [[81, 149], [115, 116], [182, 138], [219, 147], [132, 167], [94, 202], [84, 253], [111, 283], [162, 299], [214, 280]],
  ],
  'خـ': [
    [[115, 153], [150, 123], [224, 147], [248, 153], [182, 183], [140, 194], [38, 198]],
    [[162, 75], [177, 94]],
  ],
  'خ': [
    [[85, 147], [124, 113], [169, 134], [212, 152], [158, 155], [112, 180], [80, 224], [90, 265], [128, 295], [176, 297], [221, 283]],
    [[134, 67], [146, 85]],
  ],
  'د': [
    [[133, 110], [175, 137], [190, 182], [158, 214], [109, 214]],
  ],
  'ذ': [
    [[133, 109], [195, 164], [178, 206], [108, 213]],
    [[123, 59], [140, 74]],
  ],
  'ر': [
    [[166, 150], [177, 212], [158, 245], [105, 267]],
  ],
  'ز': [
    [[164, 155], [175, 213], [158, 251], [108, 269]],
    [[151, 94], [167, 117]],
  ],
  'ژ': [
    [[160, 154], [171, 207], [159, 246], [106, 270]],
    [[145, 86], [159, 97]],
    [[123, 106], [136, 119]],
    [[170, 105], [179, 124]],
  ],
  'سـ': [
    [[254, 132], [262, 168], [253, 206], [221, 216], [200, 183], [194, 147], [194, 182], [189, 207], [159, 214], [133, 188], [133, 152], [128, 189], [121, 209], [97, 214], [24, 214]],
  ],
  'س': [
    [[271, 134], [275, 172], [265, 206], [236, 219], [213, 202], [209, 148], [209, 186], [202, 209], [178, 213], [154, 185], [141, 156], [148, 184], [159, 208], [151, 246], [118, 274], [86, 275], [46, 261], [25, 219], [29, 179], [36, 160]],
  ],
  'شـ': [
    [[255, 134], [262, 167], [255, 198], [232, 216], [199, 201], [195, 153], [196, 189], [181, 212], [146, 212], [135, 185], [134, 148], [132, 196], [120, 213], [20, 213]],
    [[182, 74], [190, 86]],
    [[163, 101], [175, 112]],
    [[205, 103], [220, 115]],
  ],
  'ش': [
    [[267, 134], [279, 172], [268, 203], [242, 219], [218, 198], [211, 153], [211, 194], [196, 216], [171, 216], [153, 192], [141, 153], [147, 190], [154, 216], [148, 242], [124, 270], [75, 276], [33, 252], [23, 210], [33, 160]],
    [[202, 69], [213, 77]],
    [[178, 100], [188, 112]],
    [[219, 100], [232, 111]],
  ],
  'صـ': [
    [[151, 184], [175, 149], [219, 122], [263, 141], [268, 178], [245, 208], [205, 214], [164, 216], [128, 198], [120, 144], [121, 195], [105, 210], [23, 213]],
  ],
  'ص': [
    [[170, 185], [194, 141], [233, 123], [274, 134], [286, 182], [250, 213], [200, 218], [154, 210], [130, 155], [148, 198], [147, 239], [115, 273], [64, 277], [21, 253], [14, 195], [26, 158]],
  ],
  'ضـ': [
    [[151, 188], [178, 142], [218, 120], [261, 138], [267, 177], [244, 209], [195, 216], [152, 218], [120, 190], [120, 146], [116, 177], [111, 207], [87, 214], [18, 213]],
    [[209, 71], [225, 88]],
  ],
  'ض': [
    [[163, 189], [191, 146], [236, 124], [278, 142], [287, 173], [263, 202], [208, 218], [153, 213], [134, 155], [145, 201], [145, 236], [123, 264], [75, 280], [26, 257], [13, 209], [26, 150]],
    [[226, 73], [243, 91]],
  ],
  'ط': [
    [[100, 188], [136, 146], [181, 119], [215, 140], [225, 185], [188, 214], [141, 220], [68, 219]],
    [[112, 64], [114, 170]],
  ],
  'ظ': [
    [[99, 191], [134, 146], [179, 123], [220, 142], [229, 164], [220, 195], [181, 214], [142, 221], [70, 219]],
    [[111, 64], [112, 162]],
    [[169, 70], [185, 87]],
  ],
  'عـ': [
    [[226, 129], [200, 112], [169, 112], [142, 141], [139, 165], [148, 188], [194, 183], [231, 174], [181, 185], [140, 191], [102, 191], [52, 191]],
  ],
  'ـعـ': [
    [[279, 212], [185, 212], [136, 190], [99, 141], [147, 129], [209, 140], [169, 189], [129, 209], [20, 212]],
  ],
  'ـع': [
    [[251, 208], [152, 208], [102, 179], [70, 131], [122, 115], [177, 131], [133, 177], [90, 200], [60, 230], [68, 268], [98, 291], [139, 295], [171, 282]],
  ],
  'ع': [
    [[194, 116], [164, 99], [121, 113], [116, 150], [134, 178], [171, 170], [196, 170], [157, 173], [108, 188], [92, 225], [96, 268], [118, 286], [176, 292], [209, 277]],
  ],
  'غـ': [
    [[225, 135], [195, 122], [158, 126], [140, 153], [169, 196], [233, 186], [140, 198], [58, 198]],
    [[176, 69], [190, 86]],
  ],
  'ـغـ': [
    [[283, 209], [179, 204], [144, 191], [100, 144], [152, 128], [208, 140], [153, 197], [127, 206], [19, 202]],
    [[148, 76], [160, 92]],
  ],
  'ـغ': [
    [[250, 213], [166, 212], [122, 196], [69, 143], [120, 119], [176, 137], [129, 174], [102, 190], [67, 214], [60, 246], [68, 271], [108, 289], [142, 291], [170, 279]],
    [[111, 65], [132, 81]],
  ],
  'غ': [
    [[200, 119], [173, 103], [134, 109], [111, 131], [127, 178], [164, 171], [202, 171], [152, 172], [106, 192], [93, 210], [90, 242], [110, 281], [150, 299], [189, 293], [209, 286]],
    [[150, 51], [164, 63]],
  ],
  'فـ': [
    [[201, 165], [154, 165], [139, 138], [157, 107], [183, 95], [208, 107], [224, 132], [224, 174], [209, 210], [178, 213], [64, 212]],
    [[171, 52], [185, 69]],
  ],
  'ف': [
    [[214, 162], [173, 161], [157, 134], [175, 100], [196, 93], [219, 99], [235, 129], [242, 172], [225, 204], [96, 207], [67, 184], [63, 148]],
    [[191, 45], [206, 59]],
  ],
  'قـ': [
    [[197, 164], [151, 162], [141, 136], [156, 105], [183, 93], [208, 105], [223, 135], [223, 167], [214, 203], [176, 213], [61, 212]],
    [[145, 51], [163, 64]],
    [[191, 51], [205, 65]],
  ],
  'ق': [
    [[200, 196], [154, 196], [136, 165], [153, 130], [181, 122], [207, 138], [219, 168], [220, 218], [202, 250], [172, 268], [130, 267], [91, 247], [80, 206], [90, 154]],
    [[147, 83], [159, 95]],
    [[189, 79], [201, 99]],
  ],
  'کـ': [
    [[145, 116], [206, 150], [215, 180], [195, 210], [64, 210]],
    [[224, 74], [142, 106]],
  ],
  'ک': [
    [[170, 119], [232, 156], [235, 191], [214, 209], [90, 209], [54, 180], [62, 135]],
    [[247, 73], [156, 107]],
  ],
  'گـ': [
    [[139, 111], [218, 167], [213, 196], [179, 215], [62, 214]],
    [[227, 70], [141, 103]],
    [[227, 39], [134, 73]],
  ],
  'گ': [
    [[164, 113], [235, 170], [231, 198], [203, 216], [99, 212], [70, 188], [61, 147]],
    [[245, 69], [157, 100]],
    [[248, 31], [159, 70]],
  ],
  'لـ': [
    [[194, 62], [195, 179], [187, 201], [159, 214], [85, 213]],
  ],
  'ل': [
    [[202, 64], [203, 221], [196, 252], [167, 273], [126, 274], [96, 249], [84, 213], [94, 164]],
  ],
  'مـ': [
    [[154, 186], [177, 153], [208, 148], [230, 176], [217, 210], [181, 214], [151, 194], [130, 208], [63, 206]],
  ],
  'م': [
    [[123, 178], [147, 146], [181, 138], [203, 149], [211, 184], [193, 212], [157, 212], [110, 191], [94, 213], [92, 289]],
  ],
  'نـ': [
    [[189, 134], [199, 194], [187, 208], [162, 210], [82, 210]],
    [[169, 89], [182, 105]],
  ],
  'ن': [
    [[205, 150], [215, 195], [205, 246], [157, 270], [104, 255], [80, 213], [87, 152]],
    [[139, 128], [159, 141]],
  ],
  'هـ': [
    [[170, 110], [232, 146], [251, 178], [238, 207], [207, 214], [162, 204], [120, 174], [128, 134], [164, 123], [191, 147], [199, 171], [182, 195], [151, 210], [121, 212], [31, 212]],
  ],
  'ـهـ': [
    [[273, 208], [197, 206], [171, 216], [166, 265], [134, 238], [116, 200], [121, 155], [136, 124], [167, 123], [187, 147], [177, 185], [150, 206], [103, 204], [26, 206]],
  ],

  // اعراب مستقل — not (re)dictated by Soodeh, kept from earlier version
  'َ': [ [[185, 135], [115, 115]] ],
  'ُ': [ [[150, 130], [165, 112], [175, 125], [165, 148]] ],
  'ِ': [ [[185, 165], [115, 145]] ],
  'ً': [ [[185, 115], [115, 95]], [[185, 145], [115, 125]] ],
  'ٌ': [ [[150, 110], [165, 92], [175, 105], [165, 128]], [[150, 135], [165, 117], [175, 130], [165, 153]] ],
  'ٍ': [ [[185, 155], [115, 135]], [[185, 180], [115, 160]] ],
  'ّ': [ [[128, 152], [105, 132], [105, 108], [128, 98], [152, 108], [152, 132], [128, 152]], [[150, 85]] ],
  'ـّ': [ [[215, 175], [85, 175]], [[128, 147], [105, 127], [105, 103], [128, 93], [152, 103], [152, 127], [128, 147]] ],
  'ـً': [ [[215, 175], [85, 175]], [[185, 110], [115, 90]], [[185, 140], [115, 120]] ],
};

function waypointsToSVGPath(pts: [number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
}

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

// Fallback normalization: strip Arabic harakat (U+064B–U+065F), keep tatweel (U+0640).
// Lookup always tries the raw letter first, so 'اَ' and 'َ' hit their own paths before falling back.
function normalizeLetter(l: string): string {
  return l.replace(/[ً-ٟ]/g, '');
}

const Q6_Handwriting: React.FC<Props> = ({ question, onAnswer }) => {
  const letter = String(question.correctAnswer);
  const allStrokes = STROKE_PATHS[letter] ?? STROKE_PATHS[normalizeLetter(letter)] ?? null;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintRef = useRef<HTMLCanvasElement | null>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const tempRef = useRef<HTMLCanvasElement | null>(null);
  const totalRef = useRef(0);
  const doneRef = useRef(false);
  const drawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const [done, setDone] = useState(false);
  const [guideVisible, setGuideVisible] = useState(true);

  // path-following state
  const [currentStroke, setCurrentStroke] = useState(0);
  const currentStrokeRef = useRef(0);
  const [nextWpt, setNextWpt] = useState(0);
  const nextWptRef = useRef(0);
  const [strokeDone, setStrokeDone] = useState(false);
  const strokeDoneRef = useRef(false);

  // coverage fallback
  const [coverage, setCoverage] = useState(0);

  const fontSize = Math.round(SIZE * 0.78);
  const cy = Math.round(SIZE * 0.62);
  // Wrap with ZWNJ on both sides to force isolated (non-joining) Arabic glyph form
  const displayLetter = '‌' + letter + '‌';

  const buildMask = useCallback(() => {
    const mask = document.createElement('canvas');
    mask.width = SIZE; mask.height = SIZE;
    const ctx = mask.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.font = `bold ${fontSize}px Vazirmatn, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayLetter, SIZE / 2, cy);
    const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
    let cnt = 0;
    let mnX = SIZE, mxX = 0, mnY = SIZE, mxY = 0;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const a = data[(y * SIZE + x) * 4 + 3];
        if (a > 30) {
          cnt++;
          if (x < mnX) mnX = x; if (x > mxX) mxX = x;
          if (y < mnY) mnY = y; if (y > mxY) mxY = y;
        }
      }
    }
    totalRef.current = cnt;
    // Log actual bounds to help calibrate stroke paths during development
    console.log(`[Q6 bounds] '${letter}': x[${mnX}-${mxX}] y[${mnY}-${mxY}] ${mxX-mnX}×${mxY-mnY}`);
    return mask;
  }, [displayLetter, letter, fontSize, cy]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const paint = paintRef.current;
    if (!canvas || !paint) return;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#fdf4ff';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Faded letter guide — user traces over it
    ctx.fillStyle = '#ede9fe';
    ctx.font = `bold ${fontSize}px Vazirmatn, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayLetter, SIZE / 2, cy);

    // User's ink drawn freely on top (no mask clipping)
    ctx.drawImage(paint, 0, 0);
  }, [displayLetter, fontSize, cy]);

  const complete = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    setCoverage(100);
    setTimeout(() => onAnswer(true), 700);
  }, [onAnswer]);

  const drawAt = useCallback((x: number, y: number) => {
    if (doneRef.current) return;
    const paint = paintRef.current;
    const mask = maskRef.current;
    if (!paint || !mask) return;

    const pCtx = paint.getContext('2d')!;
    pCtx.strokeStyle = PEN_COLOR;
    pCtx.lineWidth = PEN_WIDTH;
    pCtx.lineCap = 'round';
    pCtx.lineJoin = 'round';
    pCtx.beginPath();
    const last = lastPosRef.current;
    if (last) {
      pCtx.moveTo(last.x, last.y);
      pCtx.lineTo(x, y);
    } else {
      pCtx.moveTo(x, y);
      pCtx.lineTo(x, y);
    }
    pCtx.stroke();
    lastPosRef.current = { x, y };
    render();

    if (allStrokes) {
      // Don't process waypoints if current stroke is already complete (waiting for lift)
      if (strokeDoneRef.current) return;

      const strokePts = allStrokes[currentStrokeRef.current];
      const idx = nextWptRef.current;
      if (idx < strokePts.length) {
        const [wx, wy] = strokePts[idx];
        const dx = x - wx, dy = y - wy;
        if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) {
          const next = idx + 1;
          nextWptRef.current = next;
          setNextWpt(next);

          // Compute total progress across all strokes
          const totalWpts = allStrokes.reduce((s, st) => s + st.length, 0);
          const doneWpts = allStrokes.slice(0, currentStrokeRef.current).reduce((s, st) => s + st.length, 0) + next;
          setCoverage(Math.round((doneWpts / totalWpts) * 100));

          if (next >= strokePts.length) {
            // Current stroke complete
            strokeDoneRef.current = true;
            setStrokeDone(true);
            // If last stroke, finish; otherwise wait for finger lift
            if (currentStrokeRef.current + 1 >= allStrokes.length) {
              complete();
            }
          }
        }
      }
    } else {
      // Coverage mode — just track that user has drawn something (no auto-complete)
      setCoverage((prev) => Math.min(prev + 5, 99));
    }
  }, [render, complete, allStrokes]);

  // On finger/mouse lift: if current stroke just finished, advance to next stroke
  const handleDrawEnd = useCallback(() => {
    drawingRef.current = false;
    lastPosRef.current = null;
    if (!allStrokes || doneRef.current) return;
    if (strokeDoneRef.current) {
      const next = currentStrokeRef.current + 1;
      if (next < allStrokes.length) {
        currentStrokeRef.current = next;
        setCurrentStroke(next);
        nextWptRef.current = 0;
        setNextWpt(0);
        strokeDoneRef.current = false;
        setStrokeDone(false);
      }
    }
  }, [allStrokes]);

  const clearCanvas = useCallback(() => {
    if (doneRef.current) return;
    const paint = paintRef.current;
    if (!paint) return;
    paint.getContext('2d')!.clearRect(0, 0, SIZE, SIZE);
    setCoverage(0);
    setGuideVisible(true);
    currentStrokeRef.current = 0;
    setCurrentStroke(0);
    nextWptRef.current = 0;
    setNextWpt(0);
    strokeDoneRef.current = false;
    setStrokeDone(false);
    render();
  }, [render]);

  useEffect(() => {
    const paint = document.createElement('canvas');
    paint.width = SIZE; paint.height = SIZE;
    paintRef.current = paint;

    const temp = document.createElement('canvas');
    temp.width = SIZE; temp.height = SIZE;
    tempRef.current = temp;

    document.fonts.ready.then(() => {
      maskRef.current = buildMask();
      render();
    });
  }, [buildMask, render]);

  const canvasPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scale = SIZE / rect.width;
    return { x: (clientX - rect.left) * scale, y: (clientY - rect.top) * scale };
  };

  const handleDrawStart = useCallback((x: number, y: number) => {
    setGuideVisible(false);
    drawingRef.current = true;
    lastPosRef.current = null;
    drawAt(x, y);
  }, [drawAt]);

  // Build SVG paths for overlay
  const currentStrokePts = allStrokes?.[currentStroke] ?? null;
  const currentSvgPath = currentStrokePts ? waypointsToSVGPath(currentStrokePts) : null;
  const startPt = currentStrokePts?.[0];
  const currentTarget = currentStrokePts && nextWpt < currentStrokePts.length
    ? currentStrokePts[nextWpt]
    : null;
  const isLastStroke = allStrokes ? currentStroke === allStrokes.length - 1 : true;

  return (
    <div className="flex flex-col items-center gap-4 flex-1 justify-center">
      <p className="text-gray-500 text-sm">
        {allStrokes
          ? (allStrokes.length > 1
              ? `حرف را بنویس (خط ${currentStroke + 1} از ${allStrokes.length})`
              : 'حرف را روی راهنما بنویس')
          : 'بنویس، بعد «نوشتم» بزن'}
      </p>

      <div className="relative rounded-3xl overflow-hidden shadow-lg border-2 border-violet-200" style={{ width: 280, height: 280 }}>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="w-full h-full touch-none"
          onTouchStart={(e) => { e.preventDefault(); const t = e.touches[0]; const p = canvasPos(t.clientX, t.clientY); if (p) handleDrawStart(p.x, p.y); }}
          onTouchMove={(e) => { e.preventDefault(); if (!drawingRef.current) return; const t = e.touches[0]; const p = canvasPos(t.clientX, t.clientY); if (p) drawAt(p.x, p.y); }}
          onTouchEnd={() => handleDrawEnd()}
          onMouseDown={(e) => { const p = canvasPos(e.clientX, e.clientY); if (p) handleDrawStart(p.x, p.y); }}
          onMouseMove={(e) => { if (!drawingRef.current) return; const p = canvasPos(e.clientX, e.clientY); if (p) drawAt(p.x, p.y); }}
          onMouseUp={() => handleDrawEnd()}
          onMouseLeave={() => handleDrawEnd()}
        />

        {currentSvgPath && !done && (
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {guideVisible && (
              <style>{`
                @keyframes travelDot {
                  0%   { offset-distance: 0%;   opacity: 1; }
                  85%  { offset-distance: 100%; opacity: 1; }
                  100% { offset-distance: 100%; opacity: 0; }
                }
                .travel-dot {
                  offset-path: path('${currentSvgPath}');
                  animation: travelDot 1.8s ease-in-out infinite;
                }
              `}</style>
            )}

            {/* Current stroke — dashed guide */}
            <path
              d={currentSvgPath}
              stroke="#7c3aed"
              strokeWidth="6"
              strokeDasharray="10 7"
              fill="none"
              opacity="0.35"
              strokeLinecap="round"
            />

            {/* Animated guide (before first touch) */}
            {guideVisible && startPt && (
              <>
                <circle cx={startPt[0]} cy={startPt[1]} r="10" fill="#7c3aed" opacity="0.7">
                  <animate attributeName="r" values="10;14;10" dur="1.1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.1s" repeatCount="indefinite" />
                </circle>
                <circle r="9" fill="#7c3aed" className="travel-dot" />
              </>
            )}

            {/* Pulsing target waypoint */}
            {!guideVisible && currentTarget && !strokeDone && (
              <circle cx={currentTarget[0]} cy={currentTarget[1]} r="14" fill="none" stroke="#7c3aed" strokeWidth="3" opacity="0.6">
                <animate attributeName="r" values="14;20;14" dur="0.9s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.9s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Stroke done — show checkmark and lift-finger hint */}
            {strokeDone && !isLastStroke && (
              <>
                <circle cx={SIZE / 2} cy={SIZE / 2} r="32" fill="#7c3aed" opacity="0.85" />
                <text x={SIZE / 2} y={SIZE / 2 + 10} textAnchor="middle" fontSize="28" fill="white">✓</text>
              </>
            )}
          </svg>
        )}
      </div>

      {/* Lift-finger prompt between strokes */}
      {strokeDone && !isLastStroke && !done && (
        <p className="text-violet-600 font-bold text-sm">انگشتت را بردار و خط بعدی را بکش</p>
      )}

      {allStrokes && (
        <div className="w-64 h-3 bg-violet-100 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full transition-all duration-150" style={{ width: `${coverage}%` }} />
        </div>
      )}

      <div className="flex gap-3">
        {!done && (
          <button onClick={clearCanvas} className="border-2 border-gray-300 text-gray-600 font-bold py-3 px-6 rounded-2xl active:scale-95 transition-transform">
            پاک کن
          </button>
        )}
        {/* For coverage-mode letters: show "نوشتم" once user has drawn something */}
        {!allStrokes && !done && coverage > 0 && (
          <button onClick={complete} className="bg-violet-500 text-white font-bold py-3 px-6 rounded-2xl active:scale-95 transition-transform">
            نوشتم ✓
          </button>
        )}
        {done && <p className="text-violet-600 font-extrabold text-2xl">آفرین! ✍️</p>}
      </div>
    </div>
  );
};

export default Q6_Handwriting;
