import { supabase } from './supabase';

// The anon key can INSERT new objects into the `audio` bucket but cannot
// UPDATE (upsert) or DELETE existing ones (Storage RLS only grants insert) —
// confirmed by Soodeh hitting "new row violates row-level security policy"
// when re-recording something that already had a clip. Rather than needing
// her to change bucket policies in the Supabase dashboard, every recording
// is uploaded under a new versioned filename ("<key>--v<N>.a", N = 1, 2, 3...)
// instead of overwriting the old one; old clips are just left behind
// (harmless — a few KB each) and the highest N wins when reading back.
//
// The anon key also has NO SELECT policy on storage.objects, so Storage's
// `.list()` always returns [] — we can't enumerate files. Versions are therefore
// contiguous counters that we discover by probing the (public) object URLs.
// The filename extension is always ".a"; the real type is carried by the
// Content-Type stored with the object.

// Supabase Storage rejects object keys containing "%" (so percent-encoding
// non-ASCII text like Persian words fails with "Invalid key"). Base64url-encode
// the UTF-8 bytes instead — it only produces [A-Za-z0-9_-], which Storage accepts.
function encodeKey(key: string): string {
  const bytes = new TextEncoder().encode(key);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}


export function versionedPath(folder: string, key: string, n: number): string {
  return `${folder}/${encodeKey(key)}--v${n}.a`;
}

function publicUrl(path: string): string {
  return supabase.storage.from('audio').getPublicUrl(path).data.publicUrl;
}

async function exists(path: string): Promise<boolean> {
  try {
    // Cache-buster so a CDN-cached 404 from before the upload can't hide a new clip.
    const res = await fetch(`${publicUrl(path)}?cb=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

// Highest existing version number for a key (0 if none): exponential probe,
// then bisect. Versions are contiguous, so this is O(log N) requests.
async function latestVersion(folder: string, key: string): Promise<number> {
  if (!(await exists(versionedPath(folder, key, 1)))) return 0;
  let lo = 1;
  let hi = 2;
  while (await exists(versionedPath(folder, key, hi))) { lo = hi; hi *= 2; }
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (await exists(versionedPath(folder, key, mid))) lo = mid; else hi = mid;
  }
  return lo;
}

const urlCache = new Map<string, string | undefined>();

export async function getLatestUrl(folder: string, key: string): Promise<string | undefined> {
  const ck = `${folder}:${key}`;
  if (urlCache.has(ck) && urlCache.get(ck)) return urlCache.get(ck);
  const n = await latestVersion(folder, key);
  const url = n ? publicUrl(versionedPath(folder, key, n)) : undefined;
  if (url) urlCache.set(ck, url);
  return url;
}

// Looks up many keys with limited concurrency; returns key -> url for those that exist.
export async function getLatestUrls(folder: string, keys: string[], concurrency = 8): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  let next = 0;
  const worker = async () => {
    while (next < keys.length) {
      const k = keys[next++];
      const u = await getLatestUrl(folder, k);
      if (u) out.set(k, u);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, keys.length) }, worker));
  return out;
}

export async function uploadVersioned(
  folder: string,
  key: string,
  blob: Blob
): Promise<{ url?: string; error?: string }> {
  let n = (await latestVersion(folder, key)) + 1;
  for (let attempt = 0; attempt < 5; attempt++, n++) {
    const path = versionedPath(folder, key, n);
    const { error } = await supabase.storage.from('audio').upload(path, blob, {
      contentType: blob.type || 'audio/webm',
    });
    if (!error) {
      const url = publicUrl(path);
      urlCache.set(`${folder}:${key}`, url);
      return { url };
    }
    // Someone else (or a stale probe) already holds this version — try the next.
    if (!/exist|duplicate/i.test(error.message)) return { error: error.message };
  }
  return { error: 'could not allocate a version' };
}
