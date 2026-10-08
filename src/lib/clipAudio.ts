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

// Recording of a letter+vowel combo (see /record-combos), or undefined if none yet.
export async function getComboClipUrl(text: string): Promise<string | undefined> {
  const key = comboKeyForText(text);
  return key ? getLatestUrl('combos', key) : undefined;
}
