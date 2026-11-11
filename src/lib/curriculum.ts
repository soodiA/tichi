import { apiJson } from './api';
import { db } from '../db/db';
import type { Unit, Node, Question } from '../types';
import { promptKeyFor, AUDIO_PICTURE_END_KEY } from './questionTypeAudio';

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
  // Extract template stored as a __template__ sentinel option (fill_blanks questions)
  let template: (string | null)[] | undefined;
  let options = r.options ?? [];
  const templateOpt = options.find((o: any) => o.id === '__template__');
  if (templateOpt) {
    try { template = JSON.parse((templateOpt as any).text); } catch {}
    options = options.filter((o: any) => o.id !== '__template__');
  }

  // Parse correctAnswer as string[] if stored as JSON array (phoneme, arrange).
  // Trim first — a leading/trailing space (e.g. from manual DB edits) used to
  // make the startsWith('[') check miss the array and silently fall back to
  // treating it as a single-id string, breaking those question types.
  let correctAnswer: string | string[] = r.correct_answer;
  const trimmed = typeof r.correct_answer === 'string' ? r.correct_answer.trim() : '';
  if (trimmed.startsWith('[')) {
    try { correctAnswer = JSON.parse(trimmed); } catch {}
  }

  return {
    id: r.id,
    nodeId: r.node_id,
    type: r.type as Question['type'],
    questionText: r.question_text,
    questionAudioUrl: r.question_audio_url ?? undefined,
    mediaLabel: r.media_label ?? undefined,
    options,
    correctAnswer,
    syllableCount: r.syllable_count ?? undefined,
    template,
  };
}

// The yellow speaker next to a question must read the QUESTION. Some rows had a
// word/letter/combo clip written into question_audio_url (old per-word recorder
// pages matched on media_label), so the icon spoke the target word instead.
// Replace those with the type's shared prompt recording (from /audio-recorder),
// taken from any sibling row of the same type that has one.
const NON_PROMPT_AUDIO = /\/audio\/(words|letters|combos|intro)\//;
// Recordings made for the audio_picture "end" phrasing live at types/<base64url(key)>--…
const END_CLIP = /\/audio\/types\/YXVkaW9fcGljdHVyZV9lbmQ/;
function withTypePromptAudio<T extends Question>(qs: T[]): T[] {
  // audio_picture: start rows must not play the end recording and vice versa.
  const fits = (q: T, url: string) =>
    q.type !== 'audio_picture' || END_CLIP.test(url) === (promptKeyFor(q) === AUDIO_PICTURE_END_KEY);
  const typeUrl = new Map<string, string>();
  for (const q of qs) {
    const k = promptKeyFor(q);
    if (q.questionAudioUrl && !NON_PROMPT_AUDIO.test(q.questionAudioUrl) && fits(q, q.questionAudioUrl) && !typeUrl.has(k)) {
      typeUrl.set(k, q.questionAudioUrl);
    }
  }
  return qs.map((q) => {
    if (!q.questionAudioUrl) return q;
    if (!NON_PROMPT_AUDIO.test(q.questionAudioUrl) && fits(q, q.questionAudioUrl)) return q;
    return { ...q, questionAudioUrl: typeUrl.get(promptKeyFor(q)) };
  });
}

const DEMO_MAX_UNIT_ORD = import.meta.env.VITE_DEMO_MAX_UNIT_ORD
  ? Number(import.meta.env.VITE_DEMO_MAX_UNIT_ORD)
  : undefined;

function applyDemoLimit(units: Unit[]): Unit[] {
  if (!DEMO_MAX_UNIT_ORD) return units;
  return units.filter((u) => u.order <= DEMO_MAX_UNIT_ORD);
}

// Soodeh has repeatedly reported "missing" questions that turned out to be a stale
// IndexedDB cache being served silently (live fetch failing/never attempted, e.g.
// flaky connectivity) — there was no way for her to tell she was looking at old data.
// This flag lets the UI show a visible indicator whenever that fallback happens, so
// the next report can confirm/rule out this cause immediately instead of guessing.
export let lastLoadWasFromCache = false;

// The curriculum payload is ~1.5 MB; Home, every lesson and the editors each asked for it again. Share one
// in-flight/recent result for a short time (a failed or cache-fallback load is not remembered, so it retries).
const CURRICULUM_TTL_MS = 60_000;
let curriculumMemo: { at: number; p: Promise<Unit[]> } | null = null;

export async function loadCurriculum(): Promise<Unit[]> {
  if (curriculumMemo && Date.now() - curriculumMemo.at < CURRICULUM_TTL_MS) {
    return applyDemoLimit(await curriculumMemo.p);
  }
  const p = loadCurriculumUnfiltered();
  const entry = { at: Date.now(), p };
  curriculumMemo = entry;
  p.then(() => { if (lastLoadWasFromCache && curriculumMemo === entry) curriculumMemo = null; })
   .catch(() => { if (curriculumMemo === entry) curriculumMemo = null; });
  return applyDemoLimit(await p);
}

async function loadCurriculumUnfiltered(): Promise<Unit[]> {
  if (navigator.onLine) {
    try {
      const { units: rawUnits, nodes: rawNodes, questions: rawQuestions } = await apiJson<{
        units: RawUnit[];
        nodes: RawNode[];
        questions: RawQuestion[];
      }>('/api/v1/curriculum');

      if (rawUnits && rawNodes && rawQuestions) {
        const questions = withTypePromptAudio((rawQuestions as RawQuestion[]).map(toQuestion));
        const nodes: Node[] = (rawNodes as RawNode[]).map((n) => ({
          id: n.id,
          unitId: n.unit_id,
          order: n.ord,
          type: n.type as Node['type'],
          questions: questions
            .filter((q) => q.nodeId === n.id)
            .sort((a, b) => {
              const oa = (rawQuestions as RawQuestion[]).find((r) => r.id === a.id)?.ord ?? 0;
              const ob = (rawQuestions as RawQuestion[]).find((r) => r.id === b.id)?.ord ?? 0;
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

        await db.transaction('rw', [db.units, db.nodes, db.questions], async () => {
          await db.units.bulkPut(units);
          await db.nodes.bulkPut(nodes);
          await db.questions.bulkPut(questions);
        });

        lastLoadWasFromCache = false;
        return units;
      }
    } catch (e) {
      // fall through to local (possibly stale) cache, but don't swallow the
      // failure silently — this is the same "silent .catch()" class of bug
      // already found and fixed for profile/friends sync (see src/lib/sync.ts).
      console.error('[curriculum] live fetch threw, falling back to cached data', e);
    }
  }

  lastLoadWasFromCache = true;
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
          .sort((a, b) => ((a as any).order ?? 0) - ((b as any).order ?? 0)),
      })),
  }));
}
