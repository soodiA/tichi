import { supabase } from './supabase';
import { db } from '../db/db';
import type { UserProfile, NodeProgress } from '../types';

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

export async function syncProfileToCloud(profile: UserProfile): Promise<void> {
  await ensureAnonSession();
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
    password_hash: profile.passwordHash ?? null,
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
  const { data, error } = await supabase
    .from('profiles')
    .select('id, password_hash')
    .eq('username', username.trim())
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, passwordHash: data.password_hash ?? null };
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
  const { data: row, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle();
  if (error || !row) {
    console.error('[sync] pullProfileAndProgressFromCloud: profile fetch failed', error);
    return null;
  }

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
    passwordHash: row.password_hash ?? undefined,
  };

  await db.profiles.put(profile);

  const { data: progressRows, error: progressError } = await supabase
    .from('node_progress')
    .select('*')
    .eq('user_id', profileId);
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
