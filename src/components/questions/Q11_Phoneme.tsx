import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Question } from '../../types';
import AudioButton from '../ui/AudioButton';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

interface SelectedPhoneme {
  id: string;
  text: string;
}

const Q11_Phoneme: React.FC<Props> = ({ question, onAnswer }) => {
  const [selected, setSelected] = useState<SelectedPhoneme[]>([]);
  const [used, setUsed] = useState<string[]>([]); // ordered list of used option ids

  const handleChipClick = (optId: string, text: string) => {
    // Allow multiple picks (phonemes can repeat)
    setSelected((prev) => [...prev, { id: optId, text }]);
    setUsed((prev) => [...prev, optId]);
  };

  const handleRemoveLast = () => {
    if (selected.length === 0) return;
    setSelected((prev) => prev.slice(0, -1));
    setUsed((prev) => prev.slice(0, -1));
  };

  const handleConfirm = () => {
    if (selected.length === 0) return;
    const selectedIds = selected.map((s) => s.id);
    const correct =
      Array.isArray(question.correctAnswer) &&
      selectedIds.length === question.correctAnswer.length &&
      selectedIds.every((id, i) => id === (question.correctAnswer as string[])[i]);
    onAnswer(correct);
    setSelected([]);
    setUsed([]);
  };

  // Count how many times each option has been used
  const usedCount: Record<string, number> = {};
  used.forEach((id) => { usedCount[id] = (usedCount[id] ?? 0) + 1; });

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Image + label */}
      {question.mediaImageUrl && (
        <div className="flex flex-col items-center gap-2">
          <img
            src={question.mediaImageUrl}
            alt={question.mediaLabel ?? ''}
            className="w-32 h-32 object-contain rounded-2xl"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="flex items-center gap-2">
            {question.mediaAudioUrl && <AudioButton audioUrl={question.mediaAudioUrl} size="sm" />}
            {question.mediaLabel && (
              <span className="text-2xl font-bold text-gray-700">{question.mediaLabel}</span>
            )}
          </div>
        </div>
      )}

      {/* Selected sequence */}
      <div className="min-h-[56px] border-2 border-dashed border-emerald-300 rounded-2xl
                      bg-emerald-50 px-3 py-2 flex flex-wrap gap-2 items-center w-full">
        <AnimatePresence>
          {selected.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-400 text-sm w-full text-center"
            >
              صداها را به ترتیب انتخاب کن
            </motion.p>
          ) : (
            selected.map((s, i) => (
              <motion.span
                key={`${s.id}-${i}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-3 py-1 bg-emerald-500 text-white font-bold rounded-xl text-lg"
              >
                {s.text}
              </motion.span>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Phoneme chips */}
      <div className="flex flex-wrap gap-3 justify-center">
        {question.options.map((opt) => (
          <motion.button
            key={opt.id}
            type="button"
            whileTap={{ scale: 0.88 }}
            onClick={() => handleChipClick(opt.id, opt.text ?? '')}
            className="w-14 h-14 rounded-2xl bg-white border-2 border-violet-300 text-2xl font-bold
                       text-gray-700 shadow active:scale-90 transition-all relative"
          >
            {opt.text}
            {usedCount[opt.id] > 0 && (
              <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-violet-500
                               text-white text-xs flex items-center justify-center font-bold">
                {usedCount[opt.id]}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-3 w-full">
        <button
          type="button"
          onClick={handleRemoveLast}
          disabled={selected.length === 0}
          className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-3 rounded-2xl
                     active:scale-95 transition-transform disabled:opacity-40"
        >
          حذف آخری
        </button>
        <button
          onClick={handleConfirm}
          disabled={selected.length === 0}
          className="flex-1 btn-primary py-3"
        >
          تأیید
        </button>
      </div>
    </div>
  );
};

export default Q11_Phoneme;
