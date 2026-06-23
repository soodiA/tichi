import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { db } from '../db/db';
import { loadCurriculum } from '../lib/curriculum';
import ProgressBar from '../components/ui/ProgressBar';
import QuestionWrapper from '../components/questions/QuestionWrapper';
import UnitIntro_AA from '../components/questions/UnitIntro_AA';
import type { Node } from '../types';

type FeedbackState = 'idle' | 'correct' | 'wrong';

const PRAISE = ['آفرین! 🎉', 'خیلی خوب بود! ⭐', 'احسنت! 🌟', 'عالی بود! 🎊', 'آفرین، تیچی خوشحال شد! 🦉', 'فوق‌العاده! ✨', 'دمت گرم! 🌟'];
const randomPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

const Lesson: React.FC = () => {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);

  const [node, setNode] = useState<Node | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, setAnswers] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const [shownCorrectAnswer, setShownCorrectAnswer] = useState<string>('');
  const [praiseText, setPraiseText] = useState('');
  const answersRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!nodeId) return;
    loadCurriculum().then((units) => {
      const found = units.flatMap((u) => u.nodes).find((n) => n.id === nodeId);
      setNode(found ?? null);
    });
  }, [nodeId]);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (!node || feedback !== 'idle') return;
      const question = node.questions[currentIndex];
      if (!question) return;

      const newAnswers = { ...answersRef.current, [question.id]: correct };
      answersRef.current = newAnswers;
      setAnswers(newAnswers);

      // For wrong answers: find readable correct answer text
      if (!correct) {
        let correctDisplay = String(question.correctAnswer);
        if (question.type === 'audio_picture' || question.type === 'audio_options') {
          const opt = question.options?.find((o) => o.id === question.correctAnswer);
          if (opt?.text) correctDisplay = opt.text;
        }
        setShownCorrectAnswer(correctDisplay);
      }

      if (correct) setPraiseText(randomPraise());
      setFeedback(correct ? 'correct' : 'wrong');
    },
    [node, currentIndex, feedback]
  );

  const handleContinue = useCallback(async () => {
    if (!node) return;
    setFeedback('idle');
    const nextIndex = currentIndex + 1;

    if (nextIndex >= node.questions.length) {
      const totalQ = node.questions.length;
      const correctCount = Object.values(answersRef.current).filter(Boolean).length;
      const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 100;

      if (currentUser) {
        const stars = accuracy === 100 ? 3 : accuracy >= 80 ? 2 : 1;
        await db.progress.put({
          nodeId: node.id,
          userId: currentUser.id,
          completed: true,
          stars,
          accuracy,
          completedAt: new Date().toISOString(),
          attempts: 1,
        });
      }

      navigate('/lesson-complete', { state: { accuracy, nodeId: node.id } });
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [node, currentIndex, currentUser, navigate]);

  if (!node) {
    return (
      <div dir="rtl" className="h-full flex items-center justify-center">
        <p className="text-gray-500">درس پیدا نشد</p>
      </div>
    );
  }

  if (node.type === 'intro') {
    const completeIntro = async () => {
      if (currentUser) {
        await db.progress.put({
          nodeId: node.id,
          userId: currentUser.id,
          completed: true,
          stars: 3,
          accuracy: 100,
          completedAt: new Date().toISOString(),
          attempts: 1,
        });
      }
      navigate('/home');
    };
    return <UnitIntro_AA onComplete={completeIntro} />;
  }

  if (node.questions.length === 0) {
    return (
      <div dir="rtl" className="h-full flex flex-col items-center justify-center gap-4 px-5">
        <p className="text-2xl">🎁</p>
        <p className="text-gray-600 font-bold">این درس هنوز سوال ندارد!</p>
        <button onClick={() => navigate('/home')} className="btn-primary">برگشت به خانه</button>
      </div>
    );
  }

  const currentQuestion = node.questions[currentIndex];

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-bg relative">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button
          onClick={() => navigate('/home')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0"
          aria-label="بستن درس"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
        <div className="flex-1">
          <ProgressBar current={currentIndex} total={node.questions.length} />
        </div>
      </div>

      {/* Question */}
      <div className={`flex-1 flex flex-col px-5 pt-4 transition-all duration-300 ${feedback !== 'idle' ? 'pb-44' : 'pb-6'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            <QuestionWrapper
              question={currentQuestion}
              onAnswer={handleAnswer}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Duolingo-style feedback panel */}
      <AnimatePresence>
        {feedback !== 'idle' && (
          <motion.div
            key="feedback"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 px-5 pt-5 pb-8 rounded-t-3xl shadow-2xl
              ${feedback === 'correct'
                ? 'bg-emerald-50 border-t-2 border-emerald-200'
                : 'bg-red-50 border-t-2 border-red-200'}`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0
                ${feedback === 'correct' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                {feedback === 'correct' ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                )}
              </div>
              <div>
                {feedback === 'correct' ? (
                  <p className="text-emerald-700 font-extrabold text-xl">{praiseText}</p>
                ) : (
                  <>
                    <p className="text-red-600 font-extrabold text-base">جواب درست:</p>
                    <p className="text-red-800 font-bold text-2xl">{shownCorrectAnswer}</p>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleContinue}
              className={`w-full py-4 rounded-2xl font-extrabold text-lg text-white active:scale-95 transition-transform
                ${feedback === 'correct' ? 'bg-emerald-500' : 'bg-red-500'}`}
            >
              ادامه →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Lesson;
