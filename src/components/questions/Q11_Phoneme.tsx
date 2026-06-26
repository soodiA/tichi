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

  const usedIds = new Set(selected.map((s) => s.id));

  const handleChipClick = (optId: string, text: string) => {
    if (usedIds.has(optId)) {
      // Remove from sequence
      setSelected((prev) => prev.filter((s) => s.id !== optId));
    } else {
      // Add to end of sequence
      setSelected((prev) => [...prev, { id: optId, text }]);
    }
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
  };

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
                exit={{ scale: 0 }}
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
        {question.options.map((opt) => {
          const isUsed = usedIds.has(opt.id);
          return (
            <motion.button
              key={opt.id}
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => handleChipClick(opt.id, opt.text ?? '')}
              className={`w-14 h-14 rounded-2xl border-2 text-2xl font-bold shadow transition-all
                ${isUsed
                  ? 'bg-violet-600 border-violet-600 text-white scale-105'
                  : 'bg-white border-violet-300 text-gray-700'
                }`}
            >
              {opt.text}
            </motion.button>
          );
        })}
      </div>

      <button
        onClick={handleConfirm}
        disabled={selected.length === 0}
        className="w-full btn-primary py-3"
      >
        تأیید
      </button>
    </div>
  );
};

export default Q11_Phoneme;
// Wed Jun 24 14:42:28 UTC 2026
