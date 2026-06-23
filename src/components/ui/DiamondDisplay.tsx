import React from 'react';

interface DiamondDisplayProps {
  count: number;
}

const DiamondDisplay: React.FC<DiamondDisplayProps> = ({ count }) => {
  return (
    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 font-bold px-3 py-1 rounded-full text-sm">
      🪙
      <span>{count.toLocaleString('fa-IR')}</span>
    </span>
  );
};

export default DiamondDisplay;
