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
      className={`clip-btn ${size === 'lg' ? 'text-3xl px-6 py-3' : 'text-xl px-4 py-2'}`}
    >
      {text}
    </button>
  );
};

export default ClipButton;
