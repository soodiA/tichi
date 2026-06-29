import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Question } from '../../types';

const SIZE = 300;
const PEN_WIDTH = 5;      // thin pen line, not a fat brush
const HIT_RADIUS = 32;
const PEN_COLOR = '#1e1b4b';

// Multi-stroke paths: each letter → array of strokes → array of [x,y] waypoints.
// Calibrated for Vazirmatn bold fontSize=234, canvas 300×300, center x=150.
// Font analysis: unitsPerEm=2048, baseline≈y243, scale=0.1143 px/unit.
// Bounding boxes measured from actual font glyph data.
// Single-waypoint strokes = dot/tap.
const STROKE_PATHS: Record<string, [number, number][][]> = {
  // ── الف family ───────────────────────────────────────────────
  'آ': [
    [[149, 78], [147, 215]],
    [[183, 36], [163, 54], [129, 37], [106, 60]],  // madda
  ],
  'ا': [ [[148, 61], [148, 221]] ],
  'أ': [ [[148, 61], [148, 221]] ],
  'إ': [ [[148, 61], [148, 221]] ],
  'ئ': [ [[148, 61], [148, 221]] ],
  'اَ': [
    [[148, 61], [148, 221]],
    [[165, 40], [135, 30]],                         // fatha above
  ],
  'اُ': [
    [[148, 61], [148, 221]],
    [[148, 35], [163, 28], [158, 42]],              // damma above
  ],
  'اِ': [
    [[148, 61], [148, 221]],
    [[165, 232], [135, 222]],                       // kasra below
  ],

  // ── ب family — آخر/ایزوله (U-شکل ۴ نقطه) vs غیر آخر (J-شکل ۳ نقطه) ──
  'ب': [
    [[232, 136], [232, 200], [67, 200], [66, 137]],   // آخر: U-shape
    [[147, 249], [162, 258]],
  ],
  'بـ': [
    [[232, 136], [232, 200], [67, 200]],               // غیر آخر: J-shape
    [[147, 249], [162, 258]],
  ],
  'پ': [
    [[232, 136], [232, 200], [67, 200], [66, 137]],
    [[107, 247], [118, 258]], [[147, 249], [162, 258]], [[181, 247], [192, 258]],
  ],
  'پـ': [
    [[232, 136], [232, 200], [67, 200]],
    [[107, 247], [118, 258]], [[147, 249], [162, 258]], [[181, 247], [192, 258]],
  ],
  'ت': [
    [[232, 136], [232, 200], [67, 200], [66, 137]],
    [[126, 114], [136, 126]], [[166, 116], [177, 128]],
  ],
  'تـ': [
    [[232, 136], [232, 200], [67, 200]],
    [[126, 114], [136, 126]], [[166, 116], [177, 128]],
  ],
  'ث': [
    [[232, 136], [232, 200], [67, 200], [66, 137]],
    [[166, 116], [177, 128]],
    [[126, 114], [136, 126]],
    [[145, 89], [156, 98]],
  ],
  'ثـ': [
    [[232, 136], [232, 200], [67, 200]],
    [[166, 116], [177, 128]],
    [[126, 114], [136, 126]],
    [[145, 89], [156, 98]],
  ],

  // ── ج family ─────────────────────────────────────────────────
  'ج': [
    [[83, 148], [150, 137], [218, 152], [218, 180],
     [195, 215], [162, 255], [163, 285], [192, 298]],
    [[166, 246]],
  ],
  'چ': [
    [[85, 150], [118, 114], [209, 143], [154, 151], [107, 179], [80, 217], [81, 261], [103, 279], [134, 295], [170, 295], [214, 279]],
    [[142, 206], [156, 222]],
    [[182, 207], [193, 217]],
    [[160, 237], [170, 247]],
  ],
  'ح': [
    [[83, 148], [150, 137], [218, 152], [218, 180],
     [195, 215], [162, 255], [163, 285], [192, 298]],
  ],
  'خ': [
    [[83, 148], [150, 137], [218, 152], [218, 180],
     [195, 215], [162, 255], [163, 285], [192, 298]],
    [[138, 101]],
  ],

  // ── د family ─────────────────────────────────────────────────
  'د': [
    [[131, 107], [172, 126], [193, 160], [194, 190], [167, 215], [127, 217], [103, 211]],
  ],
  'ذ': [
    [[131, 107], [172, 126], [193, 160], [194, 190], [167, 215], [127, 217], [103, 211]],
    [[135, 75], [148, 86]],                         // dot above
  ],

  // ── ر family ─────────────────────────────────────────────────
  'ر': [ [[183, 175], [142, 295]] ],
  'ز': [
    [[183, 175], [142, 295]],
    [[157, 133]],
  ],
  'ژ': [
    [[169, 150], [178, 192], [170, 229], [157, 253], [115, 276]],
    [[129, 108], [135, 115]],
    [[173, 107], [179, 115]],
    [[148, 77], [157, 94]],
  ],

  // ── س family ─────────────────────────────────────────────────
  'س': [
    [[270, 165], [255, 292], [222, 165], [188, 288], [155, 165], [118, 292], [26, 165]],
  ],
  'ش': [
    [[267, 133], [278, 167], [269, 197], [244, 209], [220, 191], [212, 145], [215, 191], [195, 212], [163, 201], [140, 156], [153, 197], [157, 219], [147, 248], [124, 271], [86, 276], [36, 260], [20, 225], [20, 190], [33, 157]],
    [[177, 101], [187, 108]],
    [[223, 96], [231, 110]],
    [[194, 76], [207, 77]],
  ],

  // ── ص / ض ────────────────────────────────────────────────────
  'ص': [
    [[265, 148], [280, 172], [270, 210], [245, 148],
     [210, 290], [172, 148], [118, 292], [20, 155]],
  ],
  'ض': [
    [[169, 188], [188, 152], [218, 126], [259, 120], [281, 140], [285, 169], [273, 203], [244, 210], [211, 217], [184, 217], [151, 204], [136, 152], [151, 205], [148, 237], [127, 266], [93, 275], [58, 275], [30, 253], [13, 225], [14, 190], [23, 156]],
    [[225, 78], [241, 78]],
  ],

  // ── ط / ظ ────────────────────────────────────────────────────
  'ط': [
    [[114, 184], [138, 145], [167, 124], [205, 127], [224, 157], [218, 187], [194, 209], [148, 215], [72, 215]],
    [[118, 65], [118, 162]],
  ],
  'ظ': [
    [[114, 184], [138, 145], [167, 124], [205, 127], [224, 157], [218, 187], [194, 209], [148, 215], [72, 215]],
    [[118, 65], [118, 162]],
    [[179, 105]],
  ],

  // ── ع / غ ────────────────────────────────────────────────────
  'ع': [
    [[196, 113], [175, 101], [138, 101], [120, 115], [111, 143], [129, 167], [167, 167], [200, 166], [170, 167], [127, 172], [103, 188], [87, 217], [88, 249], [103, 282], [133, 294], [167, 295], [212, 279]],
  ],
  'غ': [
    [[196, 113], [175, 101], [138, 101], [120, 115], [111, 143], [129, 167], [167, 167], [200, 166], [170, 167], [127, 172], [103, 188], [87, 217], [88, 249], [103, 282], [133, 294], [167, 295], [212, 279]],
    [[157, 83]],
  ],

  // ── ف ────────────────────────────────────────────────────────
  'ف': [
    [[217, 166], [182, 163], [157, 146], [164, 109], [197, 94], [227, 110], [239, 145], [239, 182], [226, 213], [197, 219], [111, 216], [84, 206], [61, 176], [63, 139]],
    [[189, 45], [205, 65]],
  ],

  // ── ق ────────────────────────────────────────────────────────
  'ق': [
    [[190, 204], [159, 204], [139, 184], [139, 155], [150, 136], [175, 124], [206, 134], [217, 169], [218, 204], [211, 235], [195, 253], [166, 267], [122, 267], [92, 246], [76, 218], [79, 184], [92, 146]],
    [[141, 83], [158, 97]],
    [[182, 83], [200, 101]],
  ],

  // ── ک / گ ────────────────────────────────────────────────────
  'ک': [
    [[150, 85], [150, 163], [150, 238]],
    [[205, 128], [162, 148]],
  ],
  'گ': [
    [[245, 67], [157, 101], [151, 113], [226, 157], [233, 174], [224, 194], [211, 207], [182, 212], [90, 206], [67, 192], [58, 157], [67, 127]],
    [[243, 30], [162, 61]],
  ],

  // ── ل ────────────────────────────────────────────────────────
  'ل': [
    [[206, 63], [208, 224], [202, 247], [183, 264], [151, 275], [112, 267], [92, 242], [87, 205], [96, 161]],
  ],

  // ── م ────────────────────────────────────────────────────────
  'م': [
    [[121, 181], [127, 154], [151, 130], [178, 132], [199, 146], [209, 167], [209, 188], [193, 213], [170, 223], [142, 210], [116, 184], [102, 196], [92, 216], [88, 245], [87, 270], [88, 290]],
  ],

  // ── ن ────────────────────────────────────────────────────────
  'ن': [
    [[205, 148], [217, 184], [217, 218], [203, 247], [184, 264], [142, 269], [108, 260], [87, 225], [82, 179], [92, 151]],
    [[139, 120], [160, 138]],
  ],

  // ── و ────────────────────────────────────────────────────────
  'و': [
    [[159, 211], [123, 201], [111, 163], [132, 134], [159, 131], [183, 149], [191, 178], [191, 217], [176, 248], [157, 264], [117, 285]],
  ],

  // ── ه ────────────────────────────────────────────────────────
  'ه': [
    [[141, 114], [173, 133], [194, 157], [194, 191], [170, 221], [135, 219], [108, 197], [108, 162], [128, 134], [145, 119]],
  ],

  // ── ی ────────────────────────────────────────────────────────
  'ی': [
    [[223, 136], [197, 125], [173, 131], [153, 145], [140, 170], [141, 185], [169, 190], [196, 191], [219, 204], [220, 228], [209, 253], [182, 267], [141, 275], [103, 259], [79, 227], [79, 184], [81, 155]],
  ],

  // ── او ───────────────────────────────────────────────────────
  'او': [
    [[148, 61], [148, 221]],
    [[159, 211], [123, 201], [111, 163], [132, 134], [159, 131], [183, 149], [191, 178], [191, 217], [176, 248], [157, 264], [117, 285]],
  ],
};

function waypointsToSVGPath(pts: [number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
}

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

// Strip only Arabic harakat/diacritics (U+064B–U+065F), preserve tatweel (U+0640)
// so 'اُ'→'اُ' hits diacritic-specific path, 'بـ'→'بـ' hits غیر-آخر path
function normalizeLetter(l: string): string {
  return l.replace(/[ً-ٟ]/g, '');
}

const Q6_Handwriting: React.FC<Props> = ({ question, onAnswer }) => {
  const letter = String(question.correctAnswer);
  const allStrokes = STROKE_PATHS[normalizeLetter(letter)] ?? null;

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
