import { supabase } from './supabase';
import { extFromMime } from './recordingFormat';

// The anon key can INSERT new objects into the `audio` bucket but cannot
// UPDATE (upsert) or DELETE existing ones (Storage RLS only grants insert) —
// confirmed by Soodeh hitting "new row violates row-level security policy"
// when re-recording something that already had a clip. Rather than needing
// her to change bucket policies in the Supabase dashboard, every recording
// is uploaded under a new versioned filename ("<key>--<timestamp>.<ext>")
// instead of overwriting the old one; old clips are just left behind
// (harmless — a few KB each) and the newest one wins when reading back.

// Supabase Storage rejects object keys containing "%" (so percent-encoding
// non-ASCII text like Persian words fails with "Invalid key"). Base64url-encode
// the UTF-8 bytes instead — it only produces [A-Za-z0-9_-], which Storage accepts.
function encodeKey(key: string): string {
  const bytes = new TextEncoder().encode(key);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeKey(encoded: string): string {
  let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function versionedPath(folder: string, key: string, ext: string): string {
  return `${folder}/${encodeKey(key)}--${Date.now()}.${ext}`;
}

export async function uploadVersioned(
  folder: string,
  key: string,
  blob: Blob
): Promise<{ url?: string; error?: string }> {
  const ext = extFromMime(blob.type);
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
    const key = m ? decodeKey(m[1]) : decodeKey(f.name.replace(/\.[a-z0-9]+$/, ''));
    const ts = m ? parseInt(m[2], 10) : 0;
    const existing = latest.get(key);
    if (!existing || ts > existing.ts) {
      latest.set(key, { name: f.name, ts, url: getPublicUrl(`${folder}/${f.name}`) });
    }
  }
  return latest;
}
