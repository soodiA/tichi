import React from 'react';

interface DiamondDisplayProps {
  count: number;
}

const DiamondDisplay: React.FC<DiamondDisplayProps> = ({ count }) => {
  return (
    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-sm">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="#3B82F6"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M6 2L2 8l10 14L22 8l-4-6H6z" />
        <path d="M2 8h20M6 2l6 6 6-6M12 2v6" stroke="#2563EB" strokeWidth="0.5" fill="none" />
      </svg>
      <span>{count.toLocaleString('fa-IR')}</span>
    </span>
  );
};

export default DiamondDisplay;
