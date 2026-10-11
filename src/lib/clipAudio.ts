import { getLatestUrl } from './versionedUpload';
import { comboKeyForText } from './combos';

// Looks up recordings made in the recorder pages (storage paths
// "<folder>/<base64url(key)>--v<N>.a" — see versionedUpload.ts). Results are
// cached per key for the lifetime of the page.

type Folder = 'words' | 'letters' | 'intro' | 'combos';

export async function getClipUrl(folder: Folder, text: string): Promise<string | undefined> {
  if (!text) return undefined;
  return getLatestUrl(folder, text);
}

type AudioPicturePosition = 'start' | 'end';
export interface AudioPictureTarget {
  position: AudioPicturePosition;
  letter: string;
}

// audio_picture questions embed their target letter in question_text rather
// than a dedicated column — parse it so we can show a generic sentence +
// a letter-sound button instead of the literal letter in the question text.
export function parseAudioPictureTarget(questionText: string): AudioPictureTarget | null {
  const start = questionText.match(/با\s+(\S+)\s+شروع/);
  if (start) return { position: 'start', letter: start[1] };
  const endDare = questionText.match(/آخرش\s+(\S+)\s+داره/);
  if (endDare) return { position: 'end', letter: endDare[1] };
  const endKhatm = questionText.match(/به\s+(\S+)\s+ختم/);
  if (endKhatm) return { position: 'end', letter: endKhatm[1] };
  return null;
}

export const AUDIO_PICTURE_GENERIC_TEXT: Record<AudioPicturePosition, string> = {
  start: 'کدام یکی با این صدا شروع می‌شود.',
  end: 'آخر کدام یکی مثل این صداست',
};

// Spellings under which the same sound may have been recorded: editors type the
// tatweel and the vowel mark in either order ("بَـ" vs "بـَ"), or omit the tatweel.
function spellingVariants(text: string): string[] {
  const t = text.normalize('NFC').replace(/\u200c/g, '');
  const bare = t.replace(/\u0640/g, '');
  const marks = (bare.match(/[\u064B-\u0652]/g) ?? []).join('');
  const base = bare.replace(/[\u064B-\u0652]/g, '');
  const hadTatweel = t.includes('\u0640');
  return [...new Set([
    t,
    base + (hadTatweel ? '\u0640' : '') + marks, // tatweel before the vowel mark
    base + marks + (hadTatweel ? '\u0640' : ''), // vowel mark before the tatweel
    bare,
  ])];
}

// Recording of a letter+vowel combo or bare letter/word: /record-combos first, then
// the words and letters recorded in /word-audio-recorder (any spelling variant), or
// undefined if none yet.
export async function getComboClipUrl(text: string): Promise<string | undefined> {
  const key = comboKeyForText(text);
  if (key) {
    const u = await getLatestUrl('combos', key);
    if (u) return u;
  }
  const variants = spellingVariants(text);
  for (const folder of ['words', 'letters'] as const) {
    for (const v of variants) {
      if (!v) continue;
      const u = await getLatestUrl(folder, v);
      if (u) return u;
    }
  }
  return undefined;
}

const speakText = (text: string) => {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'fa-IR';
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
};

// Plays the sound for a question's hidden label: the combo/letter/word recording
// if one exists, else `fallbackUrl`, else browser TTS.
export async function playLabelSound(label: string, fallbackUrl?: string): Promise<void> {
  const url = (await getComboClipUrl(label)) ?? fallbackUrl;
  if (url) { new Audio(url).play().catch(() => {}); return; }
  speakText(label.normalize('NFC').replace(/[\u200c\u0640]/g, ''));
}
