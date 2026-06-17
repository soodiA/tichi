import { supabase } from './supabase';
import { db } from '../db/db';
import type { Unit, Node, Question } from '../types';

interface RawQuestion {
  id: string;
  node_id: string;
  type: string;
  question_text: string;
  question_audio_url: string | null;
  media_label: string | null;
  options: Question['options'];
  correct_answer: string;
  ord: number;
  syllable_count: number | null;
}

interface RawNode {
  id: string;
  unit_id: string;
  ord: number;
  type: string;
}

interface RawUnit {
  id: string;
  letter: string;
  ord: number;
  color: string;
}

function toQuestion(r: RawQuestion): Question & { nodeId: string } {
  return {
    id: r.id,
    nodeId: r.node_id,
    type: r.type as Question['type'],
    questionText: r.question_text,
    questionAudioUrl: r.question_audio_url ?? undefined,
    mediaLabel: r.media_label ?? undefined,
    options: r.options ?? [],
    correctAnswer: r.correct_answer,
    syllableCount: r.syllable_count ?? undefined,
  };
}

export async function loadCurriculum(): Promise<Unit[]> {
  // Try to fetch fresh from Supabase
  if (navigator.onLine) {
    try {
      const [{ data: rawUnits }, { data: rawNodes }, { data: rawQuestions }] =
        await Promise.all([
          supabase.from('units').select('*').order('ord'),
          supabase.from('nodes').select('*').order('ord'),
          supabase.from('questions').select('*').order('ord'),
        ]);

      if (rawUnits && rawNodes && rawQuestions) {
        const questions = (rawQuestions as RawQuestion[]).map(toQuestion);
        const nodes: Node[] = (rawNodes as RawNode[]).map((n) => ({
          id: n.id,
          unitId: n.unit_id,
          order: n.ord,
          type: n.type as Node['type'],
          questions: questions
            .filter((q) => q.nodeId === n.id)
            .sort((a, b) => {
              const oa = rawQuestions.find((r: RawQuestion) => r.id === a.id)?.ord ?? 0;
              const ob = rawQuestions.find((r: RawQuestion) => r.id === b.id)?.ord ?? 0;
              return oa - ob;
            }),
        }));

        const units: Unit[] = (rawUnits as RawUnit[]).map((u) => ({
          id: u.id,
          letter: u.letter,
          order: u.ord,
          color: u.color,
          nodes: nodes.filter((n) => n.unitId === u.id).sort((a, b) => a.order - b.order),
        }));

        // Cache locally
        await db.transaction('rw', [db.units, db.nodes, db.questions], async () => {
          await db.units.bulkPut(units);
          await db.nodes.bulkPut(nodes);
          await db.questions.bulkPut(questions);
        });

        return units;
      }
    } catch {
      // fall through to local cache
    }
  }

  // Offline: load from IndexedDB cache
  const cachedUnits = await db.units.orderBy('order').toArray();
  const cachedNodes = await db.nodes.orderBy('order').toArray();
  const cachedQuestions = await db.questions.toArray();

  return cachedUnits.map((u) => ({
    ...u,
    nodes: cachedNodes
      .filter((n) => n.unitId === u.id)
      .sort((a, b) => a.order - b.order)
      .map((n) => ({
        ...n,
        questions: cachedQuestions
          .filter((q) => q.nodeId === n.id)
          .sort((a, b) => (a as any).order - (b as any).order),
      })),
  }));
}
