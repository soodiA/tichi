import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Question } from '../../types';
import AudioButton from '../ui/AudioButton';
import { shuffleArray } from '../../lib/shuffle';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

const Q13_SoundToText: React.FC<Props> = ({ question, onAnswer }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [shuffledOptions] = useState(() => shuffleArray(question.options));

  const handleConfirm = () => {
    if (!selected) return;
    const correct =
      Array.isArray(question.correctAnswer)
        ? question.correctAnswer.includes(selected)
        : selected === question.correctAnswer;
    onAnswer(correct);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Large play button */}
      <div className="flex flex-col items-center gap-3">
        <AudioButton audioUrl={question.mediaAudioUrl} size="lg" />
        <p className="text-gray-500 text-sm">صدا را گوش بده</p>
      </div>

      {/* 2x2 text options */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {shuffledOptions.map((opt) => (
          <motion.button
            key={opt.id}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              setSelected(opt.id);
              if (opt.audioUrl) {
                new Audio(opt.audioUrl).play().catch(() => {/* silent */});
              }
            }}
            className={`option-card text-3xl font-bold py-5 ${
              selected === opt.id ? 'selected' : ''
            }`}
          >
            {opt.text}
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

export default Q13_SoundToText;
