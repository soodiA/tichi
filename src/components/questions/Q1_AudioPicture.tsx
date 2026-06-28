import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Question, Option } from '../../types';
import { shuffleArray } from '../../lib/shuffle';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

const isUrl = (s: string) => s.startsWith('http') || s.startsWith('/') || s.startsWith('data:');

const speakWord = (text: string) => {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'fa-IR';
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
};

const OptionCard: React.FC<{
  option: Option;
  selected: boolean;
  onClick: () => void;
}> = ({ option, selected, onClick }) => {
  const handleClick = () => {
    if (option.audioUrl) {
      new Audio(option.audioUrl).play().catch(() => {});
    } else if (option.text) {
      speakWord(option.text);
    }
    onClick();
  };

  const img = option.imageUrl;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={handleClick}
      className={`option-card flex flex-col items-center gap-2 w-full h-full min-h-[110px] ${selected ? 'selected' : ''}`}
    >
      {img && isUrl(img) ? (
        <img
          src={img}
          alt={option.text ?? ''}
          className="w-14 h-14 object-contain"
        />
      ) : img ? (
        <span className="text-5xl leading-none">{img}</span>
      ) : (
        <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center text-2xl font-bold text-violet-600">
          {option.text?.charAt(0) ?? '؟'}
        </div>
      )}
      {option.text && (
        <span className={`text-sm font-bold ${selected ? 'text-white' : 'text-gray-700'}`}>{option.text}</span>
      )}
    </motion.button>
  );
};

const Q1_AudioPicture: React.FC<Props> = ({ question, onAnswer }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const shuffledOptions = useMemo(() => shuffleArray(question.options), [question.id]);

  const handleConfirm = () => {
    if (!selected) return;
    const correct = selected === question.correctAnswer;
    onAnswer(correct);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        {shuffledOptions.map((opt) => (
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
