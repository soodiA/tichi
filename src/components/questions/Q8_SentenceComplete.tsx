import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Question } from '../../types';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

const Q8_SentenceComplete: React.FC<Props> = ({ question, onAnswer }) => {
  const [selected, setSelected] = useState<string | null>(null);

  // The question text might have "..." indicating where the blank is.
  // Show the sentence, replace "..." with the selected option if chosen.
  const sentenceDisplay = selected
    ? question.questionText.replace('...', selected)
    : question.questionText;

  const handleOptionClick = (opt: { id: string; text?: string; audioUrl?: string }) => {
    if (opt.audioUrl) {
      new Audio(opt.audioUrl).play().catch(() => {/* silent */});
    }
    setSelected(opt.text ?? opt.id);
  };

  const handleConfirm = () => {
    if (!selected) return;
    const selectedOpt = question.options.find((o) => (o.text ?? o.id) === selected);
    if (!selectedOpt) return;
    const correct =
      Array.isArray(question.correctAnswer)
        ? question.correctAnswer.includes(selectedOpt.id)
        : selectedOpt.id === question.correctAnswer;
    onAnswer(correct);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Sentence display */}
      <div className="card text-center min-h-[70px] flex items-center justify-center">
        <p className="text-2xl font-bold text-gray-800 leading-relaxed">{sentenceDisplay}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((opt) => (
          <motion.button
            key={opt.id}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => handleOptionClick(opt)}
            className={`option-card text-xl font-bold py-4 ${
              selected === (opt.text ?? opt.id) ? 'selected' : ''
            }`}
          >
            {opt.text ?? opt.id}
          </motion.button>
        ))}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selected}
        className="btn-primary w-full"
      >
        تأیید
      </button>
    </div>
  );
};

export default Q8_SentenceComplete;
