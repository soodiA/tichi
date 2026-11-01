import { adminJson, apiJson, API_BASE } from './api';

// Every recording is uploaded under a new versioned filename ("<key>--v<N>.a", N = 1, 2, 3...)
// instead of overwriting the old one; the highest N wins when reading back. The server
// allocates N atomically (so two recorders can never collide) and lists versions itself, so
// the browser no longer has to probe URLs. Old clips are kept (a few KB each).
// The real file type is carried by the Content-Type stored with the object.

const urlCache = new Map<string, string | undefined>();

const absolute = (u: string) => (u.startsWith('http') ? u : `${API_BASE}${u}`);

export async function getLatestUrl(folder: string, key: string): Promise<string | undefined> {
  const ck = `${folder}:${key}`;
  if (urlCache.get(ck)) return urlCache.get(ck);
  const map = await getLatestUrls(folder, [key]);
  return map.get(key);
}

// Looks up many keys in one request; returns key -> url for those that exist.
export async function getLatestUrls(folder: string, keys: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const CHUNK = 500;
  for (let i = 0; i < keys.length; i += CHUNK) {
    const part = keys.slice(i, i + CHUNK);
    const res = await apiJson<Record<string, string>>('/api/v1/audio/latest', {
      method: 'POST',
      body: { folder, keys: part },
    });
    for (const [k, u] of Object.entries(res)) {
      out.set(k, absolute(u));
      urlCache.set(`${folder}:${k}`, absolute(u));
    }
  }
  return out;
}

export async function uploadVersioned(
  folder: string,
  key: string,
  blob: Blob
): Promise<{ url?: string; error?: string }> {
  try {
    const q = new URLSearchParams({ folder, key });
    const res = await adminJson<{ url: string }>(`/api/v1/admin/audio?${q}`, {
      method: 'POST',
      body: blob,
      headers: { 'Content-Type': blob.type || 'audio/webm' },
    });
    const url = absolute(res.url);
    urlCache.set(`${folder}:${key}`, url);
    return { url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
