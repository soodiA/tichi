import { db } from '../db/db';
import type { UserProfile, NodeProgress } from '../types';
import { hashWithSalt } from './password';
import { useStore } from '../store/useStore';
import { ApiError, apiJson, authedJson, rememberSession, serverProfileId } from './api';

interface ServerProfile {
  id: string;
  name: string;
  username: string;
  dob: string | null;
  avatar_url: string | null;
  joined_at: string;
  diamonds: number;
  streak_days: number;
  last_active_date: string | null;
  total_score: number;
}

interface ServerProgress {
  node_id: string;
  stars: number;
  completed: boolean;
  best_accuracy: number;
  attempts: number;
  last_played_at: string | null;
}

const toProfile = (r: ServerProfile, passwordHash?: string): UserProfile => ({
  id: r.id,
  name: r.name,
  username: r.username,
  birthDate: r.dob ?? undefined,
  avatarUrl: r.avatar_url ?? undefined,
  joinedAt: r.joined_at,
  diamonds: r.diamonds ?? 0,
  streakDays: r.streak_days ?? 0,
  lastActiveDate: r.last_active_date ?? undefined,
  totalScore: r.total_score ?? 0,
  passwordHash,
});

const toProgress = (userId: string, p: ServerProgress): NodeProgress => ({
  nodeId: p.node_id,
  userId,
  completed: p.completed,
  stars: p.stars ?? 0,
  accuracy: p.best_accuracy ?? 0,
  completedAt: p.last_played_at ?? undefined,
  attempts: p.attempts ?? 0,
});

/**
 * The server only moves game state forward (see updateMe), so a device that was offline for days gets the
 * current streak/diamonds/score back in the PATCH response instead of overwriting them. Take those values
 * into the local copy unless the user changed them while the request was in flight.
 */
async function adoptServerGameState(sent: UserProfile, server: ServerProfile): Promise<void> {
  const next = {
    diamonds: server.diamonds ?? 0,
    streakDays: server.streak_days ?? 0,
    lastActiveDate: server.last_active_date ?? undefined,
    totalScore: server.total_score ?? 0,
  };
  const same = (u: UserProfile) =>
    u.diamonds === next.diamonds && u.streakDays === next.streakDays && u.lastActiveDate === next.lastActiveDate && u.totalScore === next.totalScore;
  if (same(sent)) return;
  const stored = await db.profiles.get(sent.id);
  if (stored) await db.profiles.put({ ...stored, ...next });
  const cur = useStore.getState().currentUser;
  const untouched = cur && cur.id === sent.id && cur.diamonds === sent.diamonds && cur.streakDays === sent.streakDays &&
    cur.lastActiveDate === sent.lastActiveDate && cur.totalScore === sent.totalScore;
  if (untouched) useStore.getState().setCurrentUser({ ...cur, ...next });
}

/**
 * Push the local profile to the server. A profile the server has never seen (created offline, or
 * before the account existed there) is registered first; otherwise only the mutable fields are patched.
 */
export async function syncProfileToCloud(profile: UserProfile): Promise<void> {
  if (!profile.passwordHash) return; // accounts without a password cannot be authenticated
  const patch = {
    name: profile.name,
    avatar_url: profile.avatarUrl ?? null,
    diamonds: profile.diamonds,
    streak_days: profile.streakDays,
    last_active_date: profile.lastActiveDate ?? null,
    total_score: profile.totalScore,
  };
  try {
    const server = await authedJson<ServerProfile>(profile, '/api/v1/me', { method: 'PATCH', body: patch });
    await adoptServerGameState(profile, server);
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 404) throw e;
    try {
      const res = await apiJson<{ token: string; profile: ServerProfile }>('/api/v1/auth/register', {
        method: 'POST',
        body: {
          id: profile.id,
          name: profile.name,
          username: profile.username,
          dob: profile.birthDate ?? null,
          avatar_url: profile.avatarUrl ?? null,
          joined_at: profile.joinedAt,
          password_hash: profile.passwordHash,
        },
      });
      rememberSession(profile.id, res.token, res.profile.id);
      await authedJson(profile, '/api/v1/me', { method: 'PATCH', body: patch });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Username already belongs to another account: we cannot take it over from the client.
        console.error('[sync] syncProfileToCloud: username already claimed by another account', err);
        return;
      }
      throw err;
    }
  }
}

export async function syncProgressToCloud(progress: NodeProgress): Promise<void> {
  const me = useStore.getState().currentUser;
  if (!me?.passwordHash) return;
  await authedJson(me, '/api/v1/me/progress', {
    method: 'PUT',
    body: {
      node_id: progress.nodeId,
      stars: progress.stars,
      completed: progress.completed,
      best_accuracy: progress.accuracy,
      attempts: progress.attempts,
      last_played_at: progress.completedAt ?? null,
    },
  });
}

