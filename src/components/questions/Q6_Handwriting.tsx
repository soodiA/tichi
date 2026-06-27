import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Question } from '../../types';

const SIZE = 300;
const BRUSH_R = 9;
const HIT_RADIUS = 32;
const PEN_COLOR = '#4c1d95';

// Multi-stroke paths: each letter → array of strokes → array of [x,y] waypoints.
// Tuned for Vazirmatn bold fontSize=234, centered x=150, cy=186.
// Single-waypoint strokes = dot (tap).
const STROKE_PATHS: Record<string, [number, number][][]> = {
  // ── Alef family ──────────────────────────────────────────────
  'آ': [
    [[150, 85], [149, 168], [148, 252]],
    [[174, 62], [162, 72], [150, 56], [136, 68], [124, 75]],
  ],
  'ا': [ [[150, 85], [149, 168], [148, 252]] ],  // plain alef
  'أ': [ [[150, 85], [149, 168], [148, 252]] ],  // alef + hamza above
  'إ': [ [[150, 85], [149, 168], [148, 252]] ],  // alef + hamza below
  'ئ': [ [[150, 85], [149, 168], [148, 252]] ],  // alef variants

  // ── ب family ─────────────────────────────────────────────────
  'ب': [
    [[178, 168], [148, 185], [118, 168]],
    [[148, 218]],
  ],
  'پ': [
    [[178, 168], [148, 185], [118, 168]],
    [[132, 218]], [[148, 225]], [[165, 218]],
  ],
  'ت': [
    [[178, 168], [148, 185], [118, 168]],
    [[135, 142]], [[165, 142]],
  ],
  'ث': [
    [[178, 168], [148, 185], [118, 168]],
    [[130, 138]], [[148, 130]], [[168, 138]],
  ],

  // ── ج family — start LEFT, sweep RIGHT, curve DOWN-LEFT ──────
  'ج': [
    [[115, 148], [148, 138], [175, 148], [170, 175], [155, 200], [138, 222], [140, 240], [162, 245], [190, 228]],
    [[148, 260]],
  ],
  'چ': [
    [[115, 148], [148, 138], [175, 148], [170, 175], [155, 200], [138, 222], [140, 240], [162, 245], [190, 228]],
    [[130, 260]], [[148, 268]], [[165, 260]],
  ],
  'ح': [
    [[115, 148], [148, 138], [175, 148], [170, 175], [155, 200], [138, 222], [140, 240], [162, 245], [190, 228]],
  ],
  'خ': [
    [[115, 148], [148, 138], [175, 148], [170, 175], [155, 200], [138, 222], [140, 240], [162, 245], [190, 228]],
    [[148, 118]],
  ],

  // ── د ────────────────────────────────────────────────────────
  'د': [
    [[178, 188], [158, 215], [128, 210], [112, 192]],
  ],
  'ذ': [
    [[178, 188], [158, 215], [128, 210], [112, 192]],
    [[145, 162]],
  ],

  // ── ر — small hook at top-right, then diagonal down-left ─────
  'ر': [
    [[160, 148], [168, 160], [158, 192], [142, 248]],
  ],
  'ز': [
    [[160, 148], [168, 160], [158, 192], [142, 248]],
    [[155, 122]],
  ],
  'ژ': [
    [[160, 148], [168, 160], [158, 192], [142, 248]],
    [[130, 122]], [[148, 112]], [[165, 122]],
  ],

  // ── س — start lower-right, go UP then sweep LEFT ────────────
  'س': [
    [[185, 210], [175, 182], [158, 205], [142, 182], [124, 208], [108, 182]],
  ],
  'ش': [
    [[185, 210], [175, 182], [158, 205], [142, 182], [124, 208], [108, 182]],
    [[120, 150]], [[138, 140]], [[155, 150]],
  ],

  // ── ف ────────────────────────────────────────────────────────
  // ── ف — counterclockwise loop (right→down→left→up) then dot ─
  'ف': [
    [[165, 158], [178, 172], [172, 195], [148, 205], [122, 195], [112, 172], [118, 148], [142, 135], [165, 142]],
    [[145, 118]],
  ],

  // ── ق ────────────────────────────────────────────────────────
  'ق': [
    [[168, 165], [148, 152], [125, 162], [118, 185], [130, 215], [150, 225], [172, 215], [178, 188], [168, 165]],
    [[130, 130]], [[168, 130]],
  ],

  // ── ک / گ ────────────────────────────────────────────────────
  'ک': [
    [[152, 88], [150, 165], [148, 238]],
    [[168, 130], [152, 148]],
  ],
  'گ': [
    [[152, 88], [150, 165], [148, 238]],
    [[168, 118], [152, 135]],
    [[168, 108]],
  ],

  // ── ل — tall down then loop right at bottom ──────────────────
  'ل': [
    [[150, 82], [146, 155], [140, 215], [145, 242], [162, 248], [172, 235], [165, 218]],
  ],

  // ── م ────────────────────────────────────────────────────────
  'م': [
    [[165, 175], [142, 158], [118, 168], [118, 190], [145, 202], [168, 192], [168, 175], [148, 180]],
  ],

  // ── ن ────────────────────────────────────────────────────────
  'ن': [
    [[178, 170], [148, 192], [118, 172]],
    [[148, 140]],
  ],

  // ── و — clockwise hook: start right, go down, curve left ─────
  'و': [
    [[168, 148], [178, 170], [175, 200], [155, 218], [132, 210], [118, 228]],
  ],

  // ── ه ────────────────────────────────────────────────────────
  'ه': [
    [[155, 155], [130, 140], [112, 155], [112, 178], [135, 192], [160, 184], [168, 165], [155, 155]],
  ],

  // ── ی ────────────────────────────────────────────────────────
  'ی': [
    [[182, 168], [148, 185], [115, 168], [105, 192], [112, 228], [142, 248], [172, 235]],
    [[130, 268]], [[162, 268]],
  ],

  // ── او (long oo: alef + vav) ──────────────────────────────
  'او': [
    [[165, 88], [164, 168], [162, 252]],    // alef stem
    [[138, 148], [125, 168], [122, 198], [132, 218], [112, 208]], // vav hook
  ],

  // ── ض ────────────────────────────────────────────────────────
  'ض': [
    [[175, 175], [152, 188], [125, 178], [112, 195], [100, 178]], // zigzag base
    [[148, 142]],                             // dot above
  ],

  // ── ط — bowl (right side ↓, across bottom →, left side ↑) then vertical ↓
  'ط': [
    [[172, 158], [178, 185], [162, 210], [138, 210], [118, 185], [122, 158]], // bowl ccw
    [[150, 90], [150, 160]],               // vertical stick ↓
  ],

  // ── ع ────────────────────────────────────────────────────────
  'ع': [
    [[162, 145], [145, 132], [125, 145], [122, 168], [140, 185], [162, 178], [170, 158], [165, 145]], // upper loop
    [[148, 188], [138, 215], [148, 238], [168, 232]],  // tail
  ],

  // ── غ (like ع + dot above) ───────────────────────────────────
  'غ': [
    [[162, 145], [145, 132], [125, 145], [122, 168], [140, 185], [162, 178], [170, 158], [165, 145]],
    [[148, 188], [138, 215], [148, 238], [168, 232]],
    [[148, 112]],                             // dot above
  ],
};

