import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Question } from '../../types';
import AudioButton from '../ui/AudioButton';
import { shuffleArray } from '../../lib/shuffle';
import { getComboClipUrl } from '../../lib/clipAudio';

const speak = (text: string) => {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'fa-IR';
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
};

// Plays an explicit clip if given, else the combo's recording from /record-combos,
// else browser TTS.
const playCombo = async (text?: string, explicitUrl?: string) => {
  if (explicitUrl) { new Audio(explicitUrl).play().catch(() => {}); return; }
  if (!text) return;
  const url = await getComboClipUrl(text);
  if (url) new Audio(url).play().catch(() => {});
  else speak(text);
};

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
  disabled?: boolean;
}

const Q7_AudioOptions: React.FC<Props> = ({ question, onAnswer, disabled }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [shuffledOptions] = useState(() => shuffleArray(question.options));

  // The "shown" syllable/letter is in questionText or mediaLabel
  const shownText = question.mediaLabel ?? question.questionText;

  const handleConfirm = () => {
    if (!selected || disabled) return;
    const correct =
      Array.isArray(question.correctAnswer)
        ? question.correctAnswer.includes(selected)
        : selected === question.correctAnswer;
    onAnswer(correct);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Shown syllable card */}
      <button
        type="button"
        onClick={() => playCombo(shownText)}
        className="w-32 h-32 rounded-3xl bg-gradient-to-br from-violet-100 to-violet-200
                   flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <span className="text-6xl font-extrabold text-violet-700">{shownText}</span>
      </button>

      <p className="text-gray-500 text-sm">کدام صدا درست است؟</p>

      {/* 2x2 audio options */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {shuffledOptions.map((opt) => (
          <motion.div
            key={opt.id}
            whileTap={{ scale: 0.94 }}
            onClick={() => { if (!disabled) { setSelected(opt.id); playCombo(opt.text, opt.audioUrl); } }}
            className={`rounded-2xl p-3 flex flex-col items-center gap-2 border-2 transition-all ${disabled ? 'pointer-events-none opacity-70' : 'cursor-pointer'}
              ${selected === opt.id
                ? 'border-violet-600 bg-violet-600 shadow-lg scale-[1.03]'
                : 'border-gray-200 bg-white'
              }`}
          >
            <AudioButton audioUrl={opt.audioUrl} size="md" onPlay={() => playCombo(opt.text, opt.audioUrl)} />
            {opt.text && (
              <span className={`text-lg font-bold ${selected === opt.id ? 'text-white' : 'text-gray-700'}`}>{opt.text}</span>
            )}
            <div
              className={`w-5 h-5 rounded-full border-2 transition-all
                ${selected === opt.id
                  ? 'bg-white border-white'
                  : 'border-gray-300 bg-white'
                }`}
            />
          </motion.div>
        ))}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selected || disabled}
        className="btn-primary w-full"
      >
        تأیید
      </button>
    </div>
  );
};

export default Q7_AudioOptions;
