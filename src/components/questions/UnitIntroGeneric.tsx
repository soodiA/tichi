import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Mascot from '../ui/Mascot';
import type { UnitIntroData } from '../../data/unitIntros';

interface Props {
  data: UnitIntroData;
  onComplete: () => void;
}

interface Scene {
  id: number;
  bg: string;
  accent: string;
  emoji?: string;
  word?: string;
  forms?: { text: string; label: string; color: string }[];
  highlightChar?: string;
  highlightColor?: string;
  title: string;
  subtitle?: string;
  speak: string;
  mascotExpression: 'happy' | 'excited' | 'thinking' | 'celebrating';
}

const SCENE_DURATION = 3200;

const BGROUPS = [
  '#EFF6FF', '#F5F0FF', '#ECFDF5', '#FFF7ED',
  '#EFF9FF', '#FFF1F2', '#FFFBEB', '#F0FFF4',
];

function buildScenes(data: UnitIntroData): Scene[] {
  const scenes: Scene[] = [];
  let id = 0;
  const bg = (i: number) => BGROUPS[i % BGROUPS.length];

  scenes.push({
    id: id++, bg: bg(0), accent: data.accent, emoji: '👋',
    title: 'سلام! آماده‌ای؟',
    subtitle: `امروز «${data.name}» رو یاد می‌گیریم`,
    speak: `سلام! امروز ${data.name} رو یاد می‌گیریم`,
    mascotExpression: 'excited',
  });

  scenes.push({
    id: id++, bg: bg(1), accent: data.accent,
    word: data.letter,
    title: `این «${data.name}» هست`,
    subtitle: data.description,
    speak: `این ${data.name} هست. ${data.description}`,
    mascotExpression: 'happy',
  });

  if (data.forms && data.forms.length >= 1) {
    const formCount = data.forms.length;
    const countWord = formCount === 1 ? 'یه شکل' : `${formCount} شکل`;
    scenes.push({
      id: id++, bg: bg(2), accent: data.accent,
      forms: data.forms,
      title: `«${data.name}» ${countWord} داره!`,
      subtitle: data.forms.map((f) => `${f.text}: ${f.label}`).join(' — '),
      speak: `${data.name} ${countWord} داره`,
      mascotExpression: 'thinking',
    });
  }

  data.examples.forEach((ex, i) => {
    scenes.push({
      id: id++, bg: bg(3 + i), accent: data.accent,
      emoji: ex.emoji,
      word: ex.word,
      highlightChar: ex.highlight,
      highlightColor: ex.highlightColor ?? data.accent,
      title: `«${data.name}» — ${ex.pos} کلمه`,
      subtitle: `«${ex.word}» — «${data.name}» ${ex.pos} کلمه‌ست`,
      speak: `${ex.word}. ${data.name} ${ex.pos} کلمه‌ست`,
      mascotExpression: i % 2 === 0 ? 'happy' : 'excited',
    });
  });

  scenes.push({
    id: id++, bg: bg(0), accent: data.accent,
    title: 'آفرین! حالا تمرین کنیم',
    subtitle: 'با تیچی یاد می‌گیریم 🎉',
    speak: 'آفرین! حالا بریم تمرین کنیم',
    mascotExpression: 'celebrating',
  });

  return scenes;
}

const tts = (text: string) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'fa-IR';
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
};

const WordDisplay: React.FC<{
  word: string;
  highlightChar?: string;
  highlightColor?: string;
  accent: string;
}> = ({ word, highlightChar, highlightColor, accent }) => (
  <div
    className="rounded-3xl px-8 py-4 flex items-center justify-center shadow-md"
    style={{ backgroundColor: accent + '22', border: `2px solid ${accent}44` }}
  >
    <span style={{
      fontSize: word.length <= 2 ? '5rem' : word.length <= 4 ? '3.5rem' : '2.8rem',
      fontFamily: 'Vazirmatn, serif',
      fontWeight: 900,
      lineHeight: 1.2,
    }}>
      {[...word].map((ch, i) =>
        highlightChar && ch === highlightChar ? (
          <span key={i} style={{ color: highlightColor ?? accent }}>{ch}</span>
        ) : (
          <span key={i} style={{ color: '#1F2937' }}>{ch}</span>
        )
      )}
    </span>
  </div>
);

const Dot: React.FC<{ x: number; y: number; color: string; size: number; delay: number }> = ({ x, y, color, size, delay }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, backgroundColor: color, opacity: 0.3 }}
    animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.55, 0.3] }}
    transition={{ duration: 2.5, repeat: Infinity, delay }}
  />
);

const UnitIntroGeneric: React.FC<Props> = ({ data, onComplete }) => {
  const scenes = useMemo(() => buildScenes(data), [data]);
  const [sceneIndex, setSceneIndex] = useState(0);
  const isLast = sceneIndex === scenes.length - 1;

  const advance = useCallback(() => {
    setSceneIndex((prev) => {
      const next = prev + 1;
      if (next < scenes.length) { tts(scenes[next].speak); return next; }
      return prev;
    });
  }, [scenes]);

  useEffect(() => { tts(scenes[0].speak); }, [scenes]);

  useEffect(() => {
    if (isLast) return;
    const timer = setTimeout(advance, SCENE_DURATION);
    return () => clearTimeout(timer);
  }, [sceneIndex, isLast, advance]);

  const scene = scenes[sceneIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-hidden cursor-pointer select-none"
      style={{ backgroundColor: scene.bg, transition: 'background-color 0.6s ease' }}
      onClick={() => { if (!isLast) advance(); }}
    >
      <Dot x={8}  y={10} color={scene.accent} size={20} delay={0}   />
      <Dot x={85} y={8}  color={scene.accent} size={14} delay={0.4} />
      <Dot x={92} y={70} color={scene.accent} size={18} delay={0.8} />
      <Dot x={5}  y={75} color={scene.accent} size={12} delay={1.2} />
      <Dot x={50} y={5}  color={scene.accent} size={10} delay={0.6} />

      {/* Progress */}
      <div className="w-full px-6 pt-12 pb-2 flex gap-1.5 z-10">
        {scenes.map((_, i) => (
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
          <Mascot size={140} expression={scene.mascotExpression} />

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

          {/* Dual-form display */}
          {scene.forms && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.15 }}
              className="flex gap-4 w-full justify-center"
            >
              {scene.forms.map((f, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div
                    className="rounded-2xl px-6 py-4 flex items-center justify-center shadow-md"
                    style={{ backgroundColor: f.color + '22', border: `2px solid ${f.color}55`, minWidth: 80 }}
                  >
                    <span style={{ fontSize: '4rem', fontFamily: 'Vazirmatn, serif', fontWeight: 900, color: f.color, lineHeight: 1 }}>
                      {f.text}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-center" style={{ color: f.color }}>{f.label}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Single word/letter display */}
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

      {!isLast && (
        <p className="pb-8 text-xs font-medium" style={{ color: scene.accent + '88' }}>
          ضربه بزن تا بعدی ببینی
        </p>
      )}
    </div>
  );
};

export default UnitIntroGeneric;
