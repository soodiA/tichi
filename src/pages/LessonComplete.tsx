import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { db } from '../db/db';
import { syncProfileToCloud, syncProgressToCloud } from '../lib/sync';

interface LocationState {
  accuracy?: number;
  nodeId?: string;
}

const LessonComplete: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) ?? {};
  const accuracy = state.accuracy ?? 100;
  const nodeId = state.nodeId ?? 'unknown';

  const currentUser = useStore((s) => s.currentUser);
  const addDiamonds = useStore((s) => s.addDiamonds);
  const savedRef = useRef(false);

  const starCount = accuracy === 100 ? 3 : accuracy >= 80 ? 2 : 1;
  const diamondsEarned = 10 + (starCount - 1) * 5;
  const accuracyLabel =
    accuracy === 100 ? 'عالی! 🌟' : accuracy >= 80 ? 'خوب! 👍' : 'تلاش کن! 💪';

  useEffect(() => {
    if (savedRef.current || !currentUser) return;
    savedRef.current = true;

    addDiamonds(diamondsEarned);

    const progress = {
      nodeId,
      userId: currentUser.id,
      completed: true,
      stars: starCount,
      accuracy,
      completedAt: new Date().toISOString(),
      attempts: 1,
    };

    db.progress.put(progress).then(() => {
      syncProgressToCloud(progress).catch(() => {});
    });

    const updatedUser = {
      ...currentUser,
      diamonds: currentUser.diamonds + diamondsEarned,
      totalScore: currentUser.totalScore + diamondsEarned,
    };
    syncProfileToCloud(updatedUser).catch(() => {});
  }, []);

  return (
    <div
      dir="rtl"
      className="min-h-full bg-gradient-to-b from-violet-50 to-amber-50 flex flex-col items-center justify-center px-5 py-10 gap-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.3, 1] }}
        transition={{ duration: 0.6, times: [0, 0.6, 1] }}
        className="text-8xl"
      >
        🦉
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-3xl font-extrabold text-violet-700 text-center"
      >
        آفرین! درس تموم شد!
      </motion.h1>

      {/* Stars */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex gap-2"
      >
        {[1, 2, 3].map((s) => (
          <motion.span
            key={s}
            initial={{ scale: 0 }}
            animate={{ scale: s <= starCount ? 1 : 0.6, opacity: s <= starCount ? 1 : 0.3 }}
            transition={{ delay: 0.5 + s * 0.15 }}
            className="text-4xl"
          >
            ⭐
          </motion.span>
        ))}
      </motion.div>

      {/* Stats cards */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex gap-4 w-full max-w-sm"
      >
        <div className="flex-1 card text-center">
          <div className="text-3xl mb-1">💎</div>
          <p className="text-gray-500 text-xs mb-1">الماس گرفتی</p>
          <p className="text-2xl font-extrabold text-blue-600">
            {diamondsEarned.toLocaleString('fa-IR')}
          </p>
        </div>
        <div className="flex-1 card text-center">
          <div className="text-3xl mb-1">🎯</div>
          <p className="text-gray-500 text-xs mb-1">دقت</p>
          <p className="text-2xl font-extrabold text-violet-600">
            {accuracy.toLocaleString('fa-IR')}٪
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{accuracyLabel}</p>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => navigate('/home')}
        className="btn-success w-full max-w-sm text-xl"
      >
        ادامه
      </motion.button>
    </div>
  );
};

export default LessonComplete;
