import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Question } from '../../types';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

const tts = (text: string) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fa-IR'; u.rate = 0.85;
  window.speechSynthesis.speak(u);
};

const Q15_PairMatch: React.FC<Props> = ({ question, onAnswer }) => {
  const options = question.options;

  const [selected, setSelected] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [allDone, setAllDone] = useState(false);

  const handleTap = useCallback((optId: string) => {
    if (allDone || matched.includes(optId) || wrong.length > 0) return;

    const opt = options.find(o => o.id === optId);
    if (opt?.text) tts(opt.text);

    if (selected.includes(optId)) {
      setSelected(prev => prev.filter(id => id !== optId));
      return;
    }

    const newSelected = [...selected, optId];
    if (newSelected.length < 2) {
      setSelected(newSelected);
      return;
    }

    const [first, second] = newSelected;
    const firstOpt = options.find(o => o.id === first);
    const secondOpt = options.find(o => o.id === second);

    if (firstOpt?.pairKey !== undefined && firstOpt.pairKey === secondOpt?.pairKey) {
      const newMatched = [...matched, first, second];
      setMatched(newMatched);
      setSelected([]);
      if (newMatched.length === options.length) {
        setAllDone(true);
        setTimeout(() => onAnswer(true), 600);
      }
    } else {
      setWrong(newSelected);
      setTimeout(() => {
        setWrong([]);
        setSelected([]);
      }, 700);
    }
  }, [allDone, selected, matched, wrong, options, onAnswer]);

  return (
    <div className="flex flex-col items-center gap-6 flex-1 justify-center">
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.id);
          const isMatched  = matched.includes(opt.id);
          const isWrong    = wrong.includes(opt.id);

          return (
            <motion.button
              key={opt.id}
              onClick={() => handleTap(opt.id)}
              disabled={isMatched || allDone}
              animate={
                isWrong   ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } :
                isMatched ? { opacity: 0.25, scale: 0.9 } :
                            { opacity: 1, scale: 1 }
              }
              transition={{ duration: isWrong ? 0.45 : 0.3 }}
              className={[
                'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 shadow-sm',
                'transition-colors duration-150 active:scale-95 select-none',
                isMatched
                  ? 'bg-gray-50 border-gray-200 cursor-default'
                  : isWrong
                  ? 'bg-red-50 border-red-400'
                  : isSelected
                  ? 'bg-violet-100 border-violet-500 shadow-md scale-105'
                  : 'bg-white border-gray-200',
              ].join(' ')}
            >
              <span className="text-5xl leading-none select-none">{opt.imageUrl}</span>
              <span
                className={[
                  'text-sm font-extrabold text-center',
                  isMatched ? 'text-gray-400'   :
                  isWrong   ? 'text-red-600'     :
                  isSelected? 'text-violet-700'  : 'text-gray-700',
                ].join(' ')}
              >
                {opt.text}
              </span>
            </motion.button>
          );
        })}
      </div>

      {allDone && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-emerald-600 font-extrabold text-xl"
        >
          آفرین! 🎉
        </motion.p>
      )}
    </div>
  );
};

export default Q15_PairMatch;
