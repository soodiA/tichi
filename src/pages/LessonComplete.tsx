import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { db } from '../db/db';
import { syncProfileToCloud, syncProgressToCloud } from '../lib/sync';
import Mascot from '../components/ui/Mascot';
import SceneBg from '../components/ui/SceneBg';

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
  const coinsEarned = 10 + (starCount - 1) * 5;
  const accuracyLabel =
    accuracy === 100 ? 'عالی! 🌟' : accuracy >= 80 ? 'خوب! 👍' : 'تلاش کن! 💪';

  useEffect(() => {
    if (savedRef.current || !currentUser) return;
    savedRef.current = true;

    addDiamonds(coinsEarned);

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
      diamonds: currentUser.diamonds + coinsEarned,
      totalScore: currentUser.totalScore + coinsEarned,
    };
    syncProfileToCloud(updatedUser).catch(() => {});
  }, []);

  return (
    <div dir="rtl" className="min-h-full relative flex flex-col items-center justify-between overflow-hidden">
      {/* Scenic background */}
      <SceneBg />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col items-center w-full px-5 pt-12 pb-8 gap-5">

        {/* Tichi mascot celebrating */}
        <motion.div
          initial={{ scale: 0, y: -40 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        >
          <Mascot size={150} expression="celebrating" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <h1 className="text-3xl font-extrabold text-gray-800">
            آفرین، {currentUser?.name ?? 'دوست من'}!
          </h1>
          <p className="text-gray-500 font-medium mt-1">درس رو تموم کردی 🎉</p>
        </motion.div>

        {/* Stars */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="flex gap-3"
        >
          {[1, 2, 3].map((s) => (
            <motion.span
              key={s}
              initial={{ scale: 0 }}
              animate={{ scale: s <= starCount ? 1 : 0.55, opacity: s <= starCount ? 1 : 0.25 }}
              transition={{ delay: 0.5 + s * 0.15, type: 'spring', stiffness: 300 }}
              className="text-5xl"
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
          className="flex gap-3 w-full max-w-sm"
        >
          <div className="flex-1 bg-white rounded-3xl px-4 py-4 text-center shadow-md">
            <div className="text-3xl mb-1">🪙</div>
            <p className="text-gray-400 text-xs mb-1">سکه گرفتی</p>
            <p className="text-2xl font-extrabold text-amber-500">
              +{coinsEarned.toLocaleString('fa-IR')}
            </p>
          </div>
          <div className="flex-1 bg-white rounded-3xl px-4 py-4 text-center shadow-md">
            <div className="text-3xl mb-1">🎯</div>
            <p className="text-gray-400 text-xs mb-1">دقت</p>
            <p className="text-2xl font-extrabold text-violet-600">
              {accuracy.toLocaleString('fa-IR')}٪
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{accuracyLabel}</p>
          </div>
        </motion.div>

        {/* Continue button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/home')}
          className="w-full max-w-sm py-4 rounded-2xl bg-violet-600 text-white font-extrabold text-xl shadow-lg active:scale-95 transition-transform"
        >
          ادامه →
        </motion.button>
      </div>
    </div>
  );
};

export default LessonComplete;
