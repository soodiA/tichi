import React, { useEffect, useState } from 'react';
import { getClipUrl } from '../../lib/clipAudio';

interface Props {
  folder: 'words' | 'letters';
  text: string;
  size?: 'md' | 'lg';
}

const speak = (text: string) => {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'fa-IR';
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
};

// A tappable caption (letter or word) that plays its recorded clip if one
// exists (see /word-audio-recorder), falling back to browser TTS otherwise.
const ClipButton: React.FC<Props> = ({ folder, text, size = 'lg' }) => {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getClipUrl(folder, text).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [folder, text]);

  const handleClick = () => {
    if (url) new Audio(url).play().catch(() => {});
    else speak(text);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 rounded-2xl bg-violet-100 text-violet-700 font-extrabold
        active:scale-95 transition-transform ${size === 'lg' ? 'text-3xl px-6 py-3' : 'text-xl px-4 py-2'}`}
    >
      <svg width={size === 'lg' ? 22 : 18} height={size === 'lg' ? 22 : 18} viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
      </svg>
      {text}
    </button>
  );
};

export default ClipButton;
