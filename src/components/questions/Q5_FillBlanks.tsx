import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Question } from '../../types';
import AudioButton from '../ui/AudioButton';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

const Q5_FillBlanks: React.FC<Props> = ({ question, onAnswer }) => {
  const template = question.template ?? [];
  const blankIndices = template
    .map((cell, i) => (cell === null ? i : -1))
    .filter((i) => i !== -1);

  const [filledBlanks, setFilledBlanks] = useState<(string | null)[]>(
    blankIndices.map(() => null)
  );
  // track which option ids are used
  const [usedOptions, setUsedOptions] = useState<Set<string>>(new Set());

  const nextEmptyBlankPos = filledBlanks.findIndex((v) => v === null);
  const allFilled = filledBlanks.every((v) => v !== null);

  const handleOptionClick = (optId: string, optText: string) => {
    if (usedOptions.has(optId)) return;
    if (nextEmptyBlankPos === -1) return;

    const newFilled = [...filledBlanks];
    newFilled[nextEmptyBlankPos] = optText;
    setFilledBlanks(newFilled);
    setUsedOptions((prev) => new Set([...prev, optId]));
  };

  const handleBlankClick = (blankPos: number) => {
    const letter = filledBlanks[blankPos];
    if (!letter) return;

    // Find which option matches and un-use it
    const optEntry = question.options.find((o) => o.text === letter && usedOptions.has(o.id));
    const newFilled = [...filledBlanks];
    newFilled[blankPos] = null;

    // Shift remaining filled blanks left
    const cleared = newFilled.filter((v) => v !== null);
    const rebuilt = blankIndices.map((_, i) => cleared[i] ?? null);
    setFilledBlanks(rebuilt);

    if (optEntry) {
      setUsedOptions((prev) => {
        const next = new Set(prev);
        next.delete(optEntry.id);
        return next;
      });
    }
  };

  const handleConfirm = () => {
    if (!allFilled) return;
    // Build the answer: filled blank option IDs in order
    const answeredIds: string[] = [];
    let blankPos = 0;
    for (let i = 0; i < template.length; i++) {
      if (template[i] === null) {
        const letter = filledBlanks[blankPos];
        const opt = question.options.find((o) => o.text === letter);
        if (opt) answeredIds.push(opt.id);
        blankPos++;
      }
    }

    let correct: boolean;
    if (Array.isArray(question.correctAnswer)) {
      correct =
        answeredIds.length === question.correctAnswer.length &&
        answeredIds.every((id, i) => id === (question.correctAnswer as string[])[i]);
    } else {
      correct = answeredIds.length === 1 && answeredIds[0] === question.correctAnswer;
    }
    onAnswer(correct);
    setFilledBlanks(blankIndices.map(() => null));
    setUsedOptions(new Set());
  };

  let blankCounter = 0;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Image + label */}
      {question.mediaImageUrl && (
        <div className="flex flex-col items-center gap-2">
          <img
            src={question.mediaImageUrl}
            alt={question.mediaLabel ?? ''}
            className="w-32 h-32 object-contain rounded-2xl"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="flex items-center gap-2">
            {question.mediaAudioUrl && <AudioButton audioUrl={question.mediaAudioUrl} size="sm" />}
            {question.mediaLabel && (
              <span className="text-xl font-bold text-gray-700">{question.mediaLabel}</span>
            )}
          </div>
        </div>
      )}

      {/* Letter boxes */}
      <div className="flex gap-2 flex-wrap justify-center">
        {template.map((cell, i) => {
          if (cell !== null) {
            return (
              <div
                key={i}
                className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center
                           text-2xl font-bold text-gray-700 border-2 border-gray-200"
              >
                {cell}
              </div>
            );
          }
          const pos = blankCounter++;
          const filled = filledBlanks[pos];
          return (
            <motion.button
              key={i}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => handleBlankClick(pos)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold
                border-2 transition-all
                ${filled
                  ? 'bg-violet-100 border-violet-400 text-violet-700'
                  : 'bg-amber-50 border-amber-400 border-dashed text-amber-300'
                }`}
            >
              {filled ?? '؟'}
            </motion.button>
          );
        })}
      </div>

      {/* Letter option buttons */}
      <div className="flex gap-3 flex-wrap justify-center">
        {question.options.map((opt) => (
          <motion.button
            key={opt.id}
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => handleOptionClick(opt.id, opt.text ?? '')}
            disabled={usedOptions.has(opt.id)}
            className={`w-14 h-14 rounded-2xl text-2xl font-bold border-2 transition-all
              ${usedOptions.has(opt.id)
                ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                : 'bg-white border-violet-300 text-gray-700 shadow active:scale-90'
              }`}
          >
            {opt.text}
          </motion.button>
        ))}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!allFilled}
        className="btn-primary w-full"
      >
        تأیید
      </button>
    </div>
  );
};

export default Q5_FillBlanks;
