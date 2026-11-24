import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import Mascot from '../components/ui/Mascot';

// Public front door of tichikids.ir: pick a subject. Only the Persian app lives in this codebase;
// the other cards are separate apps (see SUBJECTS).
const KANGAROO_URL = 'https://soodia.github.io/lumio/';

interface Subject {
  key: string;
  title: string;
  hint: string;
  emoji: string;
  // tailwind classes
  face: string;
  edge: string;
  action: { kind: 'route'; to: string } | { kind: 'link'; href: string } | { kind: 'soon' };
}

const SUBJECTS: Subject[] = [
  {
    key: 'persian', title: 'فارسی اول دبستان', hint: 'الفبا را با تیچی یاد بگیر', emoji: '📖',
    face: 'from-fuchsia-400 to-violet-500', edge: 'shadow-[0_8px_0_0_#6d28d9]',
    action: { kind: 'route', to: '/start' },
  },
  {
    key: 'math', title: 'ریاضی اول دبستان', hint: 'عددها و شمردن', emoji: '🔢',
    face: 'from-emerald-300 to-teal-400', edge: 'shadow-[0_8px_0_0_#0f766e]',
    action: { kind: 'soon' },
  },
  {
    key: 'kangaroo', title: 'کانگورو', hint: 'مسابقه‌ی ریاضی و فکر کردن', emoji: '🦘',
    face: 'from-amber-300 to-orange-400', edge: 'shadow-[0_8px_0_0_#c2410c]',
    action: { kind: 'link', href: KANGAROO_URL },
  },
];

const FLOATERS = [
  { e: '⭐', x: '8%', y: '10%', d: 0 }, { e: '☁️', x: '78%', y: '6%', d: 0.6 },
  { e: '🌈', x: '84%', y: '34%', d: 1.1 }, { e: '🎈', x: '6%', y: '42%', d: 0.3 },
  { e: '✨', x: '70%', y: '78%', d: 0.9 }, { e: '🍎', x: '12%', y: '82%', d: 0.5 },
  { e: '🔤', x: '24%', y: '30%', d: 1.4 },
];

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [soonKey, setSoonKey] = React.useState<string | null>(null);

  const open = (s: Subject) => {
    if (s.action.kind === 'route') navigate(s.action.to);
    else if (s.action.kind === 'link') window.location.href = s.action.href;
    else {
      setSoonKey(s.key);
      window.setTimeout(() => setSoonKey((k) => (k === s.key ? null : k)), 2200);
    }
  };

  return (
    <div
      dir="rtl"
      className="relative min-h-screen overflow-hidden flex flex-col items-center px-5 pt-8 pb-10
                 bg-gradient-to-b from-sky-200 via-pink-100 to-yellow-100"
    >
      {FLOATERS.map((f, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute text-3xl select-none pointer-events-none opacity-80"
          style={{ left: f.x, top: f.y }}
          animate={reduce ? {} : { y: [0, -14, 0], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 4 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay: f.d }}
        >
          {f.e}
        </motion.span>
      ))}

      <motion.div
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        className="relative z-10 mt-2"
      >
        <Mascot size={140} expression="excited" />
      </motion.div>

      <h1 className="relative z-10 mt-1 text-5xl font-extrabold text-violet-700 drop-shadow-sm">تیچی</h1>
      <p className="relative z-10 mt-2 mb-7 text-lg font-bold text-violet-500">چی دوست داری یاد بگیری؟</p>

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6">
        {SUBJECTS.map((s, i) => (
          <motion.button
            key={s.key}
            type="button"
            onClick={() => open(s)}
            initial={reduce ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 180, damping: 16 }}
            whileHover={reduce ? undefined : { scale: 1.03 }}
            whileTap={reduce ? undefined : { y: 6, scale: 0.98 }}
            className={`relative w-full min-h-[104px] rounded-[2rem] bg-gradient-to-br ${s.face} ${s.edge}
                        text-white flex items-center gap-4 px-5 py-4 text-right
                        focus:outline-none focus-visible:ring-4 focus-visible:ring-white`}
            aria-label={s.title}
          >
            <span className="shrink-0 w-[68px] h-[68px] rounded-full bg-white/90 flex items-center justify-center text-4xl shadow-inner">
              {s.emoji}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-2xl font-extrabold leading-snug drop-shadow">{s.title}</span>
              <span className="block text-sm font-bold text-white/90">{s.hint}</span>
            </span>
            {s.action.kind === 'soon' && (
              <span className="absolute -top-3 left-4 rotate-[-6deg] bg-yellow-300 text-yellow-900 text-xs font-extrabold px-3 py-1 rounded-full shadow">
                به‌زودی
              </span>
            )}
            {soonKey === s.key && (
              <span role="status" className="absolute inset-x-6 -bottom-9 z-20 bg-white text-violet-700 text-sm font-bold rounded-2xl px-4 py-2 shadow-lg text-center">
                این بخش به‌زودی باز می‌شود 🎉
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default Landing;
