import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Question } from '../../types';
import AudioButton from '../ui/AudioButton';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

const TOTAL_FLOWERS = 5;

const Q3_FlowerCount: React.FC<Props> = ({ question, onAnswer }) => {
  const [selected, setSelected] = useState(0);

  const handleFlowerClick = (index: number) => {
    // Toggle: clicking the last selected deselects it
    if (index + 1 === selected) {
      setSelected(index);
    } else {
      setSelected(index + 1);
    }
  };

  const handleConfirm = () => {
    if (selected === 0) return;
    const expected = question.syllableCount ?? parseInt(String(question.correctAnswer), 10);
    onAnswer(selected === expected);
    setSelected(0);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Image + label */}
      {question.mediaImageUrl && (
        <div className="flex flex-col items-center gap-2">
          <img
            src={question.mediaImageUrl}
            alt={question.mediaLabel ?? ''}
            className="w-36 h-36 object-contain rounded-2xl"
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

      {/* Flower row */}
      <div className="flex gap-3">
        {Array.from({ length: TOTAL_FLOWERS }).map((_, i) => (
          <motion.button
            key={i}
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={() => handleFlowerClick(i)}
            className={`text-4xl w-14 h-14 rounded-full flex items-center justify-center transition-all
              ${i < selected ? 'bg-pink-100 shadow-md' : 'bg-gray-100'}`}
          >
            {i < selected ? '🌸' : '⚪'}
          </motion.button>
        ))}
      </div>

      <p className="text-gray-500 text-sm">
        {selected > 0 ? `${selected.toLocaleString('fa-IR')} بخش انتخاب شد` : 'روی گل‌ها بزن'}
      </p>

      <button
        onClick={handleConfirm}
        disabled={selected === 0}
        className="btn-primary w-full"
      >
        تأیید
      </button>
    </div>
  );
};

export default Q3_FlowerCount;
