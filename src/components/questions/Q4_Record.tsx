import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Question } from '../../types';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

type PermState = 'checking' | 'need_permission' | 'requesting' | 'granted' | 'denied';
type Status = 'idle' | 'listening' | 'processing' | 'result';

const normalize = (s: string) =>
  s.trim().replace(/\s+/g, '').replace(/[ً-ٟ]/g, '');

const check = (alts: string[], expected: string): boolean => {
  // Single letter: accept any word that contains or starts with the letter
  // (SR can't reliably detect a standalone short vowel like "آ")
  if (expected.length === 1) return alts.some((a) => a.length > 0 && a.includes(expected));
  // Two chars: accept startsWith (e.g. "آه" for "آه")
  if (expected.length === 2) return alts.some((a) => a.startsWith(expected));
  // Words: accept if any alt contains the expected word
  return alts.some((a) => a.length >= expected.length && a.includes(expected));
};

const MicIcon = ({ color = 'white', size = 46 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
  </svg>
);

const Q4_Record: React.FC<Props> = ({ question, onAnswer }) => {
  const [permState, setPermState] = useState<PermState>('checking');
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [debugMsg, setDebugMsg] = useState('');
  const recRef = useRef<any>(null);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SR: any = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

  const clearSafety = () => {
    if (safetyRef.current) { clearTimeout(safetyRef.current); safetyRef.current = null; }
  };

  // Ask mic permission via getUserMedia (shows real browser dialog)
  useEffect(() => {
    if (!SR) return;
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then((s) => { s.getTracks().forEach((t) => t.stop()); setPermState('granted'); })
      .catch((err) => {
        const name = (err as Error).name || '';
        setPermState(name === 'NotAllowedError' || name === 'PermissionDeniedError' ? 'denied' : 'need_permission');
      });
  }, []);

  const requestPermission = useCallback(async () => {
    setPermState('requesting');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      setPermState('granted');
    } catch {
      setPermState('denied');
    }
  }, []);

  const startListening = useCallback(() => {
    if (status !== 'idle' || !SR) return;
    setDebugMsg('');
    setTranscript('');
    setCorrect(null);
    setStatus('listening');

    const rec = new SR();
    recRef.current = rec;
    rec.lang = 'fa-IR';
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    rec.continuous = false; // auto-stop after speech detected + silence

    rec.onresult = (ev: any) => {
      clearSafety();
      const lastResult = ev.results[ev.results.length - 1];
      const alts: string[] = Array.from(lastResult).map((r: any) => normalize(r.transcript));
      const expected = normalize(String(question.correctAnswer));
      const heard = alts[0] || '';
      const ok = heard.length > 0 && check(alts, expected);
      setTranscript(heard);
      setCorrect(ok);
      setStatus('result');
    };

    rec.onerror = (ev: any) => {
      clearSafety();
      const code: string = ev.error || 'unknown';
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setPermState('denied');
        setStatus('idle');
      } else {
        setDebugMsg(`(${code})`);
        setStatus('idle');
      }
    };

    rec.onend = () => {
      clearSafety();
      setStatus((prev) => {
        if (prev === 'listening' || prev === 'processing') {
          setDebugMsg('(no-result)');
          return 'idle';
        }
        return prev;
      });
    };

    // Safety: abort after 15s
    safetyRef.current = setTimeout(() => {
      try { rec.abort(); } catch {}
      setStatus('idle');
      setDebugMsg('(timeout)');
    }, 15000);

    rec.start();
  }, [status, question.correctAnswer, SR]);

  // On press: start recording
  const handlePressStart = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startListening();
  }, [startListening]);

  // On release: switch visual to "processing" — do NOT call rec.stop()
  // Chrome auto-detects silence and fires onresult itself
  const handlePressEnd = useCallback(() => {
    if (status !== 'listening') return;
    setStatus('processing');
  }, [status]);

  const retry = () => {
    setStatus('idle');
    setTranscript('');
    setCorrect(null);
    setDebugMsg('');
  };

  if (!SR) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 px-4">
        <p className="text-gray-500 text-sm text-center">
          مرورگر شما از ضبط صدا پشتیبانی نمی‌کند
          <br /><span className="text-xs">(Chrome یا Edge توصیه میشه)</span>
        </p>
        <button onClick={() => onAnswer(false)} className="btn-secondary text-sm py-2 px-6">رد شدن</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4 flex-1 justify-center">
      <div className="text-center">
        <p className="text-gray-500 text-sm mb-2">این کلمه را بلند بگو:</p>
        <p className="text-6xl font-extrabold text-violet-700">{String(question.correctAnswer)}</p>
      </div>

      {/* Permission: auto-check on mount via getUserMedia */}
      {permState === 'checking' && (
        <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center animate-pulse">
          <MicIcon color="#9ca3af" />
        </div>
      )}

      {permState === 'need_permission' && (
        <div className="flex flex-col items-center gap-3">
          <button onClick={requestPermission}
            className="w-28 h-28 rounded-full bg-violet-600 flex items-center justify-center shadow-xl active:scale-95 transition-transform">
            <MicIcon />
          </button>
          <p className="text-violet-600 text-sm font-bold text-center px-6">روی میکروفن بزن تا دسترسی بده</p>
        </div>
      )}

      {permState === 'requesting' && (
        <div className="w-28 h-28 rounded-full bg-violet-400 flex items-center justify-center animate-pulse">
          <MicIcon />
        </div>
      )}

      {permState === 'denied' && (
        <div className="flex flex-col items-center gap-3 px-4 text-center">
          <div className="w-28 h-28 rounded-full bg-red-100 flex items-center justify-center">
            <MicIcon color="#ef4444" />
          </div>
          <p className="text-red-500 text-sm font-bold">دسترسی میکروفن مسدود شده</p>
          <p className="text-gray-400 text-xs leading-relaxed">
            آیکون 🔒 کنار آدرس → Microphone → Allow
            <br />بعد صفحه رو رفرش کن
          </p>
          <div className="flex gap-3 mt-2">
            <button onClick={requestPermission} className="btn-secondary text-sm py-2 px-4">تلاش مجدد</button>
            <button onClick={() => onAnswer(false)} className="btn-secondary text-sm py-2 px-4">رد شدن</button>
          </div>
        </div>
      )}

      {permState === 'granted' && status !== 'result' && (
        <div className="flex flex-col items-center gap-3">
          <button
            onPointerDown={handlePressStart}
            onPointerUp={handlePressEnd}
            onPointerCancel={handlePressEnd}
            disabled={status === 'processing'}
            className={`w-28 h-28 rounded-full flex items-center justify-center shadow-xl transition-all select-none
              ${status === 'listening'
                ? 'bg-red-500 scale-110 animate-pulse'
                : status === 'processing'
                  ? 'bg-orange-400 cursor-wait'
                  : 'bg-violet-600 active:scale-95'}`}
            style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
          >
            <MicIcon />
          </button>

          {status === 'listening' && <p className="text-red-500 font-bold animate-pulse">🎙 داری میگی... رها کن</p>}
          {status === 'processing' && <p className="text-orange-500 font-bold animate-pulse">⏳ صبر کن...</p>}
          {status === 'idle' && debugMsg && (
            <p className="text-amber-600 text-sm font-bold text-center px-4">
              چیزی نشنیدم — دوباره نگه‌دار و بگو
              <br /><span className="text-xs text-gray-400">{debugMsg}</span>
            </p>
          )}
          {status === 'idle' && !debugMsg && (
            <p className="text-gray-400 text-sm text-center">نگه‌دار ← بگو ← رها کن</p>
          )}
        </div>
      )}

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
