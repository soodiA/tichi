import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Question, Option } from '../../types';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

const OptionCard: React.FC<{
  option: Option;
  selected: boolean;
  onClick: () => void;
}> = ({ option, selected, onClick }) => {
  const handleClick = () => {
    if (option.audioUrl) {
      new Audio(option.audioUrl).play().catch(() => {/* silent */});
    }
    onClick();
  };

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={handleClick}
      className={`option-card flex flex-col items-center gap-2 w-full h-full min-h-[110px] ${selected ? 'selected' : ''}`}
    >
      {option.imageUrl ? (
        <img
          src={option.imageUrl}
          alt={option.text ?? ''}
          className="w-14 h-14 object-contain"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            const sibling = target.nextElementSibling as HTMLElement | null;
            if (sibling) sibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        className="w-14 h-14 rounded-full bg-violet-100 items-center justify-center text-2xl font-bold text-violet-600 hidden"
      >
        {option.text?.charAt(0) ?? '؟'}
      </div>
      {option.text && (
        <span className="text-sm font-bold text-gray-700">{option.text}</span>
      )}
    </motion.button>
  );
};

const Q1_AudioPicture: React.FC<Props> = ({ question, onAnswer }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    const correct = selected === question.correctAnswer;
    onAnswer(correct);
    setSelected(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((opt) => (
          <OptionCard
            key={opt.id}
            option={opt}
            selected={selected === opt.id}
            onClick={() => setSelected(opt.id)}
          />
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

export default Q1_AudioPicture;
