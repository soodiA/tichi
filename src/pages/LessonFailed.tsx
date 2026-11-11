import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import Mascot from '../components/ui/Mascot';
import { syncProfileToCloud } from '../lib/sync';

interface LocationState { nodeId?: string; wrong?: number; accuracy?: number; }

// Shown when a lesson had too many wrong answers. No stars, no coins, no completion (the next lesson stays
// locked until this one is passed) — but the daily streak still counts, since the child came and tried.
const LessonFailed: React.FC = () => {
  const navigate = useNavigate();
  const state = (useLocation().state as LocationState) ?? {};
  const currentUser = useStore((s) => s.currentUser);
  const nodeId = state.nodeId;
  const incrementStreak = useStore((s) => s.incrementStreak);
  const streakedRef = useRef(false);

  useEffect(() => {
    if (streakedRef.current || !currentUser) return;
    streakedRef.current = true;
    incrementStreak();
    const streaked = useStore.getState().currentUser ?? currentUser;
    syncProfileToCloud(streaked).catch((e) => console.error('[sync] lesson-failed profile sync failed', e));
  }, []);

  return (
    <div dir="rtl" className="min-h-full flex flex-col items-center justify-center gap-6 px-6 py-10 bg-gradient-to-b from-sky-400 via-blue-400 to-indigo-400">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
        <Mascot size={140} expression="sad" />
      </motion.div>
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-white drop-shadow-lg">این مرحله رو رد نکردی</h1>
        <p className="text-white/90 font-medium mt-2">
          {currentUser?.name ?? 'دوست من'} عزیز، چند تا جواب اشتباه بود. نگران نباش، دوباره تلاش کن تا به مرحله بعد بری!
        </p>
        {state.wrong != null && (
          <p className="text-white/80 text-sm mt-2">تعداد پاسخ اشتباه: {state.wrong.toLocaleString('fa-IR')}</p>
        )}
      </div>
      <div className="w-full max-w-sm flex flex-col gap-3">
        {nodeId && (
          <button
            onClick={() => navigate(`/lesson/${nodeId}`, { replace: true })}
            className="w-full py-4 rounded-3xl bg-white font-extrabold text-xl shadow-2xl"
            style={{ color: '#4F46E5' }}
          >
            دوباره تلاش کن
          </button>
        )}
        <button
          onClick={() => navigate('/home', { state: nodeId ? { scrollToNode: nodeId } : undefined })}
          className="w-full py-3 rounded-3xl bg-white/25 text-white font-bold text-lg border border-white/40"
        >
          برگشت به مسیر
        </button>
      </div>
    </div>
  );
};

export default LessonFailed;
