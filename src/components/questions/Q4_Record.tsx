import React, { useState, useRef } from 'react';
import type { Question } from '../../types';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

type Status = 'idle' | 'listening' | 'result';

const normalize = (s: string) =>
  s.trim().replace(/\s+/g, '').replace(/[ً-ٟ]/g, '');

const Q4_Record: React.FC<Props> = ({ question, onAnswer }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const recRef = useRef<any>(null);
  const gotResultRef = useRef(false);

  const SR: any = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

  const startRecording = () => {
    if (!SR || status !== 'idle') return;
    setTranscript('');
    setCorrect(null);
    gotResultRef.current = false;

    const rec = new SR();
    recRef.current = rec;
    rec.lang = 'fa-IR';
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    rec.continuous = false; // auto-stop after speech ends

    rec.onstart = () => setStatus('listening');

    rec.onresult = (e: any) => {
      gotResultRef.current = true;
      const lastResult = e.results[e.results.length - 1];
      const alts: string[] = Array.from(lastResult).map((r: any) => normalize(r.transcript));
      const expected = normalize(String(question.correctAnswer));
      const heard = alts[0] || '';
      // heard must contain expected (not the reverse — prevents ambient noise false-positives)
      const ok = heard.length >= expected.length &&
        alts.some((a) => a.length >= expected.length && a.includes(expected));
      setTranscript(heard);
      setCorrect(ok);
      setStatus('result');
    };

    rec.onerror = () => setStatus('idle');
    rec.onend = () => {
      if (!gotResultRef.current) setStatus('idle');
    };

    rec.start();
  };

  const stopRecording = () => {
    const rec = recRef.current;
    if (!rec) return;
    try { rec.stop(); } catch { /* ignore */ }
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

  return (
    <div className="flex flex-col items-center gap-6 py-4 flex-1 justify-center">
      {/* Target word */}
      <div className="text-center">
        <p className="text-gray-500 text-sm mb-2">این کلمه را بلند بگو:</p>
        <p className="text-6xl font-extrabold text-violet-700">{String(question.correctAnswer)}</p>
      </div>

      {/* IDLE: tap mic to start */}
      {status === 'idle' && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={startRecording}
            className="w-28 h-28 rounded-full bg-violet-600 flex items-center justify-center shadow-xl active:scale-95 transition-transform"
          >
            <svg width="46" height="46" viewBox="0 0 24 24" fill="white">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          </button>
          <p className="text-gray-400 text-sm">دکمه میکروفن را بزن و بگو</p>
        </div>
      )}

      {/* LISTENING: pulsing indicator + stop button */}
      {status === 'listening' && (
        <div className="flex flex-col items-center gap-4 w-full px-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <p className="text-red-500 font-bold">در حال ضبط...</p>
          </div>
          <button
            onClick={stopRecording}
            className="w-full py-4 rounded-3xl bg-emerald-500 text-white font-extrabold text-xl shadow-lg active:scale-95 transition-transform"
          >
            تموم شد ✓
          </button>
        </div>
      )}

      {/* RESULT: feedback card + action buttons */}
      {status === 'result' && correct !== null && (
        <div className="flex flex-col items-center gap-4 w-full px-4">
          <div className={`w-full rounded-3xl py-5 px-4 text-center ${correct ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-red-50 border-2 border-red-200'}`}>
            <p className={`font-extrabold text-2xl mb-1 ${correct ? 'text-emerald-600' : 'text-red-500'}`}>
              {correct ? 'آفرین! ✅' : 'دقیق‌تر بگو ❌'}
            </p>
            {transcript && (
              <p className="text-gray-400 text-sm">شنیدم: <span className="font-bold text-gray-600">{transcript}</span></p>
            )}
          </div>

          {correct ? (
            <button onClick={() => onAnswer(true)} className="w-full btn-primary py-4 text-lg">
              ادامه ←
            </button>
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