export async function recordQuestionResult(questionType: number, correct: boolean): Promise<void> {
  const me = useStore.getState().currentUser;
  if (!me?.passwordHash) return;
  await authedJson(me, '/api/v1/me/question-stats', {
    method: 'POST',
    body: { question_type: questionType, correct },
  });
}

/** Does this username exist? Used by sign-up for the uniqueness check. Null on not-found. */
export async function findProfileByUsername(username: string): Promise<{ id: string; hasPassword: boolean } | null> {
  try {
    const r = await apiJson<{ id: string; has_password: boolean }>(
      `/api/v1/auth/lookup?username=${encodeURIComponent(username.trim().toLowerCase())}`);
    return { id: r.id, hasPassword: r.has_password };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/**
 * Search public profiles by username substring for the Friends "find by username" feature.
 * Only public-safe columns come back (no password data).
 */
export async function searchProfilesByUsername(query: string, allowEmpty = false): Promise<Array<{
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  diamonds: number;
}>> {
  const q = query.trim().toLowerCase();
  if (!q && !allowEmpty) return [];
  try {
    return await apiJson(`/api/v1/profiles?q=${encodeURIComponent(q)}`);
  } catch (e) {
    console.error('[sync] searchProfilesByUsername failed', e);
    return [];
  }
}

/**
 * Login: the server only ever sees the salted hash. The client asks for the (public) salt,
 * recomputes the hash and the server compares it, returning profile + progress on a match.
 */
export type LoginResult =
  | { status: 'ok'; profile: UserProfile }
  | { status: 'notfound' | 'wrong' | 'limited' | 'error' };

export async function loginWithPassword(username: string, password: string): Promise<LoginResult> {
  const uname = username.trim().toLowerCase();
  try {
    let salt: string;
    try {
      salt = (await apiJson<{ salt: string }>(`/api/v1/auth/salt?username=${encodeURIComponent(uname)}`)).salt;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return { status: 'notfound' };
      throw e;
    }
    const stored = await hashWithSalt(password, salt);
    let res: { token: string; profile: ServerProfile; progress: ServerProgress[] };
    try {
      res = await apiJson('/api/v1/auth/login', { method: 'POST', body: { username: uname, password_hash: stored } });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return { status: 'wrong' };
      if (e instanceof ApiError && e.status === 429) return { status: 'limited' };
      throw e;
    }
    const profile = toProfile(res.profile, stored);
    rememberSession(profile.id, res.token, profile.id);
    await db.profiles.put(profile);
    for (const p of res.progress ?? []) await db.progress.put(toProgress(profile.id, p));
    return { status: 'ok', profile };
  } catch (e) {
    console.error('[sync] loginWithPassword failed', e);
    return { status: 'error' };
  }
}

export interface PublicProfile {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  diamonds: number;
  streak_days?: number | null;
  total_score?: number | null;
}

/** Public profile cards (friends list) including streak + score. */
export async function getPublicProfiles(ids: string[]): Promise<PublicProfile[]> {
  if (ids.length === 0) return [];
  try {
    return await apiJson<PublicProfile[]>(`/api/v1/profiles?ids=${ids.map(encodeURIComponent).join(',')}`);
  } catch (e) {
    console.error('[sync] getPublicProfiles failed', e);
    return [];
  }
}

export async function addFriendSecure(me: UserProfile, friendId: string): Promise<boolean> {
  if (!me.passwordHash) return false;
  try {
    await authedJson(me, '/api/v1/me/friends', { method: 'POST', body: { friend_id: friendId } });
    return true;
  } catch (e) {
    console.error('[sync] addFriendSecure failed', e);
    return false;
  }
}

/** Friend ids of this account, or null when the server is unreachable / auth failed. */
export async function getMyFriendIds(me: UserProfile): Promise<string[] | null> {
  if (!me.passwordHash) return null;
  try {
    return (await authedJson<{ ids: string[] }>(me, '/api/v1/me/friends')).ids;
  } catch (e) {
    console.error('[sync] getMyFriendIds failed', e);
    return null;
  }
}

/** Ids my friends are friends with (the client filters out me and my existing friends). */
export async function getFriendsOfFriends(me: UserProfile): Promise<string[]> {
  if (!me.passwordHash) return [];
  try {
    return (await authedJson<{ ids: string[] }>(me, '/api/v1/me/friends-of-friends')).ids;
  } catch (e) {
    console.error('[sync] getFriendsOfFriends failed', e);
    return [];
  }
}

export { serverProfileId };
