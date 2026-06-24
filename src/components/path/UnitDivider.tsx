import React from 'react';
import { motion } from 'framer-motion';

interface UnitDividerProps {
  letter: string;
  color: string;
  unitNumber: number;
  subtitle?: string;
  onPlayIntro?: () => void;
}

const BookIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="36" height="36" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="5" width="28" height="33" rx="4" fill="white" opacity="0.95" />
    <rect x="7" y="5" width="6" height="33" rx="3" fill={color} opacity="0.7" />
    <rect x="17" y="13" width="14" height="2" rx="1" fill={color} opacity="0.4" />
    <rect x="17" y="19" width="14" height="2" rx="1" fill={color} opacity="0.4" />
    <rect x="17" y="25" width="10" height="2" rx="1" fill={color} opacity="0.4" />
    <circle cx="10" cy="14" r="2" fill="white" stroke={color} strokeWidth="1.5" opacity="0.9" />
    <circle cx="10" cy="21" r="2" fill="white" stroke={color} strokeWidth="1.5" opacity="0.9" />
    <circle cx="10" cy="28" r="2" fill="white" stroke={color} strokeWidth="1.5" opacity="0.9" />
  </svg>
);

const UnitDivider: React.FC<UnitDividerProps> = ({ letter, color, unitNumber, subtitle, onPlayIntro }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full rounded-3xl shadow-lg overflow-hidden"
      style={{ backgroundColor: color }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        {/* Left: section label + subtitle */}
        <div className="flex flex-col">
          <span className="text-white text-xs font-semibold opacity-75">
            بخش {unitNumber.toLocaleString('fa-IR')}
          </span>
          <span className="text-white text-sm font-bold mt-0.5 opacity-90">
            {subtitle || 'یاد بگیریم'}
          </span>
        </div>

        {/* Center: big letter */}
        <div className="flex-1 flex justify-center items-center">
          <span
            className="font-black leading-none select-none"
            style={{
              fontSize: '4.5rem',
              color: 'rgba(255,255,255,0.92)',
              textShadow: '0 2px 10px rgba(0,0,0,0.18)',
              fontFamily: 'Vazirmatn, serif',
              letterSpacing: '0.05em',
            }}
          >
            {letter}
          </span>
        </div>

        {/* Right: intro button */}
        <button
          onClick={onPlayIntro}
          disabled={!onPlayIntro}
          aria-label="آموزش حرف"
          className="relative flex items-center justify-center w-14 h-14 rounded-2xl active:scale-90 transition-transform disabled:opacity-40 disabled:cursor-default"
          style={{ backgroundColor: 'rgba(255,255,255,0.20)' }}
        >
          <BookIcon color={color} />

          {onPlayIntro && (
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
              style={{ backgroundColor: color }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2.5 1.5L8.5 5L2.5 8.5V1.5Z" fill="white" />
              </svg>
            </motion.span>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default UnitDivider;
