import { supabase } from './supabase';
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
