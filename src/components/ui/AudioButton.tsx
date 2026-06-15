import React from 'react';

interface AudioButtonProps {
  audioUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const iconSizeMap = {
  sm: 16,
  md: 22,
  lg: 30,
};

const AudioButton: React.FC<AudioButtonProps> = ({ audioUrl, size = 'md' }) => {
  const handleClick = () => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {/* silent fail */});
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`audio-btn ${sizeMap[size]}`}
      aria-label="پخش صدا"
    >
      <svg
        width={iconSizeMap[size]}
        height={iconSizeMap[size]}
        viewBox="0 0 24 24"
        fill="white"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M3 9v6h4l5 5V4L7 9H3z" />
        <path
          d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
          opacity="0.7"
        />
        <path
          d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
          opacity="0.5"
        />
      </svg>
    </button>
  );
};

export default AudioButton;
