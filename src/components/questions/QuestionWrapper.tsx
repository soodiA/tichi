import React from 'react';
import AudioButton from '../ui/AudioButton';
import type { Question } from '../../types';
import Q1_AudioPicture from './Q1_AudioPicture';
import Q2_SyllableCount from './Q2_SyllableCount';
import Q3_FlowerCount from './Q3_FlowerCount';
import Q4_Record from './Q4_Record';
import Q5_FillBlanks from './Q5_FillBlanks';
import Q6_Handwriting from './Q6_Handwriting';
import Q7_AudioOptions from './Q7_AudioOptions';
import Q8_SentenceComplete from './Q8_SentenceComplete';
import Q9_Arrange from './Q9_Arrange';
import Q11_Phoneme from './Q11_Phoneme';
import Q13_SoundToText from './Q13_SoundToText';
import Q14_ColorLetter from './Q14_ColorLetter';

interface QuestionWrapperProps {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

const Unsupported: React.FC<{ type: string; onAnswer: (c: boolean) => void }> = ({ type, onAnswer }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-10">
    <p className="text-gray-400 text-sm">نوع سوال «{type}» هنوز پشتیبانی نمی‌شود</p>
    <button onClick={() => onAnswer(false)} className="btn-secondary text-sm py-2 px-6">
      رد شدن
    </button>
  </div>
);

const speakText = (text: string) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'fa-IR';
  utt.rate = 0.9;
  window.speechSynthesis.speak(utt);
};

const QuestionWrapper: React.FC<QuestionWrapperProps> = ({ question, onAnswer }) => {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Question text + audio */}
      <div className="flex items-center gap-3">
        {question.questionAudioUrl && (
          <AudioButton audioUrl={question.questionAudioUrl} size="md" />
        )}
        <p className="text-xl font-bold text-gray-800 flex-1">{question.questionText}</p>
        <button
          onClick={() => speakText(question.questionText)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-violet-100 text-violet-600 flex-shrink-0 active:scale-90 transition-transform"
          aria-label="خواندن سوال"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
        </button>
      </div>

      {/* Route to appropriate question component */}
      {question.type === 'audio_picture' && (
        <Q1_AudioPicture question={question} onAnswer={onAnswer} />
      )}
      {question.type === 'syllable_count' && (
        <Q2_SyllableCount question={question} onAnswer={onAnswer} />
      )}
      {question.type === 'flower_count' && (
        <Q3_FlowerCount question={question} onAnswer={onAnswer} />
      )}
      {question.type === 'fill_blanks' && (
        <Q5_FillBlanks question={question} onAnswer={onAnswer} />
      )}
      {question.type === 'record' && (
        <Q4_Record question={question} onAnswer={onAnswer} />
      )}
      {question.type === 'handwriting' && (
        <Q6_Handwriting question={question} onAnswer={onAnswer} />
      )}
      {question.type === 'audio_options' && (
        <Q7_AudioOptions question={question} onAnswer={onAnswer} />
      )}
      {question.type === 'sentence_complete' && (
        <Q8_SentenceComplete question={question} onAnswer={onAnswer} />
      )}
      {question.type === 'arrange' && (
        <Q9_Arrange question={question} onAnswer={onAnswer} />
      )}
      {question.type === 'phoneme' && (
        <Q11_Phoneme question={question} onAnswer={onAnswer} />
      )}
      {question.type === 'sound_to_text' && (
        <Q13_SoundToText question={question} onAnswer={onAnswer} />
      )}
      {question.type === 'color_letter' && (
        <Q14_ColorLetter question={question} onAnswer={onAnswer} />
      )}
      {(question.type === 'similar_letters' ||
        question.type === 'middle_blank') && (
        <Unsupported type={question.type} onAnswer={onAnswer} />
      )}
    </div>
  );
};

export default QuestionWrapper;
