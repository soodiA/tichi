import React from 'react';

interface PageBgProps {
  variant?: 'blue' | 'peach' | 'green' | 'purple';
}

const VARIANTS = {
  blue:   { top: '#C8E3FF', mid: '#E8F4FF', bot: '#F0F8FF' },
  peach:  { top: '#FFD9B0', mid: '#FFF0E0', bot: '#FFF8F0' },
  green:  { top: '#B8EDD4', mid: '#E0F7EC', bot: '#F0FDF6' },
  purple: { top: '#D4C0FF', mid: '#EDE8FF', bot: '#F5F0FF' },
};

const PageBg: React.FC<PageBgProps> = ({ variant = 'peach' }) => {
  const c = VARIANTS[variant];
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`pgGrad-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.top} />
          <stop offset="40%" stopColor={c.mid} />
          <stop offset="100%" stopColor={c.bot} />
        </linearGradient>
      </defs>
      <rect width="390" height="844" fill={`url(#pgGrad-${variant})`} />

      {/* Soft cloud blobs top */}
      <ellipse cx="70" cy="60" rx="80" ry="45" fill="white" opacity="0.45" />
      <ellipse cx="320" cy="40" rx="90" ry="50" fill="white" opacity="0.35" />
      <ellipse cx="195" cy="100" rx="70" ry="38" fill="white" opacity="0.28" />

      {/* Decorative circles */}
      <circle cx="360" cy="200" r="55" fill="white" opacity="0.18" />
      <circle cx="20"  cy="350" r="40" fill="white" opacity="0.15" />
      <circle cx="380" cy="560" r="60" fill="white" opacity="0.12" />
      <circle cx="10"  cy="650" r="45" fill="white" opacity="0.14" />
    </svg>
  );
};

export default PageBg;
