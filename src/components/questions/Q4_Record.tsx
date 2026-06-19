import React, { useState, useRef, useEffect } from 'react';
import type { Question } from '../../types';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

type Status = 'idle' | 'requesting' | 'listening' | 'result';

const normalize = (s: string) =>
  s.trim().replace(/\s+/g, '').replace(/[ً-ٟ]/g, '');

const Q4_Record: React.FC<Props> = ({ question, onAnswer }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [micBlocked, setMicBlocked] = useState(false);
  const recRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SR: any = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

  // Clear timeout on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const startRecording = async () => {
    if (!SR || status !== 'idle') return;

    // Request mic permission explicitly first so no popup interrupts recording
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop()); // permission only, stop stream
    } catch {
      setMicBlocked(true);
      setStatus('idle');
      return;
    }

    setTranscript('');
    setCorrect(null);

    const rec = new SR();
    recRef.current = rec;
    rec.lang = 'fa-IR';
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    rec.continuous = false;

    rec.onstart = () => {
      setStatus('listening');
      // Safety timeout: reset after 12s if nothing heard
      timerRef.current = setTimeout(() => {
        try { rec.abort(); } catch { /* ignore */ }
        setStatus('idle');
      }, 12000);
    };

    rec.onresult = (e: any) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const lastResult = e.results[e.results.length - 1];
      const alts: string[] = Array.from(lastResult).map((r: any) => normalize(r.transcript));
      const expected = normalize(String(question.correctAnswer));
      const heard = alts[0] || '';

      const ok = heard.length > 0 && (
        expected.length <= 2
          ? alts.some((a) => a === expected)
          : alts.some((a) => a.length >= expected.length && a.includes(expected))
      );

      setTranscript(heard);
      setCorrect(ok);
      setStatus('result');
    };

    rec.onerror = (e: any) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (e.error === 'not-allowed') setMicBlocked(true);
      setStatus('idle');
    };

    rec.onend = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // if no result came, just go back to idle
      setStatus((prev) => prev === 'listening' ? 'idle' : prev);
    };

    rec.start();
  };

  const retry = () => {
    setStatus('idle');
    setTranscript('');
    setCorrect(null);
  };

  if (!SR) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <p className="text-gray-400 text-sm text-center">مرورگر شما از ضبط صدا پشتیبانی نمی‌کند</p>
        <button onClick={() => onAnswer(false)} className="btn-secondary text-sm py-2 px-6">رد شدن</button>
      </div>
    );
  }

  if (micBlocked) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 px-4">
        <p className="text-4xl">🎙️</p>
        <p className="text-gray-700 font-bold text-center">دسترسی به میکروفن لازم است</p>
        <p className="text-gray-400 text-sm text-center">در تنظیمات مرورگر دسترسی میکروفن را فعال کن و دوباره بزن</p>
        <button onClick={() => { setMicBlocked(false); }} className="btn-secondary py-3 px-6">دوباره امتحان</button>
        <button onClick={() => onAnswer(false)} className="text-gray-400 text-sm">رد شدن</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4 flex-1 justify-center">
      {/* Target word */}
      <div className="text-center">
        <p className="text-gray-500 text-sm mb-2">این کلمه را بلند بگو:</p>
        <p className="text-6xl font-extrabold text-violet-700">{String(question.correctAnswer)}</p>
      </div>

      {/* MIC BUTTON */}
      {(status === 'idle' || status === 'requesting' || status === 'listening') && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={startRecording}
            disabled={status !== 'idle'}
            className={`w-28 h-28 rounded-full flex items-center justify-center shadow-xl transition-all
              ${status === 'listening'
                ? 'bg-red-500 scale-110 animate-pulse cursor-not-allowed'
                : status === 'requesting'
                  ? 'bg-violet-300 cursor-wait'
                  : 'bg-violet-600 active:scale-95'}`}
          >
            <svg width="46" height="46" viewBox="0 0 24 24" fill="white">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          </button>

          {status === 'listening' && <p className="text-red-500 font-bold animate-pulse">گوش میدم...</p>}
          {status === 'requesting' && <p className="text-violet-400 text-sm animate-pulse">در حال آماده‌سازی...</p>}
          {status === 'idle' && <p className="text-gray-400 text-sm">میکروفن را بزن و کلمه را بگو</p>}
        </div>
      )}

      {/* RESULT */}
      {status === 'result' && correct !== null && (
        <div className="flex flex-col items-center gap-4 w-full px-4">
          <div className={`w-full rounded-3xl py-5 px-4 text-center ${correct ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-red-50 border-2 border-red-200'}`}>
            <p className={`font-extrabold text-2xl mb-1 ${correct ? 'text-emerald-600' : 'text-red-500'}`}>
              {correct ? 'آفرین! ✅' : 'دقیق‌تر بگو ❌'}
            </p>
            <p className="text-gray-400 text-sm">
              شنیدم: <span className="font-bold text-gray-600">{transcript || '(چیزی نشنیدم)'}</span>
            </p>
          </div>

          {correct ? (
            <button onClick={() => onAnswer(true)} className="w-full btn-primary py-4 text-lg">ادامه ←</button>
          ) : (
            <div className="flex gap-3 w-full">
              <button onClick={retry} className="flex-1 btn-secondary py-4">دوباره</button>
              <button onClick={() => onAnswer(false)} className="flex-1 py-4 rounded-2xl bg-red-100 text-red-600 font-bold active:scale-95 transition-transform">رد شدن</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Q4_Record;
