import React from 'react';
import { motion } from 'framer-motion';
import type { Node } from '../../types';

interface PathNodeProps {
  node: Node;
  isUnlocked: boolean;
  isCurrent: boolean;
  isCompleted: boolean;
  unitColor: string;
  onClick: () => void;
}

const PathNode: React.FC<PathNodeProps> = ({
  node,
  isUnlocked,
  isCurrent,
  isCompleted,
  unitColor,
  onClick,
}) => {
  const isLocked = !isUnlocked && !isCompleted;

  if (isLocked) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div
          className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center shadow-md cursor-not-allowed"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#9CA3AF">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    if (node.type === 'chest') {
      return (
        <div className="flex flex-col items-center gap-1">
          <motion.div
            whileTap={{ scale: 0.92 }}
            onClick={onClick}
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
            style={{ backgroundColor: unitColor }}
          >
            <span className="text-4xl">🎁</span>
          </motion.div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-1">
        <motion.div
          whileTap={{ scale: 0.92 }}
          onClick={onClick}
          className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
          style={{ backgroundColor: unitColor }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </motion.div>
      </div>
    );
  }

  // Unlocked or current
  const bounceAnimation = isCurrent
    ? { y: [0, -6, 0] }
    : {};
  const bounceTransition = isCurrent
    ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const }
    : {};

  const icon =
    node.type === 'chest' ? (
      <span className="text-4xl">🎁</span>
    ) : (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
        <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
      </svg>
    );

  return (
    <div className="flex flex-col items-center gap-2">
      {isCurrent && (
        <div
          className="text-white text-xs font-bold px-3 py-1 rounded-full shadow"
          style={{ backgroundColor: unitColor }}
        >
          شروع
        </div>
      )}
      <motion.div
        animate={bounceAnimation}
        transition={bounceTransition}
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl cursor-pointer"
        style={{ backgroundColor: unitColor }}
      >
        {icon}
      </motion.div>
    </div>
  );
};

export default PathNode;
