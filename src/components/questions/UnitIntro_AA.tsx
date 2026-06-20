import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Mascot from '../ui/Mascot';

interface Props {
  onComplete: () => void;
}

interface Scene {
  id: number;
  bg: string;
  accent: string;
  emoji?: string;
  word?: string;
  highlightChar?: string;
  highlightColor?: string;
  title: string;
  subtitle?: string;
  speak: string;
  mascotExpression: 'happy' | 'excited' | 'thinking' | 'celebrating';
}

const SCENES: Scene[] = [
  {
    id: 0,
    bg: '#FFF5E4',
    accent: '#F59E0B',
    emoji: '👋',
    title: 'سلام! من تیچی هستم',
    subtitle: 'امروز حرف آ رو یاد می‌گیریم',
    speak: 'سلام! من تیچی هستم. امروز حرف آ رو یاد می‌گیریم',
    mascotExpression: 'excited',
  },
  {
    id: 1,
    bg: '#F5F0FF',
    accent: '#7C3AED',
    word: 'آ',
    title: 'این حرف آ هست',
    subtitle: 'یکی از مهم‌ترین حرف‌های فارسی',
    speak: 'این حرف آ هست',
    mascotExpression: 'happy',
  },
  {
    id: 2,
    bg: '#EFF9FF',
    accent: '#0EA5E9',
    emoji: '💧',
    word: 'آب',
    highlightChar: 'آ',
    highlightColor: '#7C3AED',
    title: 'آ — اول کلمه',
    subtitle: 'آب با آ شروع میشه',
    speak: 'آب. آ اول کلمه‌ست',
    mascotExpression: 'happy',
  },
  {
    id: 3,
    bg: '#FFFBEB',
    accent: '#F59E0B',
    emoji: '☀️',
    word: 'آفتاب',
    highlightChar: 'آ',
    highlightColor: '#7C3AED',
    title: 'آ — اول کلمه',
    subtitle: 'آفتاب هم با آ شروع میشه',
    speak: 'آفتاب. آفتاب هم با آ شروع میشه',
    mascotExpression: 'thinking',
  },
  {
    id: 4,
    bg: '#F0FFF4',
    accent: '#10B981',
    word: 'ا',
    title: 'گاهی ا میشه',
    subtitle: 'وقتی وسط یا آخر کلمه باشه شکلش عوض میشه',
    speak: 'گاهی آ به شکل ا میشه',
    mascotExpression: 'thinking',
  },
  {
    id: 5,
    bg: '#EFF9FF',
    accent: '#0EA5E9',
    emoji: '💨',
    word: 'باد',
    highlightChar: 'ا',
    highlightColor: '#10B981',
    title: 'ا — وسط کلمه',
    subtitle: 'باد — ا وسط کلمه‌ست',
    speak: 'باد. ا وسط کلمه‌ست',
    mascotExpression: 'happy',
  },
  {
    id: 6,
    bg: '#F0FFF4',
    accent: '#10B981',
    emoji: '🌊',
    word: 'دریا',
    highlightChar: 'ا',
    highlightColor: '#10B981',
    title: 'ا — آخر کلمه',
    subtitle: 'دریا — ا آخر کلمه‌ست',
    speak: 'دریا. ا آخر کلمه‌ست',
    mascotExpression: 'happy',
  },
  {
    id: 7,
    bg: '#FFF5E4',
    accent: '#F59E0B',
    title: 'آفرین! حالا تمرین کنیم',
    subtitle: 'با تیچی یاد می‌گیریم 🎉',
    speak: 'آفرین! حالا بریم تمرین کنیم',
    mascotExpression: 'celebrating',
  },
];

const SCENE_DURATION = 3200;

const speak = (text: string) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'fa-IR';
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
};

