import { supabase } from './supabase';
import { ensureAnonSession } from './sync';
import type { Question } from '../types';

export interface QuestionReport {
  id: string;
  question_id: string;
  node_id: string | null;
  question_type: string | null;
  question_snapshot: Question | null;
  description: string | null;
  reporter_username: string | null;
  status: 'open' | 'resolved';
  created_at: string;
}

/** Sends a user's "this question has a problem" report. See SECURITY-SQL.md phase 4. */
export async function submitQuestionReport(args: {
  question: Question;
  nodeId: string | null;
  description: string;
  reporterUsername: string | null;
}): Promise<boolean> {
  await ensureAnonSession();
  const { error } = await supabase.rpc('submit_question_report', {
    p_question_id: args.question.id,
    p_node_id: args.nodeId,
    p_question_type: args.question.type,
    p_snapshot: args.question,
    p_description: args.description.trim().slice(0, 1000),
    p_reporter_username: args.reporterUsername,
  });
  if (error) {
    console.error('[reports] submit failed', error);
    return false;
  }
  return true;
}

const KEY_STORAGE = 'tichi-admin-key';
export const getAdminKey = () => {
  try { return localStorage.getItem(KEY_STORAGE) ?? ''; } catch { return ''; }
};
export const setAdminKey = (k: string) => {
  try { k ? localStorage.setItem(KEY_STORAGE, k) : localStorage.removeItem(KEY_STORAGE); } catch { /* ignore */ }
};

/** Returns null when the admin key is wrong or the request failed. */
export async function listQuestionReports(key: string): Promise<QuestionReport[] | null> {
  const { data, error } = await supabase.rpc('admin_list_question_reports', { p_key: key });
  if (error) {
    console.error('[reports] list failed', error);
    return null;
  }
  return (data ?? []) as QuestionReport[];
}

export async function setQuestionReportStatus(key: string, id: string, status: 'open' | 'resolved'): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_set_question_report_status', { p_key: key, p_id: id, p_status: status });
  if (error) {
    console.error('[reports] status failed', error);
    return false;
  }
  return data === true;
}
