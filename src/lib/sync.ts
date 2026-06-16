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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('profiles').upsert({
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
  }, { onConflict: 'id' });
}

export async function syncProgressToCloud(progress: NodeProgress): Promise<void> {
  await ensureAnonSession();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('node_progress').upsert({
    user_id: user.id,
    node_id: progress.nodeId,
    stars: progress.stars,
    completed: progress.completed,
    best_accuracy: progress.accuracy,
    attempts: progress.attempts,
    last_played_at: progress.completedAt ?? null,
  }, { onConflict: 'user_id,node_id' });
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
