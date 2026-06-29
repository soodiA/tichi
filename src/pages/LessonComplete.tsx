import React, { useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { db } from '../db/db';
import { syncProfileToCloud, syncProgressToCloud } from '../lib/sync';
import Mascot from '../components/ui/Mascot';

interface LocationState { accuracy?: number; nodeId?: string; }

// ── Performance config ────────────────────────────────────────────────────────
function getPerf(acc: number) {
  if (acc === 100) return { title: 'عالیه! تو ستاره‌ای!', emoji: '🌟', bg: 'from-violet-500 via-fuchsia-500 to-pink-400', ring: '#A855F7', n: 65 };
  if (acc >= 80)  return { title: 'آفرین! خیلی خوب بود!', emoji: '🎉', bg: 'from-violet-500 via-purple-500 to-indigo-500', ring: '#7C3AED', n: 45 };
  if (acc >= 60)  return { title: 'خوب بود! ادامه بده!',  emoji: '😊', bg: 'from-emerald-400 via-teal-400 to-cyan-500', ring: '#10B981', n: 28 };
  return           { title: 'تلاش کردی! دفعه بهتر!',    emoji: '💪', bg: 'from-blue-400 via-sky-400 to-cyan-400',    ring: '#3B82F6', n: 15 };
}

// ── Circular progress ring ────────────────────────────────────────────────────
const Ring: React.FC<{ value: number }> = ({ value }) => {
  const r = 52;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg width="144" height="144" viewBox="0 0 144 144" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="72" cy="72" r={r} fill="none" stroke="#ffffff33" strokeWidth="11" />
        <motion.circle
          cx="72" cy="72" r={r} fill="none"
          stroke="#fff" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (value / 100) * circ }}
          transition={{ duration: 1.6, delay: 0.5, ease: 'easeOut' }}
        />
      </svg>
      <motion.div
        className="absolute text-center"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 18 }}
      >
        <p className="text-3xl font-extrabold text-white leading-none">
          {value.toLocaleString('fa-IR')}٪
        </p>
        <p className="text-white/80 text-xs mt-0.5">دقت</p>
      </motion.div>
    </div>
  );
};

// ── Confetti / particle rain ──────────────────────────────────────────────────
const PARTICLES = ['⭐', '✨', '🌟', '💫', '🎈', '🎉', '🎊', '🦋', '🌈', '💎', '🔥', '🎀'];

const Confetti: React.FC<{ count: number }> = ({ count }) => {
  const items = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2.2,
      duration: 1.8 + Math.random() * 2,
      size: 14 + Math.floor(Math.random() * 22),
      rotate: -180 + Math.random() * 360,
      emoji: PARTICLES[Math.floor(Math.random() * PARTICLES.length)],
    })), [count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {items.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -70, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ y: '108vh', opacity: [1, 1, 1, 0.5, 0], rotate: p.rotate, scale: [1, 1.1, 0.9, 1] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{ position: 'absolute', left: `${p.left}%`, fontSize: p.size }}
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
};

// ── Floating background blobs ─────────────────────────────────────────────────
const Blob: React.FC<{ x: string; y: string; size: number; delay: number }> = ({ x, y, size, delay }) => (
  <motion.div
    className="absolute rounded-full bg-white/10 pointer-events-none"
    style={{ left: x, top: y, width: size, height: size }}
    animate={{ y: [0, -18, 0], scale: [1, 1.06, 1], opacity: [0.4, 0.65, 0.4] }}
    transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
  />
);

// ── Main page ─────────────────────────────────────────────────────────────────
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
  const perf = getPerf(accuracy);

  useEffect(() => {
    if (savedRef.current || !currentUser) return;
    savedRef.current = true;
    addDiamonds(coinsEarned);
    const progress = { nodeId, userId: currentUser.id, completed: true, stars: starCount, accuracy, completedAt: new Date().toISOString(), attempts: 1 };
    db.progress.put(progress).then(() => { syncProgressToCloud(progress).catch(() => {}); });
    syncProfileToCloud({ ...currentUser, diamonds: currentUser.diamonds + coinsEarned, totalScore: currentUser.totalScore + coinsEarned }).catch(() => {});
  }, []);

  return (
    <div dir="rtl" className={`min-h-full relative flex flex-col items-center justify-between overflow-hidden bg-gradient-to-b ${perf.bg}`}>

      {/* Background blobs */}
      <Blob x="5%"  y="10%" size={100} delay={0}   />
      <Blob x="75%" y="5%"  size={70}  delay={1.3} />
      <Blob x="15%" y="65%" size={90}  delay={0.7} />
      <Blob x="80%" y="60%" size={120} delay={2}   />

      {/* Confetti */}
      <Confetti count={perf.n} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full px-5 pt-10 pb-8 gap-5">

        {/* Big emoji */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.05 }}
          className="text-7xl"
        >
          {perf.emoji}
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="text-center"
        >
          <h1 className="text-3xl font-extrabold text-white drop-shadow-lg">{perf.title}</h1>
          <p className="text-white/80 font-medium mt-1 text-sm">
            {currentUser?.name ?? 'دوست من'} عزیز، آفرین!
          </p>
        </motion.div>

        {/* Mascot + ring side by side */}
        <motion.div
          className="flex items-center gap-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 18 }}
        >
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Mascot size={120} expression="celebrating" />
          </motion.div>

          <Ring value={accuracy} />
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
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: s <= starCount ? 1 : 0.45, opacity: s <= starCount ? 1 : 0.3, rotate: 0 }}
              transition={{ delay: 0.55 + s * 0.18, type: 'spring', stiffness: 320, damping: 16 }}
              className="text-5xl drop-shadow-lg"
            >
              ⭐
            </motion.span>
          ))}
        </motion.div>

        {/* Stats cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72 }}
          className="flex gap-3 w-full max-w-sm"
        >
          <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-3xl px-4 py-4 text-center shadow-lg border border-white/30">
            <div className="text-3xl mb-1">🪙</div>
            <p className="text-white/80 text-xs mb-1">سکه گرفتی</p>
            <p className="text-2xl font-extrabold text-white">+{coinsEarned.toLocaleString('fa-IR')}</p>
          </div>
          <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-3xl px-4 py-4 text-center shadow-lg border border-white/30">
            <div className="text-3xl mb-1">🎯</div>
            <p className="text-white/80 text-xs mb-1">تعداد ستاره</p>
            <p className="text-2xl font-extrabold text-white">{'⭐'.repeat(starCount)}</p>
          </div>
        </motion.div>

        {/* Continue button */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0, boxShadow: ['0 4px 24px rgba(255,255,255,0.2)', '0 8px 32px rgba(255,255,255,0.45)', '0 4px 24px rgba(255,255,255,0.2)'] }}
          transition={{ opacity: { delay: 0.88 }, y: { delay: 0.88 }, boxShadow: { duration: 2, repeat: Infinity, delay: 1.2 } }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/home')}
          className="w-full max-w-sm py-4 rounded-3xl bg-white font-extrabold text-xl shadow-2xl transition-transform"
          style={{ color: '#7C3AED' }}
        >
          ادامه →
        </motion.button>
      </div>
    </div>
  );
};

export default LessonComplete;
