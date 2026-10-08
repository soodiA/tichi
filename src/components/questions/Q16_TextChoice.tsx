import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Question } from '../../types';
import { shuffleArray } from '../../lib/shuffle';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
  disabled?: boolean;
}

// "Which one is written correctly?" — several text options, one is right.
const Q16_TextChoice: React.FC<Props> = ({ question, onAnswer, disabled }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [options] = useState(() => shuffleArray(question.options));

  const handleConfirm = () => {
    if (!selectedId || disabled) return;
    const correct = Array.isArray(question.correctAnswer)
      ? question.correctAnswer.includes(selectedId)
      : selectedId === question.correctAnswer;
    onAnswer(correct);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3" dir="rtl">
        {options.map((opt) => (
          <motion.button
            key={opt.id}
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => !disabled && setSelectedId(opt.id)}
            disabled={disabled}
            className={`option-card text-3xl font-bold py-4 ${selectedId === opt.id ? 'selected' : ''}`}
          >
            {opt.text ?? opt.id}
          </motion.button>
        ))}
      </div>

      <button onClick={handleConfirm} disabled={!selectedId || disabled} className="btn-primary w-full">
        تأیید
      </button>
    </div>
  );
};

export default Q16_TextChoice;
