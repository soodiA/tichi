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
  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Notebook body */}
    <rect x="7" y="5" width="28" height="33" rx="4" fill="white" opacity="0.95" />
    {/* Spine */}
    <rect x="7" y="5" width="6" height="33" rx="3" fill={color} opacity="0.7" />
    {/* Lines */}
    <rect x="17" y="13" width="14" height="2" rx="1" fill={color} opacity="0.4" />
    <rect x="17" y="19" width="14" height="2" rx="1" fill={color} opacity="0.4" />
    <rect x="17" y="25" width="10" height="2" rx="1" fill={color} opacity="0.4" />
    {/* Ring bindings */}
    <circle cx="10" cy="14" r="2" fill="white" stroke={color} strokeWidth="1.5" opacity="0.9" />
    <circle cx="10" cy="21" r="2" fill="white" stroke={color} strokeWidth="1.5" opacity="0.9" />
    <circle cx="10" cy="28" r="2" fill="white" stroke={color} strokeWidth="1.5" opacity="0.9" />
  </svg>
);

const UnitDivider: React.FC<UnitDividerProps> = ({ color, unitNumber, subtitle = 'یاد بگیریم', onPlayIntro }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full rounded-3xl p-5 flex items-center justify-between shadow-lg"
      style={{ backgroundColor: color }}
    >
      <div className="flex flex-col">
        <span className="text-white text-xs font-semibold opacity-80">
          بخش {unitNumber.toLocaleString('fa-IR')}
        </span>
        <span className="text-white text-lg font-extrabold mt-0.5 tracking-wide">
          {subtitle}
        </span>
      </div>

      {/* Notebook button — tappable to play intro */}
      <button
        onClick={onPlayIntro}
        disabled={!onPlayIntro}
        className="relative flex items-center justify-center w-16 h-16 rounded-2xl shadow-inner active:scale-90 transition-transform disabled:cursor-default"
        style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
      >
        <BookIcon color={color} />

        {/* Play badge */}
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
    </motion.div>
  );
};

export default UnitDivider;
