import { supabase } from './supabase';

// The anon key can INSERT new objects into the `audio` bucket but cannot
// UPDATE (upsert) or DELETE existing ones (Storage RLS only grants insert) —
// confirmed by Soodeh hitting "new row violates row-level security policy"
// when re-recording something that already had a clip. Rather than needing
// her to change bucket policies in the Supabase dashboard, every recording
// is uploaded under a new versioned filename ("<key>--<timestamp>.<ext>")
// instead of overwriting the old one; old clips are just left behind
// (harmless — a few KB each) and the newest one wins when reading back.

export function versionedPath(folder: string, key: string, ext: string): string {
  return `${folder}/${encodeURIComponent(key)}--${Date.now()}.${ext}`;
}

export async function uploadVersioned(
  folder: string,
  key: string,
  blob: Blob
): Promise<{ url?: string; error?: string }> {
  const ext = blob.type.includes('webm') ? 'webm' : 'ogg';
  const path = versionedPath(folder, key, ext);
  const { error } = await supabase.storage.from('audio').upload(path, blob);
  if (error) return { error: error.message };
  const { data } = supabase.storage.from('audio').getPublicUrl(path);
  return { url: data.publicUrl };
}

// Groups a Storage `.list()` result by original key, keeping only the
// newest ("--<timestamp>") version of each.
export function latestByKey(files: { name: string }[], getPublicUrl: (path: string) => string, folder: string) {
  const latest = new Map<string, { name: string; ts: number; url: string }>();
  for (const f of files) {
    const m = f.name.match(/^(.*)--(\d+)\.[a-z0-9]+$/);
    const key = m ? decodeURIComponent(m[1]) : decodeURIComponent(f.name.replace(/\.[a-z0-9]+$/, ''));
    const ts = m ? parseInt(m[2], 10) : 0;
    const existing = latest.get(key);
    if (!existing || ts > existing.ts) {
      latest.set(key, { name: f.name, ts, url: getPublicUrl(`${folder}/${f.name}`) });
    }
  }
  return latest;
}
