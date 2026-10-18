import { supabase } from './supabase';
import { db } from '../db/db';
import type { UserProfile, NodeProgress } from '../types';
import { hashWithSalt } from './password';
import { useStore } from '../store/useStore';

// Concurrent callers (e.g. React 18 StrictMode double-invoking the mount
// effect, or two sync* calls firing back-to-back before the first resolves)
// must not race independent `getSession()` checks: both see no session yet
// and each calls `signInAnonymously()`, minting two different auth.uid()s
// for the same browser/device. The second write wins in localStorage, so
// data already upserted under the first uid is orphaned — this is the
// actual "new identity every refresh" bug, fully reproducible in dev where
// StrictMode always double-fires the effect. Memoizing the in-flight
// promise makes every caller await the *same* check-then-signIn instead of
// each starting their own.
let anonSessionPromise: Promise<void> | null = null;

export async function ensureAnonSession(): Promise<void> {
  if (!anonSessionPromise) {
    anonSessionPromise = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }
    })().finally(() => {
      anonSessionPromise = null;
    });
  }
  return anonSessionPromise;
}

/** True when the RPC ran and authenticated the account; false/'missing' lets callers fall back. */
async function rpcAuthed(fn: string, args: Record<string, unknown>): Promise<boolean> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (error.code !== 'PGRST202') console.error(`[sync] ${fn} failed`, error);
    return false;
  }
  return data === true;
}

export async function syncProfileToCloud(profile: UserProfile): Promise<void> {
  await ensureAnonSession();
  // Preferred path (SECURITY-SQL.md phase 3): authenticated by the account's own password
  // hash, so it works on any browser/device — not only the one that created the row.
  if (profile.passwordHash) {
    const ok = await rpcAuthed('update_my_profile', {
      p_me: profile.id,
      p_hash: profile.passwordHash,
      p_patch: {
        name: profile.name,
        avatar_url: profile.avatarUrl ?? null,
        diamonds: profile.diamonds,
        streak_days: profile.streakDays,
        last_active_date: profile.lastActiveDate ?? null,
        total_score: profile.totalScore,
      },
    });
    if (ok) return;
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user) {
    console.error('[sync] syncProfileToCloud: no auth user', userError);
    return;
  }

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    local_id: profile.id,
    name: profile.name,
    username: profile.username,
    dob: profile.birthDate ?? null,
    avatar_url: profile.avatarUrl ?? null,
    diamonds: profile.diamonds,
    streak_days: profile.streakDays,
    last_active_date: profile.lastActiveDate,
    total_score: profile.totalScore,
    joined_at: profile.joinedAt,
    password_hash: profile.passwordHash ?? undefined,
    // `id` is the PK and the column the `profiles` RLS policies key off of
    // (`USING (auth.uid() = id)`). With `persistSession: true` (see
    // src/lib/supabase.ts) a given browser/device keeps the same
    // `auth.uid()` across reloads, so `id` reliably matches the existing
    // row for that device and this upsert hits the UPDATE path RLS allows.
    //
    // The previous `onConflict: 'username'` change "fixed" a 23505 by
    // matching on username instead, but that path updates a row identified
    // by a column RLS does NOT check ownership against, so Postgres/RLS
    // rejects it with 42501 (403) whenever the existing row's `id` isn't
    // the caller's current uid. Reverting to `id` — plus fixing session
    // persistence so the uid doesn't churn — removes the mismatch instead
    // of fighting RLS with a different conflict target.
  }, { onConflict: 'id' });
  if (error) {
    if (error.code === '23505') {
      // Genuine cross-device/reinstall collision: this username is already
      // owned by a different auth.uid() than the current browser has. We
      // cannot silently reassign ownership from the client (that would be
      // a takeover), so log and skip rather than crash the sync loop.
      console.error(
        '[sync] syncProfileToCloud: username already claimed by another device/session',
        error
      );
    } else {
      console.error('[sync] syncProfileToCloud upsert failed', error);
    }
  }
}

export async function syncProgressToCloud(progress: NodeProgress): Promise<void> {
  await ensureAnonSession();
  const hash = useStore.getState().currentUser?.passwordHash;
  if (hash) {
    const ok = await rpcAuthed('save_my_progress', {
      p_me: progress.userId,
      p_hash: hash,
      p_row: {
        node_id: progress.nodeId,
        stars: progress.stars,
        completed: progress.completed,
        best_accuracy: progress.accuracy,
        attempts: progress.attempts,
        last_played_at: progress.completedAt ?? null,
      },
    });
    if (ok) return;
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user) {
    console.error('[sync] syncProgressToCloud: no auth user', userError);
    return;
  }

  const { error } = await supabase.from('node_progress').upsert({
    user_id: user.id,
    node_id: progress.nodeId,
    stars: progress.stars,
    completed: progress.completed,
    best_accuracy: progress.accuracy,
    attempts: progress.attempts,
    last_played_at: progress.completedAt ?? null,
  }, { onConflict: 'user_id,node_id' });
  if (error) console.error('[sync] syncProgressToCloud upsert failed', error);
}

