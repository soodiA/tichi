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
        height={size * 1.15}
        viewBox="0 0 140 161"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="headGrad" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F0F0F0" />
          </radialGradient>
          <radialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E8E8E8" />
          </radialGradient>
          <radialGradient id="eyeWhiteL" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F5F5F5" />
          </radialGradient>
          <radialGradient id="eyeWhiteR" cx="60%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F5F5F5" />
          </radialGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#00000018" />
          </filter>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="70" cy="157" rx="32" ry="5" fill="rgba(0,0,0,0.08)" />

        {/* Body */}
        <ellipse cx="70" cy="126" rx="33" ry="27" fill="url(#bodyGrad)" stroke="#D0D0D0" strokeWidth="1.5" filter="url(#softShadow)" />
        {/* Belly circle */}
        <ellipse cx="70" cy="130" rx="18" ry="16" fill="#F7F7F7" opacity="0.7" />

        {/* Left arm */}
        <ellipse cx="38" cy="122" rx="11" ry="9" fill="#1C1C1C" transform="rotate(-25 38 122)" />
        <ellipse cx="29" cy="133" rx="8" ry="7" fill="#1C1C1C" transform="rotate(-10 29 133)" />
        {/* Left arm white paw tip */}
        <ellipse cx="26" cy="138" rx="5" ry="4" fill="#F0F0F0" opacity="0.5" />

        {/* Right arm */}
        <ellipse cx="102" cy="122" rx="11" ry="9" fill="#1C1C1C" transform="rotate(25 102 122)" />
        <ellipse cx="111" cy="133" rx="8" ry="7" fill="#1C1C1C" transform="rotate(10 111 133)" />
        {/* Right arm white paw tip */}
        <ellipse cx="114" cy="138" rx="5" ry="4" fill="#F0F0F0" opacity="0.5" />

        {/* Legs/Feet */}
        <ellipse cx="53" cy="149" rx="14" ry="8" fill="#1C1C1C" />
        <ellipse cx="87" cy="149" rx="14" ry="8" fill="#1C1C1C" />
        {/* Foot white tips */}
        <ellipse cx="48" cy="152" rx="6" ry="3.5" fill="#F0F0F0" opacity="0.4" />
        <ellipse cx="92" cy="152" rx="6" ry="3.5" fill="#F0F0F0" opacity="0.4" />

        {/* Head */}
        <circle cx="70" cy="62" r="50" fill="url(#headGrad)" stroke="#D0D0D0" strokeWidth="1.5" filter="url(#softShadow)" />

        {/* Ears */}
        <circle cx="28" cy="22" r="20" fill="#1C1C1C" />
        <circle cx="112" cy="22" r="20" fill="#1C1C1C" />
        {/* Ear inner */}
        <circle cx="28" cy="22" r="12" fill="#2E2E2E" />
        <circle cx="112" cy="22" r="12" fill="#2E2E2E" />
        {/* Ear cute highlight */}
        <circle cx="23" cy="17" r="4" fill="#3D3D3D" opacity="0.6" />
        <circle cx="107" cy="17" r="4" fill="#3D3D3D" opacity="0.6" />

        {/* Eye patches — rounder, bigger */}
        <ellipse cx="50" cy="63" rx="21" ry="20" fill="#1C1C1C" />
        <ellipse cx="90" cy="63" rx="21" ry="20" fill="#1C1C1C" />

        {/* Eye whites — large anime style */}
        <ellipse cx="50" cy="60" rx="15" ry="16" fill="url(#eyeWhiteL)" />
        <ellipse cx="90" cy="60" rx="15" ry="16" fill="url(#eyeWhiteR)" />

        {/* Pupils & expressions */}
        {isThinking ? (
          <>
            {/* Swirly/confused eyes for thinking */}
            <ellipse cx="50" cy="61" rx="9" ry="9" fill="#1C1C1C" />
            <circle cx="53" cy="56" r="3.5" fill="white" />
            <circle cx="47" cy="65" r="2" fill="white" opacity="0.6" />
            <ellipse cx="90" cy="61" rx="9" ry="9" fill="#1C1C1C" />
            <circle cx="93" cy="56" r="3.5" fill="white" />
            <circle cx="87" cy="65" r="2" fill="white" opacity="0.6" />
            {/* Thinking squiggle brow */}
            <path d="M42 46 Q50 42 58 46" stroke="#1C1C1C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M82 46 Q90 42 98 46" stroke="#1C1C1C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </>
        ) : isExcited ? (
          <>
            {/* Happy arc eyes */}
            <path d="M38 60 Q50 70 62 60" stroke="#1C1C1C" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M78 60 Q90 70 102 60" stroke="#1C1C1C" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* Shine dots above arcs */}
            <circle cx="44" cy="53" r="2.5" fill="#1C1C1C" />
            <circle cx="96" cy="53" r="2.5" fill="#1C1C1C" />
          </>
        ) : (
          <>
            {/* Normal big cute pupils */}
            <ellipse cx="50" cy="62" rx="10" ry="11" fill="#1C1C1C" />
            <circle cx="54" cy="56" r="4" fill="white" />
            <circle cx="45" cy="67" r="2" fill="white" opacity="0.55" />
            <ellipse cx="90" cy="62" rx="10" ry="11" fill="#1C1C1C" />
            <circle cx="94" cy="56" r="4" fill="white" />
            <circle cx="85" cy="67" r="2" fill="white" opacity="0.55" />
          </>
        )}

        {/* Nose — cute small heart shape via two circles + triangle */}
        <circle cx="67" cy="79" r="3.5" fill="#1C1C1C" />
        <circle cx="73" cy="79" r="3.5" fill="#1C1C1C" />
        <polygon points="63.5,81 76.5,81 70,86" fill="#1C1C1C" />

        {/* Mouth */}
        {isExcited ? (
          <>
            <path d="M58 87 Q70 100 82 87" stroke="#1C1C1C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Tongue */}
            <ellipse cx="70" cy="96" rx="8" ry="6" fill="#F48FB1" />
            <line x1="70" y1="90" x2="70" y2="102" stroke="#E57399" strokeWidth="1.5" />
          </>
        ) : isThinking ? (
          <path d="M60 89 Q68 94 80 87" stroke="#1C1C1C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M59 88 Q70 99 81 88" stroke="#1C1C1C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        )}

        {/* Blush cheeks — bigger, softer */}
        <ellipse cx="26" cy="78" rx="11" ry="7" fill="#FFB3C1" opacity="0.6" />
        <ellipse cx="114" cy="78" rx="11" ry="7" fill="#FFB3C1" opacity="0.6" />

        {/* Celebrating sparkles */}
        {expression === 'celebrating' && (
          <>
            <text x="2" y="34" fontSize="16">✨</text>
            <text x="114" y="42" fontSize="13">⭐</text>
            <text x="5" y="78" fontSize="11">🌟</text>
            <text x="118" y="80" fontSize="10">💫</text>
          </>
        )}
        {expression === 'excited' && (
          <>
            <text x="2" y="40" fontSize="13">💛</text>
            <text x="118" y="46" fontSize="11">✨</text>
          </>
        )}
      </svg>
    </motion.div>
  );
};

export default Mascot;
