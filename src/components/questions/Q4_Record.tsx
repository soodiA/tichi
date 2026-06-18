import React, { useState, useRef } from 'react';
import type { Question } from '../../types';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

type Status = 'idle' | 'listening' | 'result';

const normalize = (s: string) =>
  s.trim().replace(/\s+/g, '').replace(/[ً-ٟ]/g, ''); // strip diacritics + spaces

const Q4_Record: React.FC<Props> = ({ question, onAnswer }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const recRef = useRef<any>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR: any = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

  const handleRecord = () => {
    if (status === 'listening' || !SR) return;
    setTranscript('');
    setCorrect(null);

    const rec = new SR();
    recRef.current = rec;
    rec.lang = 'fa-IR';
    rec.interimResults = false;
    rec.maxAlternatives = 5;

    rec.onstart = () => setStatus('listening');

    rec.onresult = (e: any) => {
      const alts: string[] = Array.from(e.results[0]).map((r: any) => normalize(r.transcript));
      const expected = normalize(String(question.correctAnswer));
      const heard = alts[0] || '';
      const ok = alts.some((a) => a.includes(expected) || expected.includes(a));
      setTranscript(heard);
      setCorrect(ok);
      setStatus('result');
      setTimeout(() => onAnswer(ok), 1400);
    };

    rec.onerror = () => setStatus('idle');
    rec.onend = () => { /* handled by onresult */ };

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

  return (
    <div className="flex flex-col items-center gap-6 py-4 flex-1 justify-center">
      {/* Target word */}
      <div className="text-center">
        <p className="text-gray-500 text-sm mb-2">این کلمه را بلند بگو:</p>
        <p className="text-6xl font-extrabold text-violet-700">{String(question.correctAnswer)}</p>
      </div>

      {/* Mic button */}
      {status !== 'result' && (
        <button
          onClick={handleRecord}
          disabled={status === 'listening'}
          className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95
            ${status === 'listening' ? 'bg-red-500 animate-pulse scale-110' : 'bg-violet-600'}`}
        >
          <svg width="42" height="42" viewBox="0 0 24 24" fill="white">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
          </svg>
        </button>
      )}

      {status === 'listening' && (
        <p className="text-red-500 font-bold animate-pulse">در حال ضبط...</p>
      )}

      {/* Result */}
      {status === 'result' && correct !== null && (
        <div className="flex flex-col items-center gap-4">
          <p className={`font-extrabold text-2xl ${correct ? 'text-emerald-600' : 'text-red-500'}`}>
            {correct ? 'آفرین! ✅' : 'دقیق‌تر بگو ❌'}
          </p>
          {transcript && (
            <p className="text-gray-400 text-sm">شنیدم: <span className="font-bold text-gray-600">{transcript}</span></p>
          )}
          {!correct && (
            <div className="flex gap-3">
              <button onClick={retry} className="btn-secondary py-3 px-6">دوباره</button>
              <button onClick={() => onAnswer(false)} className="py-3 px-6 rounded-2xl bg-red-100 text-red-600 font-bold active:scale-95 transition-transform">رد شدن</button>
            </div>
          )}
        </div>
      )}

      {status === 'idle' && correct === null && (
        <p className="text-gray-400 text-sm">دکمه میکروفن را بزن و کلمه را بگو</p>
      )}
    </div>
  );
};

export default Q4_Record;