export async function recordQuestionResult(
  questionType: number,
  correct: boolean
): Promise<void> {
  await ensureAnonSession();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc('upsert_question_stat', {
    p_user_id: user.id,
    p_question_type: questionType,
    p_correct: correct,
  });
}

/**
 * Look up a cloud profile row by username (for the login flow). Returns
 * null if not found or if offline/unreachable. Does NOT require an auth
 * session — `profiles` select-by-username must be readable pre-auth for
 * login to work (same as the uniqueness check in Onboarding).
 */
export async function findProfileByUsername(username: string): Promise<{
  id: string;
  passwordHash: string | null;
} | null> {
  // Normalize to lowercase on the client too (usernames are now stored
  // lowercase, and the RPC itself also lower()s both sides — see the SQL
  // migration notes — so this is defense in depth, not the only guard).
  const { data, error } = await supabase
    .rpc('get_login_profile', { p_username: username.trim().toLowerCase() })
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { id: string; password_hash: string | null };
  return { id: row.id, passwordHash: row.password_hash ?? null };
}

/**
 * Re-associate this browser/device with an EXISTING cloud profile after a
 * successful username+password login, pulling that profile's data (and its
 * lesson progress) down into local Dexie so the rest of the app reads the
 * right data. This does not create a new `profiles` row — it reads the
 * existing one by id and mirrors it locally.
 *
 * `ensureAnonSession()` still mints/reuses an anonymous `auth.uid()` for
 * this browser. That uid will generally NOT equal the profile's original
 * `id` (which belonged to whatever browser/device signed up). We keep the
 * cloud row's original `id` as the local profile id (so existing
 * `node_progress` rows — keyed by that id — resolve correctly), and we
 * additionally upsert the cloud `profiles` row's `id` to point at this
 * browser's current uid is intentionally NOT done, because RLS keys
 * ownership off of `id = auth.uid()`; instead we simply pull data down
 * read-only under the row's original id for local use. Future syncs from
 * this browser will go through `syncProfileToCloud`, which writes under
 * `auth.uid()` — see the note there about cross-device username collisions.
 */
export async function pullProfileAndProgressFromCloud(profileId: string): Promise<UserProfile | null> {
  // A direct `.from('profiles').select(...)` here is blocked by RLS: this
  // browser's anon `auth.uid()` (from ensureAnonSession) is NOT the same as
  // `profileId` (the row's original owner uid) by design on login from a
  // new/different device — see the note above this function. RLS silently
  // returns zero rows (not an error) in that case, which used to surface as
  // the generic "مشکلی در دریافت اطلاعات" error on every cross-device
  // login. Use the SECURITY DEFINER RPC (bypasses RLS, but only exposes the
  // columns we select in the function body) instead of a raw table read.
  const { data: row, error } = await supabase
    .rpc('get_login_profile_full', { p_id: profileId })
    .maybeSingle();
  if (error || !row) {
    console.error('[sync] pullProfileAndProgressFromCloud: profile fetch failed', error);
    return null;
  }

  const profileRow = row as {
    id: string;
    name: string;
    username: string;
    dob: string | null;
    avatar_url: string | null;
    joined_at: string;
    diamonds: number | null;
    streak_days: number | null;
    last_active_date: string | null;
    total_score: number | null;
    password_hash: string | null;
  };

  const profile: UserProfile = {
    id: profileRow.id,
    name: profileRow.name,
    username: profileRow.username,
    birthDate: profileRow.dob ?? undefined,
    avatarUrl: profileRow.avatar_url ?? undefined,
    joinedAt: profileRow.joined_at,
    diamonds: profileRow.diamonds ?? 0,
    streakDays: profileRow.streak_days ?? 0,
    lastActiveDate: profileRow.last_active_date ?? undefined,
    totalScore: profileRow.total_score ?? 0,
    passwordHash: profileRow.password_hash ?? undefined,
  };

  await db.profiles.put(profile);

  // Same RLS problem as the profile row above: node_progress is keyed by
  // `user_id = auth.uid()`, which this browser's anon session doesn't match
  // for a cross-device login. Use the SECURITY DEFINER RPC instead.
  const { data: progressRows, error: progressError } = await supabase
    .rpc('get_node_progress_by_user', { p_user_id: profileId });
  if (progressError) {
    console.error('[sync] pullProfileAndProgressFromCloud: progress fetch failed', progressError);
  } else if (progressRows) {
    for (const p of progressRows) {
      const progress: NodeProgress = {
        nodeId: p.node_id,
        userId: profileId,
        completed: p.completed,
        stars: p.stars ?? 0,
        accuracy: p.best_accuracy ?? 0,
        completedAt: p.last_played_at ?? undefined,
        attempts: p.attempts ?? 0,
      };
      await db.progress.put(progress);
    }
  }

  return profile;
}

