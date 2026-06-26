import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Question } from '../../types';

const SIZE = 300;
const BRUSH_R = 9;
const HIT_RADIUS = 32;        // px in canvas space — how close counts as "on waypoint"
const PEN_COLOR = '#4c1d95';  // violet-900

// Path-following waypoints in 300×300 canvas space.
// Tuned for Vazirmatn bold fontSize=234, centered x=150, cy=186.
// آ: madda arc (right → top → left) then stem downward.
// ا: stem only, top → bottom.
const STROKE_PATHS: Record<string, [number, number][]> = {
  'آ': [[174, 74], [150, 52], [126, 74], [149, 155], [148, 252]],
  'ا': [[150, 85], [149, 168], [148, 252]],
};

function waypointsToSVGPath(pts: [number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
}

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

const Q6_Handwriting: React.FC<Props> = ({ question, onAnswer }) => {
  const letter = String(question.correctAnswer);
  const strokePts = STROKE_PATHS[letter] ?? null;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintRef = useRef<HTMLCanvasElement | null>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const tempRef = useRef<HTMLCanvasElement | null>(null);
  const totalRef = useRef(0);
  const doneRef = useRef(false);
  const drawingRef = useRef(false);
  const lastCheckRef = useRef(0);

  const [coverage, setCoverage] = useState(0);
  const [done, setDone] = useState(false);
  const [guideVisible, setGuideVisible] = useState(true);
  // path-following state
  const [nextWpt, setNextWpt] = useState(0);
  const nextWptRef = useRef(0);

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

    // User strokes clipped to letter area
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

    if (strokePts) {
      // Path-following mode: check if user hit the next waypoint
      const idx = nextWptRef.current;
      if (idx < strokePts.length) {
        const [wx, wy] = strokePts[idx];
        const dx = x - wx, dy = y - wy;
        if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) {
          const next = idx + 1;
          nextWptRef.current = next;
          setNextWpt(next);
          setCoverage(Math.round((next / strokePts.length) * 100));
          if (next >= strokePts.length) complete();
        }
      }
    } else {
      // Coverage mode (fallback for letters without a defined path)
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
  }, [render, complete, strokePts]);

  const clearCanvas = useCallback(() => {
    if (doneRef.current) return;
    const paint = paintRef.current;
    if (!paint) return;
    paint.getContext('2d')!.clearRect(0, 0, SIZE, SIZE);
    setCoverage(0);
    setGuideVisible(true);
    nextWptRef.current = 0;
    setNextWpt(0);
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

  // SVG paths
  const fullSvgPath = strokePts ? waypointsToSVGPath(strokePts) : null;
  const doneSvgPath = strokePts && nextWpt > 0
    ? waypointsToSVGPath(strokePts.slice(0, nextWpt + 1))
    : null;
  const startPt = strokePts?.[0];
  const currentTarget = strokePts && nextWpt < strokePts.length ? strokePts[nextWpt] : null;

  return (
    <div className="flex flex-col items-center gap-4 flex-1 justify-center">
      <p className="text-gray-500 text-sm">حرف را روی راهنما بنویس</p>

      <div className="relative rounded-3xl overflow-hidden shadow-lg border-2 border-violet-200" style={{ width: 280, height: 280 }}>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="w-full h-full touch-none"
          onTouchStart={(e) => { e.preventDefault(); const t = e.touches[0]; const p = canvasPos(t.clientX, t.clientY); if (p) handleDrawStart(p.x, p.y); }}
          onTouchMove={(e) => { e.preventDefault(); if (!drawingRef.current) return; const t = e.touches[0]; const p = canvasPos(t.clientX, t.clientY); if (p) drawAt(p.x, p.y); }}
          onTouchEnd={() => { drawingRef.current = false; }}
          onMouseDown={(e) => { const p = canvasPos(e.clientX, e.clientY); if (p) handleDrawStart(p.x, p.y); }}
          onMouseMove={(e) => { if (!drawingRef.current) return; const p = canvasPos(e.clientX, e.clientY); if (p) drawAt(p.x, p.y); }}
          onMouseUp={() => { drawingRef.current = false; }}
          onMouseLeave={() => { drawingRef.current = false; }}
        />

        {fullSvgPath && !done && (
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
                  offset-path: path('${fullSvgPath}');
                  animation: travelDot 1.8s ease-in-out infinite;
                }
              `}</style>
            )}

            {/* Dashed guide — full path */}
            <path
              d={fullSvgPath}
              stroke="#7c3aed"
              strokeWidth="6"
              strokeDasharray="10 7"
              fill="none"
              opacity="0.3"
              strokeLinecap="round"
            />

            {/* Completed portion — solid */}
            {doneSvgPath && (
              <path
                d={doneSvgPath}
                stroke="#7c3aed"
                strokeWidth="6"
                fill="none"
                opacity="0.7"
                strokeLinecap="round"
              />
            )}

            {/* Animated guide dot (before drawing starts) */}
            {guideVisible && startPt && (
              <>
                <circle cx={startPt[0]} cy={startPt[1]} r="10" fill="#7c3aed" opacity="0.7">
                  <animate attributeName="r" values="10;14;10" dur="1.1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0.35;0.7" dur="1.1s" repeatCount="indefinite" />
                </circle>
                <circle r="9" fill="#7c3aed" className="travel-dot" />
              </>
            )}

            {/* Current target waypoint — pulsing ring */}
            {!guideVisible && currentTarget && (
              <circle cx={currentTarget[0]} cy={currentTarget[1]} r="14" fill="none" stroke="#7c3aed" strokeWidth="3" opacity="0.6">
                <animate attributeName="r" values="14;20;14" dur="0.9s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="0.9s" repeatCount="indefinite" />
              </circle>
            )}
          </svg>
        )}
      </div>

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
