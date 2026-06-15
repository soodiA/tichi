import React, { useState } from 'react';
import type { Question } from '../../types';
import AudioButton from '../ui/AudioButton';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

const Q2_SyllableCount: React.FC<Props> = ({ question, onAnswer }) => {
  const [value, setValue] = useState('');

  const handleConfirm = () => {
    if (!value.trim()) return;
    const correct =
      parseInt(value, 10) === (question.syllableCount ?? parseInt(String(question.correctAnswer), 10));
    onAnswer(correct);
    setValue('');
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Image + label */}
      {question.mediaImageUrl && (
        <div className="flex flex-col items-center gap-2">
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
          <div className="flex items-center gap-2">
            {question.mediaAudioUrl && <AudioButton audioUrl={question.mediaAudioUrl} size="sm" />}
            {question.mediaLabel && (
              <span className="text-2xl font-bold text-gray-700">{question.mediaLabel}</span>
            )}
          </div>
        </div>
      )}

      {/* Number input */}
      <input
        type="number"
        min="1"
        max="9"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="؟"
        className="w-28 h-20 text-5xl font-extrabold text-center border-4 border-amber-400
                   rounded-3xl bg-amber-50 focus:outline-none focus:border-amber-500
                   text-gray-800"
        dir="ltr"
      />

      <button
        onClick={handleConfirm}
        disabled={!value.trim()}
        className="btn-primary w-full"
      >
        تأیید
      </button>
    </div>
  );
};

export default Q2_SyllableCount;
