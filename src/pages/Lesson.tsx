import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { db } from '../db/db';
import { UNITS } from '../data/curriculum';
import ProgressBar from '../components/ui/ProgressBar';
import QuestionWrapper from '../components/questions/QuestionWrapper';
import type { Node } from '../types';

type FeedbackState = 'idle' | 'correct' | 'wrong';

const Lesson: React.FC = () => {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const addDiamonds = useStore((s) => s.addDiamonds);

  const [node, setNode] = useState<Node | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<FeedbackState>('idle');

  useEffect(() => {
    if (!nodeId) return;
    const found = UNITS.flatMap((u) => u.nodes).find((n) => n.id === nodeId);
    setNode(found ?? null);
  }, [nodeId]);

  const handleAnswer = useCallback(
    async (correct: boolean) => {
      if (!node || feedback !== 'idle') return;
      const question = node.questions[currentIndex];
      if (!question) return;

      const newAnswers = { ...answers, [question.id]: correct };
      setAnswers(newAnswers);
      setFeedback(correct ? 'correct' : 'wrong');

      setTimeout(async () => {
        setFeedback('idle');
        const nextIndex = currentIndex + 1;

        if (nextIndex >= node.questions.length) {
          // All done — save progress
          const totalQ = node.questions.length;
          const correctCount = Object.values(newAnswers).filter(Boolean).length;
          const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 100;

          if (currentUser) {
            await db.progress.put({
              nodeId: node.id,
              userId: currentUser.id,
              completed: true,
              accuracy,
              completedAt: new Date().toISOString(),
              attempts: 1,
            });
            addDiamonds(10);
          }

          navigate('/lesson-complete', { state: { accuracy, nodeId: node.id } });
        } else {
          setCurrentIndex(nextIndex);
        }
      }, 800);
    },
    [node, currentIndex, answers, feedback, currentUser, addDiamonds, navigate]
  );

  if (!node) {
    return (
      <div dir="rtl" className="h-full flex items-center justify-center">
        <p className="text-gray-500">درس پیدا نشد</p>
      </div>
    );
  }

  if (node.questions.length === 0) {
    return (
      <div dir="rtl" className="h-full flex flex-col items-center justify-center gap-4 px-5">
        <p className="text-2xl">🎁</p>
        <p className="text-gray-600 font-bold">این درس هنوز سوال ندارد!</p>
        <button onClick={() => navigate('/home')} className="btn-primary">
          برگشت به خانه
        </button>
      </div>
    );
  }

  const currentQuestion = node.questions[currentIndex];

  const overlayColor =
    feedback === 'correct'
      ? 'bg-emerald-400'
      : feedback === 'wrong'
      ? 'bg-red-400'
      : 'bg-transparent';

  return (
    <div dir="rtl" className="min-h-full flex flex-col bg-bg relative">
      {/* Feedback overlay */}
      <AnimatePresence>
        {feedback !== 'idle' && (
          <motion.div
            key={feedback}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.18 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`absolute inset-0 z-20 pointer-events-none ${overlayColor}`}
          />
        )}
      </AnimatePresence>

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
      <div className="flex-1 flex flex-col px-5 pt-4 pb-6">
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
    </div>
  );
};

export default Lesson;
