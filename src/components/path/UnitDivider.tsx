import React from 'react';
import { motion } from 'framer-motion';

interface UnitDividerProps {
  letter: string;
  color: string;
  unitNumber: number;
}

const UnitDivider: React.FC<UnitDividerProps> = ({ letter, color, unitNumber }) => {
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
          یاد بگیریم
        </span>
      </div>
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white bg-opacity-20 shadow-inner">
        <span
          className="text-white font-extrabold"
          style={{ fontSize: '2.5rem', lineHeight: 1 }}
        >
          {letter}
        </span>
      </div>
    </motion.div>
  );
};

export default UnitDivider;
