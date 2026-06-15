import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Question } from '../../types';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

interface PlacedWord {
  id: string;
  text: string;
}

const Q9_Arrange: React.FC<Props> = ({ question, onAnswer }) => {
  const [placed, setPlaced] = useState<PlacedWord[]>([]);
  const [used, setUsed] = useState<Set<string>>(new Set());

  const handleWordClick = (optId: string, text: string) => {
    if (used.has(optId)) return;
    setPlaced((prev) => [...prev, { id: optId, text }]);
    setUsed((prev) => new Set([...prev, optId]));
    if (question.options.find((o) => o.id === optId)?.audioUrl) {
      new Audio(question.options.find((o) => o.id === optId)!.audioUrl!).play().catch(() => {/* silent */});
    }
  };

  const handlePlacedClick = (optId: string) => {
    setPlaced((prev) => prev.filter((p) => p.id !== optId));
    setUsed((prev) => {
      const next = new Set(prev);
      next.delete(optId);
      return next;
    });
  };

  const handleConfirm = () => {
    if (placed.length !== question.options.length) return;
    const correct =
      Array.isArray(question.correctAnswer) &&
      placed.length === question.correctAnswer.length &&
      placed.every((p, i) => p.id === (question.correctAnswer as string[])[i]);
    onAnswer(correct);
    setPlaced([]);
    setUsed(new Set());
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Answer area */}
      <div className="min-h-[70px] border-2 border-dashed border-violet-300 rounded-2xl
                      bg-violet-50 p-3 flex flex-wrap gap-2 items-center">
        <AnimatePresence>
          {placed.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-400 text-sm w-full text-center"
            >
              کلمات را اینجا مرتب کن
            </motion.p>
          )}
          {placed.map((p) => (
            <motion.button
              key={p.id}
              layout
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              type="button"
              onClick={() => handlePlacedClick(p.id)}
              className="px-4 py-2 bg-violet-500 text-white font-bold rounded-xl text-lg shadow
                         active:scale-95 transition-transform"
            >
              {p.text}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Word pool */}
      <div className="flex flex-wrap gap-3 justify-center">
        {question.options.map((opt) => (
          <motion.button
            key={opt.id}
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => handleWordClick(opt.id, opt.text ?? '')}
            disabled={used.has(opt.id)}
            className={`px-5 py-3 rounded-2xl text-xl font-bold border-2 shadow transition-all
              ${used.has(opt.id)
                ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                : 'bg-white border-violet-300 text-gray-700 active:scale-95'
              }`}
          >
            {opt.text}
          </motion.button>
        ))}
      </div>

      <button
        onClick={handleConfirm}
        disabled={placed.length !== question.options.length}
        className="btn-primary w-full"
      >
        تأیید
      </button>
    </div>
  );
};

export default Q9_Arrange;
