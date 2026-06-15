import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Question } from '../../types';
import AudioButton from '../ui/AudioButton';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

const Q7_AudioOptions: React.FC<Props> = ({ question, onAnswer }) => {
  const [selected, setSelected] = useState<string | null>(null);

  // The "shown" syllable/letter is in questionText or mediaLabel
  const shownText = question.mediaLabel ?? question.questionText;

  const handleConfirm = () => {
    if (!selected) return;
    const correct =
      Array.isArray(question.correctAnswer)
        ? question.correctAnswer.includes(selected)
        : selected === question.correctAnswer;
    onAnswer(correct);
    setSelected(null);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Shown syllable card */}
      <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-violet-100 to-violet-200
                      flex items-center justify-center shadow-lg">
        <span className="text-6xl font-extrabold text-violet-700">{shownText}</span>
      </div>

      <p className="text-gray-500 text-sm">کدام صدا درست است؟</p>

      {/* 2x2 audio options */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {question.options.map((opt) => (
          <motion.div
            key={opt.id}
            whileTap={{ scale: 0.94 }}
            onClick={() => setSelected(opt.id)}
            className={`rounded-2xl p-3 flex flex-col items-center gap-2 cursor-pointer border-2 transition-all
              ${selected === opt.id
                ? 'border-violet-500 bg-violet-50'
                : 'border-gray-200 bg-white'
              }`}
          >
            <AudioButton audioUrl={opt.audioUrl} size="md" />
            {opt.text && (
              <span className="text-lg font-bold text-gray-700">{opt.text}</span>
            )}
            <div
              className={`w-5 h-5 rounded-full border-2 transition-all
                ${selected === opt.id
                  ? 'bg-violet-500 border-violet-500'
                  : 'border-gray-300 bg-white'
                }`}
            />
          </motion.div>
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

export default Q7_AudioOptions;
