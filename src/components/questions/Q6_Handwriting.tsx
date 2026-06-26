import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Question } from '../../types';

const SIZE = 300;
const BRUSH_R = 9;
const COVERAGE_THRESHOLD = 94; // high enough to require dot coverage on dotted letters (ب etc.)
const PEN_COLOR = '#4c1d95'; // violet-900

// Stroke guide paths per letter: array of [x,y] waypoints in 300×300 canvas space.
// Coordinates tuned for Vazirmatn bold at fontSize=234, centered x=150, cy=186.
const STROKE_PATHS: Record<string, [number, number][]> = {
  'آ': [[152, 72], [150, 160], [148, 252]],   // alef-madda: single top-to-bottom stroke
  'ا': [[152, 88], [150, 170], [148, 252]],   // alef: single top-to-bottom stroke
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

    // Background
    ctx.fillStyle = '#fdf4ff';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Letter guide (very faint)
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

    // Letter outline on top
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
    if (!paint || !mask || totalRef.current === 0) return;

    const pCtx = paint.getContext('2d')!;
    pCtx.fillStyle = PEN_COLOR;
    pCtx.beginPath();
    pCtx.arc(x, y, BRUSH_R, 0, Math.PI * 2);
    pCtx.fill();
    render();

    const now = Date.now();
    if (now - lastCheckRef.current < 120) return;
    lastCheckRef.current = now;

    const mCtx = mask.getContext('2d')!;
    const pData = pCtx.getImageData(0, 0, SIZE, SIZE).data;
    const mData = mCtx.getImageData(0, 0, SIZE, SIZE).data;
    let painted = 0;
    for (let i = 3; i < mData.length; i += 4) {
      if (mData[i] > 128 && pData[i] > 128) painted++;
    }
    const pct = Math.round((painted / totalRef.current) * 100);
    setCoverage(pct);
    if (pct >= COVERAGE_THRESHOLD) complete();
  }, [render, complete]);

  const clearCanvas = useCallback(() => {
    if (doneRef.current) return;
    const paint = paintRef.current;
    if (!paint) return;
    paint.getContext('2d')!.clearRect(0, 0, SIZE, SIZE);
    setCoverage(0);
    setGuideVisible(true);
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

  const strokePts = STROKE_PATHS[letter];
  const svgPath = strokePts ? waypointsToSVGPath(strokePts) : null;
  const startPt = strokePts?.[0];
  const endPt = strokePts?.[strokePts.length - 1];

  const handleDrawStart = useCallback((x: number, y: number) => {
    setGuideVisible(false);
    drawingRef.current = true;
    drawAt(x, y);
  }, [drawAt]);

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

        {/* Stroke-direction guide overlay — hidden once user starts drawing */}
        {svgPath && guideVisible && !done && (
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <style>{`
              @keyframes travelDot {
                0%   { offset-distance: 0%;   opacity: 1; }
                85%  { offset-distance: 100%; opacity: 1; }
                100% { offset-distance: 100%; opacity: 0; }
              }
              .travel-dot {
                offset-path: path('${svgPath}');
                animation: travelDot 1.6s ease-in-out infinite;
              }
            `}</style>

            {/* Dashed guide path */}
            <path
              d={svgPath}
              stroke="#7c3aed"
              strokeWidth="5"
              strokeDasharray="10 7"
              fill="none"
              opacity="0.35"
              strokeLinecap="round"
            />

            {/* Start-point circle */}
            {startPt && (
              <circle cx={startPt[0]} cy={startPt[1]} r="9" fill="#7c3aed" opacity="0.75">
                <animate attributeName="r" values="9;12;9" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.75;0.4;0.75" dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Arrowhead at end point */}
            {endPt && (
              <polygon
                points={`${endPt[0]},${endPt[1] + 14} ${endPt[0] - 7},${endPt[1]} ${endPt[0] + 7},${endPt[1]}`}
                fill="#7c3aed"
                opacity="0.5"
              />
            )}

            {/* Animated travelling dot */}
            <circle r="8" fill="#7c3aed" className="travel-dot" />
          </svg>
        )}
      </div>

      <div className="w-64 h-3 bg-violet-100 rounded-full overflow-hidden">
        <div className="h-full bg-violet-500 rounded-full transition-all duration-100" style={{ width: `${coverage}%` }} />
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
