import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Mascot from '../ui/Mascot';
import { getComboClipUrl } from '../../lib/clipAudio';
import { YE_WORDS, YE_RULE } from '../../data/yeWords';

const ACCENT = '#E11D48';
const BG = '#FFF1F2';

interface Props {
  onClose: () => void;
}

// Plays one piece of text (recorded word/letter clip if there is one, else browser TTS)
// and resolves when it has finished (or after a safety timeout), so pieces can be chained.
function speak(text: string, cancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    (async () => {
      if (cancelled()) return resolve();
      const url = await getComboClipUrl(text).catch(() => undefined);
      if (cancelled()) return resolve();
      const done = () => resolve();
      if (url) {
        const a = new Audio(url);
        a.onended = done;
        a.onerror = done;
        a.play().catch(done);
        setTimeout(done, 8000);
        return;
      }
      if (!window.speechSynthesis) return done();
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fa-IR';
      u.rate = 0.8;
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
      setTimeout(done, 6000);
    })();
  });
}

const YeWordsLesson: React.FC<Props> = ({ onClose }) => {
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState<number | 'word' | null>(null);
  const runId = useRef(0);
  const isRule = index === 0;
  const item = YE_WORDS[Math.max(0, index - 1)];
  const isLast = index === YE_WORDS.length;

  // part by part, then the whole word
  const playAll = useCallback(async () => {
    const id = ++runId.current;
    const stale = () => runId.current !== id;
    if (isRule) {
      setActive(null);
      await speak(YE_RULE.replace(/[«»]/g, ''), stale);
      return;
    }
    for (let i = 0; i < item.parts.length; i++) {
      if (stale()) return;
      setActive(i);
      await speak(item.parts[i], stale);
    }
    if (stale()) return;
    setActive('word');
    await speak(item.word, stale);
    if (!stale()) setActive(null);
  }, [item, isRule]);

  const playOne = async (what: number | 'word') => {
    const id = ++runId.current;
    const stale = () => runId.current !== id;
    setActive(what);
    await speak(what === 'word' ? item.word : item.parts[what], stale);
    if (!stale()) setActive(null);
  };

  useEffect(() => {
    const t = setTimeout(playAll, 400);
    return () => { clearTimeout(t); runId.current++; window.speechSynthesis?.cancel(); };
  }, [playAll]);

  const close = () => { runId.current++; window.speechSynthesis?.cancel(); onClose(); };

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto select-none" style={{ backgroundColor: BG }}>
      <div className="w-full px-6 pt-12 pb-2 flex items-center gap-3 z-10">
        <button onClick={close} aria-label="بستن" className="w-10 h-10 rounded-full bg-white/80 text-gray-500 font-bold text-lg shadow-sm active:scale-90">✕</button>
        <div className="flex-1 flex gap-1.5">
          {[0, ...YE_WORDS.map((_, i) => i + 1)].map((i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: i <= index ? ACCENT : ACCENT + '33' }} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={isRule ? 'rule' : item.word}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-5 px-6 flex-1 justify-center w-full max-w-sm pb-6"
        >
          <Mascot size={110} expression="happy" />
          {isRule ? (
            <>
              <div className="bg-white rounded-3xl px-6 py-5 shadow-md text-center w-full">
                <p className="font-bold text-lg text-gray-800 leading-loose">{YE_RULE}</p>
              </div>
              <div className="bg-white rounded-3xl shadow-md px-4 py-4 w-full text-center">
                <span style={{ fontSize: '2rem', fontFamily: 'Vazirmatn, serif', fontWeight: 900, color: ACCENT }}>بی + یا = بیا</span>
              </div>
              <button onClick={playAll} className="px-6 py-3 rounded-2xl bg-white shadow-md font-extrabold text-gray-700 active:scale-95 transition-transform">🔊 دوباره بشنو</button>
            </>
          ) : (
          <>
          <div className="text-5xl -mt-3">{item.emoji}</div>

          {/* Equation: part + part = word */}
          <div className="w-full bg-white rounded-3xl shadow-md px-3 py-5 flex flex-wrap items-center justify-center gap-2">
            {item.parts.map((p, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-2xl font-black text-gray-400">+</span>}
                <button
                  onClick={() => playOne(i)}
                  className="rounded-2xl px-4 py-2 active:scale-95 transition-transform"
                  style={{
                    backgroundColor: active === i ? ACCENT : ACCENT + '15',
                    border: `2px solid ${ACCENT}55`,
                  }}
                >
                  <span style={{ fontSize: '2.4rem', fontFamily: 'Vazirmatn, serif', fontWeight: 900, color: active === i ? '#fff' : ACCENT, lineHeight: 1.2 }}>{p}</span>
                </button>
              </React.Fragment>
            ))}
            <span className="text-2xl font-black text-gray-400">=</span>
            <button
              onClick={() => playOne('word')}
              className="rounded-2xl px-4 py-2 active:scale-95 transition-transform"
              style={{ backgroundColor: active === 'word' ? '#059669' : '#05966915', border: '2px solid #05966955' }}
            >
              <span style={{ fontSize: '2.4rem', fontFamily: 'Vazirmatn, serif', fontWeight: 900, color: active === 'word' ? '#fff' : '#047857', lineHeight: 1.2 }}>{item.word}</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl px-6 py-4 shadow-md text-center w-full">
            <p className="text-gray-600 text-sm font-medium leading-relaxed">
              «ی» آخر «{item.parts[0]}» و «ی» اول «{item.parts[1]}» کنار هم‌اند؛
              یکی را می‌نویسیم ولی هر دو را می‌خوانیم.
            </p>
          </div>

          <button
            onClick={playAll}
            className="px-6 py-3 rounded-2xl bg-white shadow-md font-extrabold text-gray-700 active:scale-95 transition-transform"
          >
            🔊 دوباره بشنو
          </button>
          </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="w-full max-w-sm px-6 pb-8 flex gap-3">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="px-5 py-4 rounded-2xl bg-white font-extrabold text-gray-600 shadow-md disabled:opacity-40 active:scale-95 transition-transform"
        >
          قبلی
        </button>
        <button
          onClick={() => (isLast ? close() : setIndex((i) => i + 1))}
          className="flex-1 py-4 rounded-2xl font-extrabold text-lg text-white shadow-lg active:scale-95 transition-transform"
          style={{ backgroundColor: ACCENT }}
        >
          {isLast ? 'تمام شد ✓' : 'بعدی ←'}
        </button>
      </div>
    </div>
  );
};

export default YeWordsLesson;
