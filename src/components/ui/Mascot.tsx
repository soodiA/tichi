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
  const eyeOpen = expression !== 'thinking';
  const mouthCurve = expression === 'excited' || expression === 'celebrating' ? 'M46 78 Q60 90 74 78' : 'M48 76 Q60 84 72 76';

  return (
    <motion.div
      className={`inline-block ${className}`}
      animate={animate ? { y: [0, -8, 0] } : {}}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg
        width={size}
        height={size * 1.2}
        viewBox="0 0 120 144"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow */}
        <ellipse cx="60" cy="140" rx="32" ry="5" fill="rgba(0,0,0,0.08)" />

        {/* Body */}
        <ellipse cx="60" cy="102" rx="36" ry="38" fill="#C17F47" />

        {/* Belly */}
        <ellipse cx="60" cy="108" rx="22" ry="27" fill="#FEF3C7" />

        {/* Left Wing */}
        <path d="M24 90 Q8 80 14 60 Q20 75 30 82 Z" fill="#A86C38" />
        {/* Right Wing */}
        <path d="M96 90 Q112 80 106 60 Q100 75 90 82 Z" fill="#A86C38" />

        {/* Left Foot */}
        <g transform="translate(40, 135)">
          <path d="M0 0 L-8 10" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
          <path d="M0 0 L0 11" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
          <path d="M0 0 L8 10" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
        </g>
        {/* Right Foot */}
        <g transform="translate(80, 135)">
          <path d="M0 0 L-8 10" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
          <path d="M0 0 L0 11" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
          <path d="M0 0 L8 10" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* Head */}
        <circle cx="60" cy="54" r="38" fill="#C17F47" />

        {/* Ear tufts */}
        <path d="M30 24 Q26 8 38 16 Q34 22 32 28 Z" fill="#A86C38" />
        <path d="M90 24 Q94 8 82 16 Q86 22 88 28 Z" fill="#A86C38" />

        {/* Face lighter patch */}
        <ellipse cx="60" cy="60" rx="26" ry="24" fill="#E8A96A" opacity="0.4" />

        {/* Left Eye white */}
        <circle cx="44" cy="54" r="14" fill="white" />
        {/* Right Eye white */}
        <circle cx="76" cy="54" r="14" fill="white" />

        {/* Left Eye iris */}
        {eyeOpen ? (
          <>
            <circle cx="44" cy="54" r="9" fill="#1F2937" />
            <circle cx="44" cy="54" r="4" fill="#3B1F0A" />
            <circle cx="47" cy="50" r="3" fill="white" />
          </>
        ) : (
          <path d="M34 54 Q44 62 54 54" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" fill="none" />
        )}

        {/* Right Eye iris */}
        {eyeOpen ? (
          <>
            <circle cx="76" cy="54" r="9" fill="#1F2937" />
            <circle cx="76" cy="54" r="4" fill="#3B1F0A" />
            <circle cx="79" cy="50" r="3" fill="white" />
          </>
        ) : (
          <path d="M66 54 Q76 62 86 54" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" fill="none" />
        )}

        {/* Glasses */}
        <circle cx="44" cy="54" r="14" fill="none" stroke="#7C3AED" strokeWidth="2.5" />
        <circle cx="76" cy="54" r="14" fill="none" stroke="#7C3AED" strokeWidth="2.5" />
        <path d="M58 54 L62 54" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M30 50 Q26 48 24 52" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M90 50 Q94 48 96 52" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Beak */}
        <path d="M54 68 L66 68 L60 76" fill="#F97316" />

        {/* Smile */}
        <path d={mouthCurve} stroke="#A86C38" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Graduation cap base */}
        <ellipse cx="60" cy="20" rx="32" ry="6" fill="#4C1D95" />
        {/* Cap top */}
        <rect x="36" y="6" width="48" height="16" rx="4" fill="#4C1D95" />
        {/* Tassel string */}
        <line x1="92" y1="20" x2="92" y2="36" stroke="#F59E0B" strokeWidth="2" />
        {/* Tassel ball */}
        <circle cx="92" cy="38" r="4" fill="#F59E0B" />
        {/* Tassel fringe */}
        <path d="M88 38 L84 46 M92 40 L90 48 M96 38 L98 46" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />

        {/* Celebrating stars */}
        {expression === 'celebrating' && (
          <>
            <motion.text x="5" y="30" fontSize="16" animate={{ rotate: [-15, 15], opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}>⭐</motion.text>
            <motion.text x="98" y="35" fontSize="12" animate={{ rotate: [15, -15], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity }}>✨</motion.text>
          </>
        )}
      </svg>
    </motion.div>
  );
};

export default Mascot;
