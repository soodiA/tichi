import { supabase } from './supabase';
import { latestByKey } from './versionedUpload';

// Looks up recordings made in /word-audio-recorder (storage paths
// "words/<base64url(word)>--<ts>.<ext>" and "letters/<base64url(letter)>--<ts>.<ext>").
// Results are cached per folder for the lifetime of the page.

type Folder = 'words' | 'letters' | 'intro';

const folderCache: Partial<Record<Folder, Record<string, string>>> = {};
const folderPromise: Partial<Record<Folder, Promise<Record<string, string>>>> = {};

async function loadFolder(folder: Folder): Promise<Record<string, string>> {
  if (folderCache[folder]) return folderCache[folder]!;
  if (!folderPromise[folder]) {
    folderPromise[folder] = (async () => {
      const { data } = await supabase.storage.from('audio').list(folder);
      const getPublicUrl = (path: string) => supabase.storage.from('audio').getPublicUrl(path).data.publicUrl;
      const latest = latestByKey(data ?? [], getPublicUrl, folder);
      const map: Record<string, string> = {};
      latest.forEach((v, key) => { map[key] = v.url; });
      folderCache[folder] = map;
      return map;
    })();
  }
  return folderPromise[folder]!;
}

export async function getClipUrl(folder: Folder, text: string): Promise<string | undefined> {
  if (!text) return undefined;
  const map = await loadFolder(folder);
  return map[text];
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
