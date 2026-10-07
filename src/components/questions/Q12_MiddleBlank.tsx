import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Question } from '../../types';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
  disabled?: boolean;
}

// questionText holds the phrase with the blank marked by "..." (3+ dots or …),
// e.g. "مادَر ..... مَن" — first word, blank, second word.
export const splitPhrase = (text: string): [string, string] => {
  const [a = '', ...rest] = text.split(/\.{3,}|…/);
  return [a.trim(), rest.join(' ').trim()];
};

const Q12_MiddleBlank: React.FC<Props> = ({ question, onAnswer, disabled }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [first, second] = splitPhrase(question.questionText);
  const selected = question.options.find((o) => o.id === selectedId);

  const handleConfirm = () => {
    if (!selected || disabled) return;
    const correct = Array.isArray(question.correctAnswer)
      ? question.correctAnswer.includes(selected.id)
      : selected.id === question.correctAnswer;
    onAnswer(correct);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="card flex items-center justify-center gap-3 min-h-[80px]" dir="rtl">
        <span className="text-3xl font-bold text-gray-800">{first}</span>
        <span
          className={`min-w-[64px] h-12 px-3 flex items-center justify-center rounded-xl border-2 border-dashed text-2xl font-bold ${
            selected ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-300 text-gray-300'
          }`}
        >
          {selected ? (selected.text ?? selected.id) : ''}
        </span>
        <span className="text-3xl font-bold text-gray-800">{second}</span>
      </div>

      <div className="grid grid-cols-2 gap-3" dir="rtl">
        {question.options.map((opt) => (
          <motion.button
            key={opt.id}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => !disabled && setSelectedId(opt.id)}
            disabled={disabled}
            className={`option-card text-3xl font-bold py-4 ${selectedId === opt.id ? 'selected' : ''}`}
          >
            {opt.text ?? opt.id}
          </motion.button>
        ))}
      </div>

      <button onClick={handleConfirm} disabled={!selected || disabled} className="btn-primary w-full">
        تأیید
      </button>
    </div>
  );
};

export default Q12_MiddleBlank;
