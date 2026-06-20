import React from 'react';
import { motion } from 'framer-motion';

interface UnitDividerProps {
  letter: string;
  color: string;
  unitNumber: number;
  subtitle?: string;
  onPlayIntro?: () => void;
}

const UnitDivider: React.FC<UnitDividerProps> = ({ letter, color, unitNumber, subtitle = 'یاد بگیریم', onPlayIntro }) => {
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
        <span className="text-white text-base font-bold mt-0.5">
          {subtitle}
        </span>
      </div>

      {/* Letter box — tappable to play intro */}
      <button
        onClick={onPlayIntro}
        disabled={!onPlayIntro}
        className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-white bg-opacity-20 shadow-inner active:scale-90 transition-transform disabled:cursor-default"
      >
        <span
          className="text-white font-extrabold"
          style={{ fontSize: '2.5rem', lineHeight: 1 }}
        >
          {letter}
        </span>
        {onPlayIntro && (
          <span className="absolute -bottom-1 -left-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 1.5L8 5L2 8.5V1.5Z" fill={color} />
            </svg>
          </span>
        )}
      </button>
    </motion.div>
  );
};

export default UnitDivider;
