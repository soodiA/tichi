import React, { useRef, useState, useEffect } from 'react';
import type { Question } from '../../types';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

const Q6_Handwriting: React.FC<Props> = ({ question, onAnswer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFF8F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#7C3AED';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    setIsDrawing(true);
    lastPos.current = pos;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    if (!pos || !lastPos.current) return;

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasDrawn(true);
  };

  const stopDraw = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFF8F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirm = () => {
    if (!hasDrawn) return;
    // Any non-empty drawing is accepted (recognition is future work)
    onAnswer(true);
    clearCanvas();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Guide letter */}
      <div className="text-center">
        <span className="text-7xl font-extrabold text-gray-200 select-none">
          {String(question.correctAnswer)}
        </span>
        <p className="text-gray-500 text-sm mt-1">این حرف را در کادر زیر بنویس</p>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={340}
        height={240}
        className="border-4 border-violet-200 rounded-3xl touch-none w-full max-w-sm cursor-crosshair"
        style={{ background: '#FFF8F0' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />

      <div className="flex gap-3 w-full">
        <button
          type="button"
          onClick={clearCanvas}
          className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-3 px-4 rounded-2xl active:scale-95 transition-transform"
        >
          پاک کن
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!hasDrawn}
          className="flex-1 btn-primary py-3"
        >
          تأیید
        </button>
      </div>
    </div>
  );
};

export default Q6_Handwriting;
