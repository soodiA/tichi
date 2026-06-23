import React from 'react';
import { motion } from 'framer-motion';

interface MascotProps {
  size?: number;
  expression?: 'happy' | 'excited' | 'thinking' | 'celebrating';
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

  return (
    <motion.div
      className={`inline-block ${className}`}
      animate={animate ? { y: [0, -8, 0] } : {}}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg
        width={size}
        height={size * 1.1}
        viewBox="0 0 120 132"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow */}
        <ellipse cx="60" cy="128" rx="28" ry="5" fill="rgba(0,0,0,0.10)" />

        {/* Body */}
        <ellipse cx="60" cy="106" rx="30" ry="24" fill="#F8F8F8" />
        {/* Body black belly patch */}
        <ellipse cx="60" cy="112" rx="16" ry="14" fill="#1a1a1a" opacity="0.08" />

        {/* Left arm */}
        <ellipse cx="32" cy="106" rx="10" ry="8" fill="#1a1a1a" transform="rotate(-20, 32, 106)" />
        <ellipse cx="24" cy="115" rx="7" ry="6" fill="#1a1a1a" transform="rotate(-10, 24, 115)" />

        {/* Right arm */}
        <ellipse cx="88" cy="106" rx="10" ry="8" fill="#1a1a1a" transform="rotate(20, 88, 106)" />
        <ellipse cx="96" cy="115" rx="7" ry="6" fill="#1a1a1a" transform="rotate(10, 96, 115)" />

        {/* Feet */}
        <ellipse cx="45" cy="126" rx="12" ry="7" fill="#1a1a1a" />
        <ellipse cx="75" cy="126" rx="12" ry="7" fill="#1a1a1a" />

        {/* Head */}
        <circle cx="60" cy="52" r="42" fill="#F8F8F8" />

        {/* Ears (black) */}
        <circle cx="25" cy="18" r="17" fill="#1a1a1a" />
        <circle cx="95" cy="18" r="17" fill="#1a1a1a" />
        {/* Ear inner (slightly lighter) */}
        <circle cx="25" cy="18" r="10" fill="#2d2d2d" />
        <circle cx="95" cy="18" r="10" fill="#2d2d2d" />

        {/* Left eye patch */}
        <ellipse cx="43" cy="53" rx="18" ry="17" fill="#1a1a1a" />
        {/* Right eye patch */}
        <ellipse cx="77" cy="53" rx="18" ry="17" fill="#1a1a1a" />

        {/* Left eye white */}
        <circle cx="43" cy="51" r="12" fill="white" />
        {/* Right eye white */}
        <circle cx="77" cy="51" r="12" fill="white" />

        {/* Left pupil */}
        {isThinking ? (
          <path d="M36 51 Q43 56 50 51" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : (
          <>
            <circle cx="45" cy="52" r="8" fill="#1a1a1a" />
            <circle cx="47" cy="48" r="3" fill="white" />
            <circle cx="41" cy="55" r="1.5" fill="white" opacity="0.7" />
          </>
        )}

        {/* Right pupil */}
        {isThinking ? (
          <path d="M70 51 Q77 56 84 51" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : (
          <>
            <circle cx="79" cy="52" r="8" fill="#1a1a1a" />
            <circle cx="81" cy="48" r="3" fill="white" />
            <circle cx="75" cy="55" r="1.5" fill="white" opacity="0.7" />
          </>
        )}

        {/* Nose */}
        <ellipse cx="60" cy="67" rx="5" ry="4" fill="#1a1a1a" />

        {/* Mouth */}
        {isExcited ? (
          <>
            <path d="M50 73 Q60 84 70 73" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Tongue */}
            <ellipse cx="60" cy="80" rx="7" ry="5" fill="#F48FB1" />
          </>
        ) : isThinking ? (
          <path d="M52 74 Q58 78 68 72" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M51 74 Q60 82 69 74" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        )}

        {/* Blush cheeks */}
        <ellipse cx="25" cy="68" rx="8" ry="5" fill="#FFB3C1" opacity="0.55" />
        <ellipse cx="95" cy="68" rx="8" ry="5" fill="#FFB3C1" opacity="0.55" />

        {/* Excited sparkles / celebrating */}
        {expression === 'celebrating' && (
          <>
            <text x="5" y="30" fontSize="14">✨</text>
            <text x="98" y="38" fontSize="12">⭐</text>
            <text x="8" y="65" fontSize="10">🌟</text>
          </>
        )}
        {expression === 'excited' && (
          <>
            <text x="4" y="36" fontSize="12">💛</text>
            <text x="100" y="42" fontSize="10">✨</text>
          </>
        )}
      </svg>
    </motion.div>
  );
};

export default Mascot;
