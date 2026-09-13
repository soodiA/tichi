import React, { useState } from 'react';
import type { Question } from '../../types';
import ClipButton from '../ui/ClipButton';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
  disabled?: boolean;
}

const Q2_SyllableCount: React.FC<Props> = ({ question, onAnswer, disabled }) => {
  const [value, setValue] = useState('');

  const handleConfirm = () => {
    if (!value.trim() || disabled) return;
    const correct =
      parseInt(value, 10) === (question.syllableCount ?? parseInt(String(question.correctAnswer), 10));
    onAnswer(correct);
    setValue('');
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Image + tappable word (plays the word's recorded clip, falling back to TTS) */}
      {(question.mediaImageUrl || question.mediaLabel) && (
        <div className="flex flex-col items-center gap-2">
          {question.mediaImageUrl && (
            <div className="relative w-40 h-40">
              <img
                src={question.mediaImageUrl}
                alt={question.mediaLabel ?? ''}
                className="w-40 h-40 object-contain rounded-2xl"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          {question.mediaLabel && (
            <ClipButton folder="words" text={question.mediaLabel} size="md" />
          )}
        </div>
      )}

      {/* Number input — text+numeric pattern so there's no scroll/spinner increment */}
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, '').slice(0, 1))}
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
        disabled={disabled}
        placeholder="؟"
        className="no-spinner w-28 h-20 text-5xl font-extrabold text-center border-4 border-amber-400
                   rounded-3xl bg-amber-50 focus:outline-none focus:border-amber-500
                   text-gray-800"
        dir="ltr"
      />

      <button
        onClick={handleConfirm}
        disabled={!value.trim() || disabled}
        className="btn-primary w-full"
      >
        تأیید
      </button>
    </div>
  );
};

export default Q2_SyllableCount;
