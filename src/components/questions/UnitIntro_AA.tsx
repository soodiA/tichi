import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onComplete: () => void;
}

interface Scene {
  id: number;
  gradient: string;
  emoji: string;
  word?: string;
  highlightChar?: string;
  title: string;
  subtitle?: string;
  speak: string;
}

const SCENES: Scene[] = [
  {
    id: 0,
    gradient: 'from-violet-500 to-purple-700',
    emoji: '📖',
    title: 'بیا یاد بگیریم!',
    subtitle: 'حرف آ و ا',
    speak: 'بیا حرف آ رو یاد بگیریم!',
  },
  {
    id: 1,
    gradient: 'from-pink-500 to-rose-600',
    emoji: '✨',
    word: 'آ',
    title: 'این حرف آ هست',
    speak: 'این حرف آ هست',
  },
  {
    id: 2,
    gradient: 'from-blue-400 to-cyan-600',
    emoji: '💧',
    word: 'آب',
    highlightChar: 'آ',
    title: 'آ — اول کلمه',
    subtitle: 'آب با آ شروع میشه',
    speak: 'آب. آ اول کلمه‌ست',
  },
  {
    id: 3,
    gradient: 'from-amber-400 to-orange-500',
    emoji: '☀️',
    word: 'آفتاب',
    highlightChar: 'آ',
    title: 'آ — اول کلمه',
    subtitle: 'آفتاب هم با آ شروع میشه',
    speak: 'آفتاب. آفتاب هم با آ شروع میشه',
  },
  {
    id: 4,
    gradient: 'from-emerald-500 to-teal-600',
    emoji: '🔄',
    word: 'ا',
    title: 'گاهی ا میشه',
    subtitle: 'وقتی وسط یا آخر کلمه باشه',
    speak: 'گاهی آ به شکل ا میشه',
  },
  {
    id: 5,
    gradient: 'from-sky-500 to-blue-700',
    emoji: '💨',
    word: 'باد',
    highlightChar: 'ا',
    title: 'ا — وسط کلمه',
    subtitle: 'باد — ا وسط کلمه‌ست',
    speak: 'باد. ا وسط کلمه‌ست',
  },
  {
    id: 6,
    gradient: 'from-cyan-500 to-teal-700',
    emoji: '🌊',
    word: 'دریا',
    highlightChar: 'ا',
    title: 'ا — آخر کلمه',
    subtitle: 'دریا — ا آخر کلمه‌ست',
    speak: 'دریا. ا آخر کلمه‌ست',
  },
  {
    id: 7,
    gradient: 'from-violet-600 to-indigo-700',
    emoji: '🎉',
    title: 'حالا تمرین کنیم!',
    subtitle: 'آماده‌ای؟',
    speak: 'حالا تمرین کنیم!',
  },
];

const SCENE_DURATION = 3000;

const speak = (text: string) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'fa-IR';
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
};

const WordDisplay: React.FC<{ word: string; highlightChar?: string }> = ({ word, highlightChar }) => {
  if (!highlightChar) {
    return (
      <span className="text-white font-black" style={{ fontSize: word.length === 1 ? '6rem' : '3.5rem' }}>
        {word}
      </span>
    );
  }
  return (
    <span style={{ fontSize: word.length <= 3 ? '4rem' : '3rem' }} className="font-black">
      {[...word].map((ch, i) =>
        ch === highlightChar ? (
          <span key={i} className="text-yellow-300">{ch}</span>
        ) : (
          <span key={i} className="text-white">{ch}</span>
        )
      )}
    </span>
  );
};

const UnitIntro_AA: React.FC<Props> = ({ onComplete }) => {
  const [sceneIndex, setSceneIndex] = useState(0);
  const isLast = sceneIndex === SCENES.length - 1;

  const advance = useCallback(() => {
    setSceneIndex((prev) => {
      const next = prev + 1;
      if (next < SCENES.length) {
        speak(SCENES[next].speak);
        return next;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    speak(SCENES[0].speak);
  }, []);

  useEffect(() => {
    if (isLast) return;
    const timer = setTimeout(advance, SCENE_DURATION);
    return () => clearTimeout(timer);
  }, [sceneIndex, isLast, advance]);

  const scene = SCENES[sceneIndex];

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50 cursor-pointer select-none"
      onClick={() => { if (!isLast) advance(); }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={scene.id}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4 }}
          className={`absolute inset-0 bg-gradient-to-br ${scene.gradient} flex flex-col items-center justify-center gap-6 px-8`}
        >
          {/* Progress dots */}
          <div className="absolute top-10 flex gap-2">
            {SCENES.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === sceneIndex ? 'w-6 h-3 bg-white' : 'w-3 h-3 bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Emoji */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-7xl"
          >
            {scene.emoji}
          </motion.div>

          {/* Word with optional highlight */}
          {scene.word && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 18 }}
              className="bg-white/20 rounded-3xl px-8 py-4"
            >
              <WordDisplay word={scene.word} highlightChar={scene.highlightChar} />
            </motion.div>
          )}

          {/* Title */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <p className="text-white font-extrabold text-2xl">{scene.title}</p>
            {scene.subtitle && (
              <p className="text-white/80 font-bold text-base mt-1">{scene.subtitle}</p>
            )}
          </motion.div>

          {/* Last scene: start button */}
          {isLast && (
            <motion.button
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              className="mt-4 bg-white text-violet-700 font-extrabold text-xl px-10 py-4 rounded-2xl shadow-xl active:scale-95 transition-transform"
            >
              بستن ✕
            </motion.button>
          )}

          {/* Tap hint on non-last scenes */}
          {!isLast && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="absolute bottom-10 text-white/50 text-sm"
            >
              ضربه بزن تا بعدی ببینی
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default UnitIntro_AA;
