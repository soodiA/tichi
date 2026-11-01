import type { Question } from '../types';
import { adminJson, apiJson } from './api';
export { getAdminKey, setAdminKey } from './adminKey';

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

/** Sends a user's "this question has a problem" report. */
export async function submitQuestionReport(args: {
  question: Question;
  nodeId: string | null;
  description: string;
  reporterUsername: string | null;
}): Promise<boolean> {
  try {
    await apiJson('/api/v1/reports', {
      method: 'POST',
      body: {
        question_id: args.question.id,
        node_id: args.nodeId,
        question_type: args.question.type,
        snapshot: args.question,
        description: args.description.trim().slice(0, 1000),
        reporter_username: args.reporterUsername,
      },
    });
    return true;
  } catch (e) {
    console.error('[reports] submit failed', e);
    return false;
  }
}

/** Returns null when the admin key is wrong or the request failed. The key is passed per call. */
export async function listQuestionReports(key: string): Promise<QuestionReport[] | null> {
  try {
    return await apiJson<QuestionReport[]>('/api/v1/admin/reports', { headers: { 'X-Admin-Key': key } });
  } catch (e) {
    console.error('[reports] list failed', e);
    return null;
  }
}

export async function setQuestionReportStatus(_key: string, id: string, status: 'open' | 'resolved'): Promise<boolean> {
  try {
    await adminJson(`/api/v1/admin/reports/${encodeURIComponent(id)}/status`, { method: 'PUT', body: { status } });
    return true;
  } catch (e) {
    console.error('[reports] status failed', e);
    return false;
  }
}
