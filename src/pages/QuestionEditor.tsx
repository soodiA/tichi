import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { QuestionType, Option } from '../types';
import { TYPE_LABELS, ALL_TYPES, UNSUPPORTED_TYPES, QUESTION_TYPE_DEFAULT_TEXT } from '../lib/questionTypes';
import { QUESTION_TYPE_PROMPT } from '../lib/questionTypeAudio';
import { Field, TextInput, AudioField } from './question-editor/shared';
import { emptyDraft, type QuestionDraft, type FormProps } from './question-editor/types';

import AudioPictureForm from './question-editor/forms/AudioPicture';
import SyllableCountForm from './question-editor/forms/SyllableCount';
import FlowerCountForm from './question-editor/forms/FlowerCount';
import RecordForm from './question-editor/forms/Record';
import FillBlanksForm from './question-editor/forms/FillBlanks';
import HandwritingForm from './question-editor/forms/Handwriting';
import AudioOptionsForm from './question-editor/forms/AudioOptions';
import SentenceCompleteForm from './question-editor/forms/SentenceComplete';
import ArrangeForm from './question-editor/forms/Arrange';
import PhonemeForm from './question-editor/forms/Phoneme';
import SoundToTextForm from './question-editor/forms/SoundToText';
import ColorLetterForm from './question-editor/forms/ColorLetter';
import PairMatchForm from './question-editor/forms/PairMatch';

const FORM_BY_TYPE: Partial<Record<QuestionType, React.FC<FormProps>>> = {
  audio_picture: AudioPictureForm,
  syllable_count: SyllableCountForm,
  flower_count: FlowerCountForm,
  record: RecordForm,
  fill_blanks: FillBlanksForm,
  handwriting: HandwritingForm,
  audio_options: AudioOptionsForm,
  sentence_complete: SentenceCompleteForm,
  arrange: ArrangeForm,
  phoneme: PhonemeForm,
  sound_to_text: SoundToTextForm,
  color_letter: ColorLetterForm,
  pair_match: PairMatchForm,
};

interface NodeRow {
  id: string;
  ord: number;
  type: string;
  unit_id: string;
  unit_letter: string;
  unit_ord: number;
}

interface QuestionRow {
  id: string;
  node_id: string;
  type: QuestionType;
  question_text: string;
  question_audio_url: string | null;
  media_label: string | null;
  options: Option[];
  correct_answer: string;
  ord: number;
  syllable_count: number | null;
}

function rowToDraft(r: QuestionRow): QuestionDraft {
  let correctAnswer: string | string[] = r.correct_answer;
  if (typeof r.correct_answer === 'string' && r.correct_answer.startsWith('[')) {
    try { correctAnswer = JSON.parse(r.correct_answer); } catch { /* keep as string */ }
  }
  let template: (string | null)[] = [];
  let options = r.options ?? [];
  const tplOpt = options.find(o => o.id === '__template__');
  if (tplOpt) {
    try { template = JSON.parse(tplOpt.text ?? '[]'); } catch { /* ignore */ }
    options = options.filter(o => o.id !== '__template__');
  }
  return {
    questionText: r.question_text ?? '',
    questionAudioUrl: r.question_audio_url ?? '',
    mediaLabel: r.media_label ?? '',
    options,
    correctAnswer,
    template,
    syllableCount: r.syllable_count ?? '',
  };
}

function draftToRow(draft: QuestionDraft, type: QuestionType) {
  let options = draft.options;
  if (draft.template.length > 0) {
    options = [{ id: '__template__', text: JSON.stringify(draft.template) }, ...draft.options];
  }
  const correct_answer = Array.isArray(draft.correctAnswer) ? JSON.stringify(draft.correctAnswer) : draft.correctAnswer;
  return {
    type,
    question_text: draft.questionText,
    question_audio_url: draft.questionAudioUrl || null,
    media_label: draft.mediaLabel || null,
    options,
    correct_answer,
    syllable_count: draft.syllableCount === '' ? null : draft.syllableCount,
  };
}

type ViewMode = 'tree' | 'flat';

