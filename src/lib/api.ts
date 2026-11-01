import { getAdminKey, setAdminKey } from './adminKey';

// Same-origin by default (nginx proxies /api and /audio to the Go backend). Set VITE_API_URL
// to point a build elsewhere, e.g. when testing the GitHub Pages build against the new server.
export const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface Opts {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function request(path: string, { method = 'GET', body, headers = {} }: Opts): Promise<Response> {
  const h: Record<string, string> = { ...headers };
  let payload: BodyInit | undefined;
  if (body instanceof Blob) {
    payload = body;
  } else if (body !== undefined) {
    h['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${path}`, { method, headers: h, body: payload });
  if (res.ok) return res;
  let code = 'HTTP_ERROR';
  let message = `HTTP ${res.status}`;
  try {
    const j = await res.json();
    if (j?.error) { code = j.error.code ?? code; message = j.error.message ?? message; }
  } catch { /* non-JSON error body */ }
  throw new ApiError(res.status, code, message);
}

export async function apiJson<T>(path: string, opts: Opts = {}): Promise<T> {
  const res = await request(path, opts);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ---- user session: a short-lived token minted from the profile's id + password hash ----

export interface SessionUser { id: string; passwordHash?: string }
interface CachedSession { token: string; profileId: string }
const sessions = new Map<string, CachedSession>();

/** Token for this profile, or null when the account has no password / does not exist on the server. */
async function session(me: SessionUser, force = false): Promise<CachedSession | null> {
  if (!me.passwordHash) return null;
  const cached = sessions.get(me.id);
  if (cached && !force) return cached;
  const res = await apiJson<{ token: string; profile: { id: string } }>('/api/v1/auth/token', {
    method: 'POST',
    body: { profile_id: me.id, password_hash: me.passwordHash },
  });
  const s = { token: res.token, profileId: res.profile.id };
  sessions.set(me.id, s);
  return s;
}

export function rememberSession(localId: string, token: string, profileId: string) {
  sessions.set(localId, { token, profileId });
}

export function forgetSessions() { sessions.clear(); }

/** The server-side id of this account (differs from the local id for accounts imported from before). */
export async function serverProfileId(me: SessionUser): Promise<string | null> {
  return (await session(me))?.profileId ?? null;
}

export async function authedJson<T>(me: SessionUser, path: string, opts: Opts = {}): Promise<T> {
  let s = await session(me);
  if (!s) throw new ApiError(401, 'NO_PASSWORD', 'account has no password');
  try {
    return await apiJson<T>(path, { ...opts, headers: { ...opts.headers, Authorization: `Bearer ${s.token}` } });
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;
    s = await session(me, true); // token expired: mint a fresh one once
    return apiJson<T>(path, { ...opts, headers: { ...opts.headers, Authorization: `Bearer ${s!.token}` } });
  }
}

// ---- admin tools: shared admin key, asked once and remembered in this browser ----

export async function adminJson<T>(path: string, opts: Opts = {}): Promise<T> {
  let key = getAdminKey();
  if (!key) {
    key = window.prompt('کلید ادمین را وارد کنید') ?? '';
    if (!key) throw new ApiError(403, 'FORBIDDEN', 'admin key required');
    setAdminKey(key);
  }
  try {
    return await apiJson<T>(path, { ...opts, headers: { ...opts.headers, 'X-Admin-Key': key } });
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) setAdminKey(''); // wrong key: ask again next time
    throw e;
  }
}

/** Admin GET of a paged list; the total row count comes from the X-Total-Count header. */
export async function adminList<T>(path: string): Promise<{ rows: T[]; total: number }> {
  const key = getAdminKey() || window.prompt('کلید ادمین را وارد کنید') || '';
  if (!key) throw new ApiError(403, 'FORBIDDEN', 'admin key required');
  try {
    const res = await request(path, { headers: { 'X-Admin-Key': key } });
    setAdminKey(key);
    const rows = (await res.json()) as T[];
    return { rows, total: Number(res.headers.get('X-Total-Count') ?? rows.length) };
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) setAdminKey('');
    throw e;
  }
}
