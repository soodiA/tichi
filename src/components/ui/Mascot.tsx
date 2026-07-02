import React from 'react';
import { motion } from 'framer-motion';

interface MascotProps {
  size?: number;
  expression?: 'happy' | 'excited' | 'thinking' | 'celebrating' | 'sad';
  animate?: boolean;
  className?: string;
}

const Mascot: React.FC<MascotProps> = ({
  size = 160,
  expression = 'happy',
  animate = true,
  className = '',
}) => {
  const isExcited = expression === 'excited' || expression === 'celebrating';
  const isThinking = expression === 'thinking';
  const isSad = expression === 'sad';

  return (
    <motion.div
      className={`inline-block ${className}`}
      animate={animate ? { y: [0, -8, 0] } : {}}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg
        width={size}
        height={size * 1.1}
        viewBox="0 0 200 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ground shadow */}
        <ellipse cx="100" cy="215" rx="45" ry="6" fill="rgba(0,0,0,0.10)" />

        {/* ── BODY ── */}
        <ellipse cx="100" cy="178" rx="48" ry="40" fill="white" stroke="#1A1A1A" strokeWidth="3" />
        {/* Belly patch */}
        <ellipse cx="100" cy="185" rx="28" ry="24" fill="#F5F5F5" stroke="#E0E0E0" strokeWidth="1.5" />

        {/* Arms */}
        <ellipse cx="56"  cy="172" rx="16" ry="12" fill="#1A1A1A" stroke="#1A1A1A" strokeWidth="2" transform="rotate(-30 56 172)" />
        <ellipse cx="144" cy="172" rx="16" ry="12" fill="#1A1A1A" stroke="#1A1A1A" strokeWidth="2" transform="rotate(30 144 172)" />
        {/* Paw tips */}
        <ellipse cx="44"  cy="183" rx="10" ry="8"  fill="white" stroke="#1A1A1A" strokeWidth="2" />
        <ellipse cx="156" cy="183" rx="10" ry="8"  fill="white" stroke="#1A1A1A" strokeWidth="2" />

        {/* Feet */}
        <ellipse cx="76"  cy="210" rx="20" ry="11" fill="#1A1A1A" />
        <ellipse cx="124" cy="210" rx="20" ry="11" fill="#1A1A1A" />
        <ellipse cx="70"  cy="213" rx="9"  ry="4"  fill="white" opacity="0.35" />
        <ellipse cx="130" cy="213" rx="9"  ry="4"  fill="white" opacity="0.35" />

        {/* ── HEAD ── */}
        {/* Ears (behind head) */}
        <circle cx="46"  cy="48" r="26" fill="#1A1A1A" stroke="#1A1A1A" strokeWidth="2" />
        <circle cx="154" cy="48" r="26" fill="#1A1A1A" stroke="#1A1A1A" strokeWidth="2" />
        <circle cx="46"  cy="48" r="15" fill="#2E2E2E" />
        <circle cx="154" cy="48" r="15" fill="#2E2E2E" />

        {/* Head white circle */}
        <circle cx="100" cy="100" r="72" fill="white" stroke="#1A1A1A" strokeWidth="3" />

        {/* Eye patches — large oval */}
        <ellipse cx="70"  cy="98" rx="28" ry="27" fill="#1A1A1A" />
        <ellipse cx="130" cy="98" rx="28" ry="27" fill="#1A1A1A" />

        {/* Eye whites */}
        <ellipse cx="70"  cy="94" rx="21" ry="22" fill="white" />
        <ellipse cx="130" cy="94" rx="21" ry="22" fill="white" />

        {/* Pupils + expressions */}
        {isSad ? (
          <>
            {/* Sad half-closed eyes */}
            <ellipse cx="70"  cy="98" rx="14" ry="9" fill="#1A1A1A" />
            <ellipse cx="130" cy="98" rx="14" ry="9" fill="#1A1A1A" />
            <circle cx="75"  cy="92" r="4" fill="white" />
            <circle cx="135" cy="92" r="4" fill="white" />
            {/* Sad brows: inner corners raised */}
            <path d="M52 78 Q68 72 84 80"  stroke="#1A1A1A" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M116 80 Q132 72 148 78" stroke="#1A1A1A" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* Small tear */}
            <ellipse cx="58" cy="112" rx="4" ry="5" fill="#ADD8E6" opacity="0.85" />
          </>
        ) : isThinking ? (
          <>
            {/* Half-closed thinking eyes */}
            <ellipse cx="70"  cy="96" rx="14" ry="10" fill="#1A1A1A" />
            <ellipse cx="130" cy="96" rx="14" ry="10" fill="#1A1A1A" />
            {/* Shine */}
            <circle cx="75"  cy="90" r="5" fill="white" />
            <circle cx="135" cy="90" r="5" fill="white" />
            <circle cx="62"  cy="100" r="2.5" fill="white" opacity="0.6" />
            <circle cx="122" cy="100" r="2.5" fill="white" opacity="0.6" />
            {/* Thinking brow */}
            <path d="M55 76 Q70 70 85 76"  stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M115 76 Q130 70 145 76" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" fill="none" />
          </>
        ) : isExcited ? (
          <>
            {/* Arc/happy eyes */}
            <path d="M52 94 Q70 112 88 94"  stroke="#1A1A1A" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M112 94 Q130 112 148 94" stroke="#1A1A1A" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            {/* Normal large cute pupils */}
            <ellipse cx="70"  cy="96" rx="14" ry="15" fill="#1A1A1A" />
            <ellipse cx="130" cy="96" rx="14" ry="15" fill="#1A1A1A" />
            {/* Main shine dot */}
            <circle cx="77"  cy="87" r="6" fill="white" />
            <circle cx="137" cy="87" r="6" fill="white" />
            {/* Secondary shine */}
            <circle cx="62"  cy="103" r="3" fill="white" opacity="0.55" />
            <circle cx="122" cy="103" r="3" fill="white" opacity="0.55" />
          </>
        )}

        {/* Nose — small round oval */}
        <ellipse cx="100" cy="116" rx="7" ry="5" fill="#1A1A1A" />

        {/* Mouth */}
        {isSad ? (
          <path d="M83 132 Q100 120 117 132" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : isExcited ? (
          <>
            <path d="M82 124 Q100 142 118 124" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Tongue */}
            <ellipse cx="100" cy="136" rx="11" ry="8" fill="#F48FB1" stroke="#E57399" strokeWidth="1" />
            <line x1="100" y1="128" x2="100" y2="144" stroke="#E57399" strokeWidth="1.5" />
          </>
        ) : isThinking ? (
          <path d="M84 126 Q100 134 116 122" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M83 124 Q100 140 117 124" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" fill="none" />
        )}

        {/* Blush cheeks */}
        <ellipse cx="36"  cy="118" rx="16" ry="10" fill="#FFB3C8" opacity="0.65" />
        <ellipse cx="164" cy="118" rx="16" ry="10" fill="#FFB3C8" opacity="0.65" />

        {/* Celebrating sparkles */}
        {expression === 'celebrating' && (
          <>
            <text x="2"   y="40"  fontSize="20">✨</text>
            <text x="168" y="50"  fontSize="16">⭐</text>
            <text x="5"   y="100" fontSize="14">🌟</text>
            <text x="170" y="105" fontSize="13">💫</text>
          </>
        )}
        {expression === 'excited' && (
          <>
            <text x="4"   y="50"  fontSize="16">💛</text>
            <text x="172" y="58"  fontSize="13">✨</text>
          </>
        )}
      </svg>
    </motion.div>
  );
};

export default Mascot;