const WordDisplay: React.FC<{ word: string; highlightChar?: string; highlightColor?: string; accent: string }> = ({
  word, highlightChar, highlightColor, accent,
}) => {
  const isLetter = word.length === 1;
  return (
    <div
      className="rounded-3xl px-8 py-4 flex items-center justify-center shadow-md"
      style={{ backgroundColor: accent + '22', border: `2px solid ${accent}44` }}
    >
      <span style={{ fontSize: isLetter ? '5rem' : word.length <= 4 ? '3.5rem' : '2.8rem', fontFamily: 'Vazirmatn, serif', fontWeight: 900, lineHeight: 1.2 }}>
        {[...word].map((ch, i) =>
          ch === highlightChar ? (
            <span key={i} style={{ color: highlightColor ?? accent }}>{ch}</span>
          ) : (
            <span key={i} style={{ color: '#1F2937' }}>{ch}</span>
          )
        )}
      </span>
    </div>
  );
};

const Dot: React.FC<{ x: number; y: number; color: string; size: number; delay: number }> = ({ x, y, color, size, delay }) => (
  <motion.div
    className="absolute rounded-full"
    style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, backgroundColor: color, opacity: 0.35 }}
    animate={{ scale: [1, 1.4, 1], opacity: [0.35, 0.6, 0.35] }}
    transition={{ duration: 2.5, repeat: Infinity, delay }}
  />
);

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

  useEffect(() => { speak(SCENES[0].speak); }, []);

  useEffect(() => {
    if (isLast) return;
    const timer = setTimeout(advance, SCENE_DURATION);
    return () => clearTimeout(timer);
  }, [sceneIndex, isLast, advance]);

  const scene = SCENES[sceneIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-hidden cursor-pointer select-none"
      style={{ backgroundColor: scene.bg, transition: 'background-color 0.6s ease' }}
      onClick={() => { if (!isLast) advance(); }}
    >
      {/* Decorative dots */}
      <Dot x={8} y={10} color={scene.accent} size={20} delay={0} />
      <Dot x={85} y={8} color={scene.accent} size={14} delay={0.4} />
      <Dot x={92} y={70} color={scene.accent} size={18} delay={0.8} />
      <Dot x={5} y={75} color={scene.accent} size={12} delay={1.2} />
      <Dot x={50} y={5} color={scene.accent} size={10} delay={0.6} />

      {/* Progress bar */}
      <div className="w-full px-6 pt-12 pb-2 flex gap-1.5 z-10">
        {SCENES.map((_, i) => (
          <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: scene.accent + '33' }}>
            {i <= sceneIndex && (
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: scene.accent }}
                initial={{ width: i < sceneIndex ? '100%' : '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: i < sceneIndex ? 0 : SCENE_DURATION / 1000, ease: 'linear' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={scene.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex flex-col items-center gap-5 px-6 flex-1 justify-center w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mascot */}
          <Mascot size={140} expression={scene.mascotExpression} />

          {/* Emoji badge */}
          {scene.emoji && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
              className="text-5xl -mt-4"
            >
              {scene.emoji}
            </motion.div>
          )}

          {/* Word card */}
          {scene.word && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.15 }}
              className="w-full flex justify-center"
            >
              <WordDisplay
                word={scene.word}
                highlightChar={scene.highlightChar}
                highlightColor={scene.highlightColor}
                accent={scene.accent}
              />
            </motion.div>
          )}

          {/* Text card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-3xl px-7 py-5 shadow-md text-center w-full"
          >
            <p className="font-extrabold text-xl text-gray-800">{scene.title}</p>
            {scene.subtitle && (
              <p className="text-gray-500 text-sm mt-1.5 font-medium leading-relaxed">{scene.subtitle}</p>
            )}
          </motion.div>

          {/* Last scene button */}
          {isLast && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              className="w-full py-4 rounded-2xl font-extrabold text-lg text-white shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: scene.accent }}
            >
              بریم یاد بگیریم! ←
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tap hint */}
      {!isLast && (
        <p className="pb-8 text-xs font-medium" style={{ color: scene.accent + '88' }}>
          ضربه بزن تا بعدی ببینی
        </p>
      )}
    </div>
  );
};

export default UnitIntro_AA;
