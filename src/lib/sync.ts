import { supabase } from './supabase';
import type { UserProfile, NodeProgress } from '../types';

export async function ensureAnonSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    await supabase.auth.signInAnonymously();
  }
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
    // `profiles.username` (not `id`) carries the real UNIQUE constraint that
    // production is hitting: whenever the browser ends up with a fresh
    // anonymous auth id (session/local-storage cleared or expired) but the
    // same locally-stored `username`, an onConflict:'id' upsert can't see
    // that a row already exists — it isn't a PK conflict, so Postgres tries
    // a plain INSERT and 23505s on the username unique index instead.
    // Targeting the column that actually enforces uniqueness lets Postgres
    // update the existing row (re-pointing it at the current auth id)
    // instead of attempting a doomed second insert.
  }, { onConflict: 'username' });
  if (error) console.error('[sync] syncProfileToCloud upsert failed', error);
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