const QuestionEditor: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [nodeFilter, setNodeFilter] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [flatQuestions, setFlatQuestions] = useState<QuestionRow[]>([]);
  const [loadingFlat, setLoadingFlat] = useState(false);
  const [flatFilter, setFlatFilter] = useState('');

  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [editingType, setEditingType] = useState<QuestionType | null>(null);
  const [draft, setDraft] = useState<QuestionDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: unitsData } = await supabase.from('units').select('id, letter, ord').order('ord');
      const { data: nodesData } = await supabase.from('nodes').select('id, unit_id, ord, type').order('ord');
      if (!unitsData || !nodesData) return;
      const letterByUnit = new Map(unitsData.map(u => [u.id, u.letter]));
      const ordByUnit = new Map(unitsData.map(u => [u.id, u.ord]));
      const withUnitOrd = nodesData.map(n => ({
        ...n,
        unit_letter: letterByUnit.get(n.unit_id) ?? '?',
        unit_ord: ordByUnit.get(n.unit_id) ?? 999,
      }));
      // node.ord resets to 0 per unit, so sort by (unit position in the app, then node ord within it).
      withUnitOrd.sort((a, b) => a.unit_ord - b.unit_ord || a.ord - b.ord);
      setNodes(withUnitOrd);
    })();
  }, []);

  const loadQuestions = async (nodeId: string) => {
    setLoadingQuestions(true);
    const { data } = await supabase.from('questions').select('*').eq('node_id', nodeId).order('ord');
    setQuestions((data ?? []) as QuestionRow[]);
    setLoadingQuestions(false);
  };

  const loadFlatQuestions = async () => {
    setLoadingFlat(true);
    const { data } = await supabase.from('questions').select('*').order('node_id').order('ord');
    setFlatQuestions((data ?? []) as QuestionRow[]);
    setLoadingFlat(false);
  };

  useEffect(() => {
    if (viewMode === 'flat' && flatQuestions.length === 0 && !loadingFlat) {
      loadFlatQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const nodeLabel = (nodeId: string) => {
    const n = nodes.find(x => x.id === nodeId);
    return n ? `${n.unit_letter} · ${n.type} #${n.ord}` : nodeId;
  };

  const selectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setEditingId(null);
    loadQuestions(nodeId);
  };

  const startNew = (type: QuestionType) => {
    setEditingId('new');
    setEditingType(type);
    setDraft({ ...emptyDraft(), questionText: QUESTION_TYPE_DEFAULT_TEXT[type] ?? '' });
  };

  const startEdit = (row: QuestionRow) => {
    setEditingId(row.id);
    setEditingType(row.type);
    setDraft(rowToDraft(row));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingType(null);
  };

  const patch = (p: Partial<QuestionDraft>) => setDraft(prev => ({ ...prev, ...p }));

  const save = async () => {
    if (!selectedNodeId || !editingType) return;
    setSaving(true);
    const row = draftToRow(draft, editingType);
    if (editingId === 'new') {
      const nextOrd = questions.length > 0 ? Math.max(...questions.map(q => q.ord)) + 1 : 1;
      const id = `q-${editingType}-${Date.now()}`;
      const { error } = await supabase.from('questions').insert({ id, node_id: selectedNodeId, ord: nextOrd, ...row });
      if (error) { alert(`خطا در ذخیره: ${error.message}`); setSaving(false); return; }
    } else if (editingId) {
      const { error } = await supabase.from('questions').update(row).eq('id', editingId);
      if (error) { alert(`خطا در ذخیره: ${error.message}`); setSaving(false); return; }
    }
    setSaving(false);
    setEditingId(null);
    setEditingType(null);
    if (selectedNodeId) loadQuestions(selectedNodeId);
    if (viewMode === 'flat') loadFlatQuestions();
  };

  const remove = async (id: string) => {
    if (!confirm('این سوال حذف بشه؟')) return;
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) { alert(`خطا در حذف: ${error.message}`); return; }
    if (selectedNodeId) loadQuestions(selectedNodeId);
    if (viewMode === 'flat') loadFlatQuestions();
  };

  const filteredNodes = nodeFilter.trim()
    ? nodes.filter(n => n.unit_letter.includes(nodeFilter) || n.id.includes(nodeFilter))
    : nodes;

  // filteredNodes is already sorted by (unit_ord, ord) — group consecutive
  // runs by unit so the picker reads as one row per unit, in app order.
  const nodeGroups: { unitLetter: string; unitId: string; nodes: NodeRow[] }[] = [];
  for (const n of filteredNodes) {
    const last = nodeGroups[nodeGroups.length - 1];
    if (last && last.unitId === n.unit_id) last.nodes.push(n);
    else nodeGroups.push({ unitLetter: n.unit_letter, unitId: n.unit_id, nodes: [n] });
  }

  const filteredFlat = flatFilter.trim()
    ? flatQuestions.filter(q =>
        q.question_text.includes(flatFilter) ||
        (q.media_label ?? '').includes(flatFilter) ||
        nodeLabel(q.node_id).includes(flatFilter))
    : flatQuestions;

  const FormComponent = editingType ? FORM_BY_TYPE[editingType] : null;

  return (
    <div dir="rtl" className="min-h-screen bg-violet-50 flex flex-col items-center p-4 md:p-8 gap-4 pb-16">
      <div className="w-full flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-violet-800">ورود و ویرایش سوال‌ها</h1>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button onClick={() => setViewMode('tree')}
            className={`py-2 px-4 rounded-xl text-sm md:text-base font-bold border-2 ${viewMode === 'tree' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            بر اساس واحد و بخش
          </button>
          <button onClick={() => setViewMode('flat')}
            className={`py-2 px-4 rounded-xl text-sm md:text-base font-bold border-2 ${viewMode === 'flat' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            همه‌ی سوال‌ها
          </button>
        </div>
      </div>

      {viewMode === 'tree' && (
        <div className="w-full flex flex-col md:flex-row gap-4 items-start">
          {/* Node picker — grouped by unit, in app order */}
          <div className="w-full md:w-80 md:shrink-0">
            <input type="text" value={nodeFilter} onChange={(e) => setNodeFilter(e.target.value)}
              placeholder="فیلتر بر اساس حرف یا شناسه‌ی مرحله..."
              className="w-full px-4 py-3 text-base rounded-xl border-2 border-violet-200 mb-3" />
            <div className="flex flex-col gap-3 md:max-h-[75vh] md:overflow-y-auto pr-1">
              {nodeGroups.map(g => (
                <div key={g.unitId} className="bg-white/60 rounded-xl border border-violet-100 p-2">
                  <p className="text-sm font-extrabold text-violet-700 mb-1.5 px-1">واحد {g.unitLetter}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.nodes.map(n => (
                      <button key={n.id} onClick={() => selectNode(n.id)}
                        className={`py-2.5 px-4 rounded-lg text-sm font-bold border-2 ${selectedNodeId === n.id ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                        {n.type} #{n.ord}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedNodeId && (
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              {loadingQuestions ? (
                <p className="text-sm text-gray-400">در حال بارگذاری...</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {questions.map(q => (
                    <div key={q.id} className="bg-white rounded-xl border-2 border-gray-200 p-3 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-violet-500 font-bold">{TYPE_LABELS[q.type]}</p>
                        <p className="text-sm text-gray-700 truncate">{q.question_text}</p>
                      </div>
                      <button onClick={() => startEdit(q)} className="text-sm font-bold text-violet-600 py-1.5 px-3 shrink-0">ویرایش</button>
                      <button onClick={() => remove(q.id)} className="text-sm font-bold text-red-400 py-1.5 px-3 shrink-0">حذف</button>
                    </div>
                  ))}
                </div>
              )}

              {editingId === null && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-gray-500">افزودن سوال جدید — نوع رو انتخاب کن:</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_TYPES.filter(t => !UNSUPPORTED_TYPES.includes(t)).map(t => (
                      <button key={t} onClick={() => startNew(t)}
                        className="py-2 px-4 rounded-lg text-sm font-bold border-2 bg-white text-gray-600 border-violet-200">
                        + {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {viewMode === 'flat' && (
        <div className="w-full flex flex-col gap-3">
          <input type="text" value={flatFilter} onChange={(e) => setFlatFilter(e.target.value)}
            placeholder="جستجو در متن، واحد یا برچسب سوال..."
            className="w-full max-w-md px-4 py-3 text-base rounded-xl border-2 border-violet-200" />

          {loadingFlat ? (
            <p className="text-sm text-gray-400">در حال بارگذاری همه‌ی سوال‌ها...</p>
          ) : (
            <>
              <p className="text-sm text-gray-400">{filteredFlat.length} سوال</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[75vh] overflow-y-auto">
                {filteredFlat.map(q => (
                  <div key={q.id} className="bg-white rounded-xl border-2 border-gray-200 p-3 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">{nodeLabel(q.node_id)}</p>
                      <p className="text-xs text-violet-500 font-bold">{TYPE_LABELS[q.type]}</p>
                      <p className="text-sm text-gray-700 truncate">{q.question_text}</p>
                    </div>
                    <button onClick={() => startEdit(q)} className="text-sm font-bold text-violet-600 py-1.5 px-3 shrink-0">ویرایش</button>
                    <button onClick={() => remove(q.id)} className="text-sm font-bold text-red-400 py-1.5 px-3 shrink-0">حذف</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {editingId !== null && editingType && FormComponent && (
        <div className="w-full max-w-2xl bg-white rounded-2xl border-2 border-violet-300 shadow-lg p-4 md:p-6 flex flex-col gap-4">
          <p className="font-bold text-violet-700">{editingId === 'new' ? 'سوال جدید' : 'ویرایش سوال'} — {TYPE_LABELS[editingType]}</p>

          <Field label="متن سوال">
            <TextInput value={draft.questionText} onChange={(v) => patch({ questionText: v })}
              placeholder={QUESTION_TYPE_PROMPT[editingType] ?? 'مثلاً: کدام گزینه درست است؟'} />
          </Field>

          <Field label="صدای سوال (اختیاری — اگه نوع سوال صدای مشترک داره نیازی نیست)">
            <AudioField value={draft.questionAudioUrl || undefined} onChange={(v) => patch({ questionAudioUrl: v })} storagePrefix="questions/misc" />
          </Field>

          <FormComponent draft={draft} patch={patch} />

          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="flex-1 bg-violet-600 text-white font-bold py-3 rounded-2xl active:scale-95 disabled:opacity-50">
              {saving ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
            <button onClick={cancelEdit} className="py-3 px-6 rounded-2xl border-2 border-gray-300 text-gray-600 font-bold">انصراف</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionEditor;
