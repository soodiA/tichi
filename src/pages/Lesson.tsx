import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { db } from '../db/db';
import { loadCurriculum } from '../lib/curriculum';
import ProgressBar from '../components/ui/ProgressBar';
import QuestionWrapper from '../components/questions/QuestionWrapper';
import UnitIntroGeneric from '../components/questions/UnitIntroGeneric';
import PageBg from '../components/ui/PageBg';
import Mascot from '../components/ui/Mascot';
import { UNIT_INTROS } from '../data/unitIntros';
import type { Node } from '../types';

// Star burst on correct answer
const STAR_EMOJIS = ['⭐', '✨', '🌟', '💫', '🎉'];
const StarBurst: React.FC = () => {
  const stars = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      emoji: STAR_EMOJIS[i % STAR_EMOJIS.length],
      x: 20 + Math.random() * 60,
      delay: Math.random() * 0.25,
      size: 18 + Math.floor(Math.random() * 18),
    })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {stars.map((s) => (
        <motion.span
          key={s.id}
          initial={{ y: '60%', x: `${s.x}%`, opacity: 1, scale: 0 }}
          animate={{ y: '-20%', opacity: [1, 1, 0], scale: [0, 1.3, 1] }}
          transition={{ duration: 1.1, delay: s.delay, ease: 'easeOut' }}
          style={{ position: 'absolute', fontSize: s.size }}
        >
          {s.emoji}
        </motion.span>
      ))}
    </div>
  );
};

type FeedbackState = 'idle' | 'correct' | 'wrong';

const PRAISE = ['آفرین! 🎉', 'خیلی خوب بود! ⭐', 'احسنت! 🌟', 'عالی بود! 🎊', 'آفرین، تیچی خوشحال شد! 🐼', 'فوق‌العاده! ✨', 'دمت گرم! 🌟'];
const randomPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

const Lesson: React.FC = () => {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);

  const [node, setNode] = useState<Node | null>(null);
  const [unitLetter, setUnitLetter] = useState<string>('');
  const [loadingNode, setLoadingNode] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, setAnswers] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const [shownCorrectAnswer, setShownCorrectAnswer] = useState<string>('');
  const [praiseText, setPraiseText] = useState('');
  const answersRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!nodeId) return;
    loadCurriculum().then((units) => {
      for (const u of units) {
        const found = u.nodes.find((n) => n.id === nodeId);
        if (found) { setNode(found); setUnitLetter(u.letter); break; }
      }
      setLoadingNode(false);
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
        if (question.type === 'audio_picture' || question.type === 'audio_options' || question.type === 'fill_blanks') {
          const opt = question.options?.find((o) => o.id === question.correctAnswer);
          if (opt?.text) correctDisplay = opt.text;
        } else if (question.type === 'phoneme' && Array.isArray(question.correctAnswer)) {
          // Map each option ID to its text, join with space
          correctDisplay = (question.correctAnswer as string[])
            .map((id) => question.options?.find((o) => o.id === id)?.text ?? id)
            .join(' ');
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

  if (loadingNode) {
    return (
      <div dir="rtl" className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-violet-300 border-t-violet-600 animate-spin" />
      </div>
    );
  }

  if (!node) {
    return (
      <div dir="rtl" className="h-full flex items-center justify-center">
        <p className="text-gray-500">درس پیدا نشد</p>
      </div>
    );
  }

  if (node.type === 'intro') {
    const introData = UNIT_INTROS[unitLetter];
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
    if (!introData) {
      // No intro data yet for this letter — just complete immediately
      completeIntro();
      return null;
    }
    return <UnitIntroGeneric data={introData} onComplete={completeIntro} />;
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
    <div
      dir="rtl"
      className="min-h-screen max-h-screen flex flex-col relative overflow-hidden"
    >
      <PageBg variant="purple" />
      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-5 pb-3">
        <button
          onClick={() => navigate('/home')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 text-gray-600 hover:bg-white/90 transition-colors flex-shrink-0"
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
      <div className={`relative z-10 flex-1 flex flex-col px-5 pt-4 transition-all duration-300 ${feedback !== 'idle' ? 'pb-44' : 'pb-6'}`}>
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

      {/* Star burst overlay */}
      <AnimatePresence>
        {feedback === 'correct' && <StarBurst key="starburst" />}
      </AnimatePresence>

      {/* Feedback panel */}
      <AnimatePresence>
        {feedback !== 'idle' && (
          <motion.div
            key="feedback"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 px-5 pt-4 pb-8 rounded-t-3xl shadow-2xl
              ${feedback === 'correct'
                ? 'bg-emerald-50 border-t-2 border-emerald-200'
                : 'bg-red-50 border-t-2 border-red-200'}`}
          >
            <div className="flex items-end gap-3 mb-4">
              {/* Mascot */}
              <motion.div
                initial={{ scale: 0, rotate: feedback === 'correct' ? -20 : 20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 15, delay: 0.1 }}
                className="flex-shrink-0"
              >
                <Mascot
                  size={72}
                  expression={feedback === 'correct' ? 'celebrating' : 'sad'}
                  animate={false}
                />
              </motion.div>

              {/* Speech bubble */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 260 }}
                className={`relative rounded-2xl rounded-br-sm px-4 py-3 flex-1 shadow-md
                  ${feedback === 'correct' ? 'bg-emerald-500' : 'bg-red-100 border border-red-200'}`}
              >
                {feedback === 'correct' ? (
                  <p className="text-white font-extrabold text-lg leading-snug">{praiseText}</p>
                ) : (
                  <>
                    <p className="text-red-500 font-bold text-sm mb-0.5">جواب درست:</p>
                    <p className="text-red-800 font-extrabold text-2xl">{shownCorrectAnswer}</p>
                  </>
                )}
                {/* Bubble tail */}
                <div className={`absolute bottom-2 -right-2 w-0 h-0
                  border-t-[8px] border-t-transparent
                  border-l-[10px]
                  border-b-[8px] border-b-transparent
                  ${feedback === 'correct' ? 'border-l-emerald-500' : 'border-l-red-100'}`}
                />
              </motion.div>
            </div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              onClick={handleContinue}
              className={`w-full py-4 rounded-2xl font-extrabold text-lg text-white active:scale-95 transition-transform shadow-lg
                ${feedback === 'correct' ? 'bg-emerald-500' : 'bg-red-500'}`}
            >
              ادامه →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Lesson;