/**
 * Search public profiles by username substring for the Friends "find by
 * username" feature. A direct `.from('profiles').select(...)` here hits the
 * same `USING (auth.uid() = id)` RLS policy that blocked login lookups
 * before `get_login_profile` was introduced above — RLS silently returns
 * zero rows for any profile that isn't the caller's own, so friend search
 * for anyone else's username always came back empty. Use a SECURITY
 * DEFINER RPC that exposes only the public-safe columns needed for a
 * friend-search result (no password_hash, diamonds are already
 * intentionally shown elsewhere in-app so kept here too).
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
  const { data, error } = await supabase.rpc('find_profile_by_username_public', {
    p_query: q,
  });
  if (error || !data) {
    console.error('[sync] searchProfilesByUsername failed', error);
    return [];
  }
  return data as Array<{
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
    diamonds: number;
  }>;
}

/**
 * Hardened login: the server never sends a password hash to the client. The
 * client asks only for the (public) salt, recomputes the hash and the server
 * compares it, returning the profile + progress only on a match.
 * Requires the `get_login_salt` / `login_with_hash` functions from
 * SECURITY-SQL.md; `legacy` means they are not installed yet.
 */
export type LoginResult =
  | { status: 'ok'; profile: UserProfile }
  | { status: 'notfound' | 'wrong' | 'legacy' | 'error' };

export async function loginWithPassword(username: string, password: string): Promise<LoginResult> {
  await ensureAnonSession();
  const uname = username.trim().toLowerCase();
  const { data: salt, error: saltErr } = await supabase.rpc('get_login_salt', { p_username: uname });
  if (saltErr) return { status: saltErr.code === 'PGRST202' ? 'legacy' : 'error' };
  if (!salt) return { status: 'notfound' };

  const stored = await hashWithSalt(password, salt as string);
  const { data, error } = await supabase.rpc('login_with_hash', { p_username: uname, p_hash: stored });
  if (error) return { status: error.code === 'PGRST202' ? 'legacy' : 'error' };
  if (!data) return { status: 'wrong' };

  const row = (data as { profile: any; progress: any[] }).profile;
  const profile: UserProfile = {
    id: row.id,
    name: row.name,
    username: row.username,
    birthDate: row.dob ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    joinedAt: row.joined_at,
    diamonds: row.diamonds ?? 0,
    streakDays: row.streak_days ?? 0,
    lastActiveDate: row.last_active_date ?? undefined,
    totalScore: row.total_score ?? 0,
    passwordHash: stored,
  };
  await db.profiles.put(profile);
  for (const p of (data as { progress: any[] }).progress ?? []) {
    await db.progress.put({
      nodeId: p.node_id,
      userId: profile.id,
      completed: p.completed,
      stars: p.stars ?? 0,
      accuracy: p.best_accuracy ?? 0,
      completedAt: p.last_played_at ?? undefined,
      attempts: p.attempts ?? 0,
    });
  }
  return { status: 'ok', profile };
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

/**
 * Public profile cards for a set of ids (friends list). Prefers the
 * `get_public_profiles` RPC (adds streak + score, see SECURITY-SQL.md); falls
 * back to the older public search RPC, which has no streak and uses diamonds.
 */
export async function getPublicProfiles(ids: string[]): Promise<PublicProfile[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.rpc('get_public_profiles', { p_ids: ids });
  if (!error && data) return data as PublicProfile[];
  const all = await searchProfilesByUsername('', true);
  const want = new Set(ids);
  return all.filter((p) => want.has(p.id));
}

export async function addFriendSecure(me: UserProfile, friendId: string): Promise<boolean> {
  if (!me.passwordHash) return false;
  return rpcAuthed('add_friend_secure', { p_me: me.id, p_hash: me.passwordHash, p_friend: friendId });
}

/** Friend ids of this account, or null when the RPC is unavailable / auth failed. */
export async function getMyFriendIds(me: UserProfile): Promise<string[] | null> {
  if (!me.passwordHash) return null;
  const { data, error } = await supabase.rpc('get_my_friend_ids', { p_me: me.id, p_hash: me.passwordHash });
  if (error || !Array.isArray(data)) return null;
  return data as string[];
}