function waypointsToSVGPath(pts: [number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
}

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

// Strip tatweel (U+0640) and Arabic diacritics/harakat (U+064B–U+065F)
// so 'بـ'→'ب', 'اُ'→'ا', 'اَ'→'ا' etc. all hit the correct STROKE_PATHS entry
function normalizeLetter(l: string): string {
  return l.replace(/[ـً-ٟ]/g, '');
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
  const lastCheckRef = useRef(0);

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

  const buildMask = useCallback(() => {
    const mask = document.createElement('canvas');
    mask.width = SIZE; mask.height = SIZE;
    const ctx = mask.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.font = `bold ${fontSize}px Vazirmatn, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, SIZE / 2, cy);
    const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
    let cnt = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 128) cnt++;
    totalRef.current = cnt;
    return mask;
  }, [letter, fontSize, cy]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const paint = paintRef.current;
    const mask = maskRef.current;
    const temp = tempRef.current;
    if (!canvas || !paint || !mask || !temp) return;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#fdf4ff';
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = '#ede9fe';
    ctx.font = `bold ${fontSize}px Vazirmatn, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, SIZE / 2, cy);

    const tCtx = temp.getContext('2d')!;
    tCtx.clearRect(0, 0, SIZE, SIZE);
    tCtx.drawImage(paint, 0, 0);
    tCtx.globalCompositeOperation = 'destination-in';
    tCtx.drawImage(mask, 0, 0);
    tCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(temp, 0, 0);

    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 1.5;
    ctx.strokeText(letter, SIZE / 2, cy);
  }, [letter, fontSize, cy]);

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
    pCtx.fillStyle = PEN_COLOR;
    pCtx.beginPath();
    pCtx.arc(x, y, BRUSH_R, 0, Math.PI * 2);
    pCtx.fill();
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
      // Coverage mode fallback
      const now = Date.now();
      if (now - lastCheckRef.current < 120) return;
      lastCheckRef.current = now;
      if (totalRef.current === 0) return;
      const mCtx = mask.getContext('2d')!;
      const pData = pCtx.getImageData(0, 0, SIZE, SIZE).data;
      const mData = mCtx.getImageData(0, 0, SIZE, SIZE).data;
      let painted = 0;
      for (let i = 3; i < mData.length; i += 4) {
        if (mData[i] > 128 && pData[i] > 128) painted++;
      }
      const pct = Math.round((painted / totalRef.current) * 100);
      setCoverage(pct);
      if (pct >= 94) complete();
    }
  }, [render, complete, allStrokes]);

  // On finger/mouse lift: if current stroke just finished, advance to next stroke
  const handleDrawEnd = useCallback(() => {
    drawingRef.current = false;
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
        {allStrokes && allStrokes.length > 1
          ? `حرف را بنویس (خط ${currentStroke + 1} از ${allStrokes.length})`
          : 'حرف را روی راهنما بنویس'}
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

      <div className="w-64 h-3 bg-violet-100 rounded-full overflow-hidden">
        <div className="h-full bg-violet-500 rounded-full transition-all duration-150" style={{ width: `${coverage}%` }} />
      </div>

      <div className="flex gap-3">
        {!done && (
          <button onClick={clearCanvas} className="border-2 border-gray-300 text-gray-600 font-bold py-3 px-6 rounded-2xl active:scale-95 transition-transform">
            پاک کن
          </button>
        )}
        {done && <p className="text-violet-600 font-extrabold text-2xl">آفرین! ✍️</p>}
      </div>
    </div>
  );
};

export default Q6_Handwriting;
