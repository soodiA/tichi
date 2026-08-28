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

const QuestionEditor: React.FC = () => {
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [nodeFilter, setNodeFilter] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

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
      setNodes(nodesData.map(n => ({ ...n, unit_letter: letterByUnit.get(n.unit_id) ?? '?' })));
    })();
  }, []);

  const loadQuestions = async (nodeId: string) => {
    setLoadingQuestions(true);
    const { data } = await supabase.from('questions').select('*').eq('node_id', nodeId).order('ord');
    setQuestions((data ?? []) as QuestionRow[]);
    setLoadingQuestions(false);
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
  };

  const remove = async (id: string) => {
    if (!confirm('این سوال حذف بشه؟')) return;
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) { alert(`خطا در حذف: ${error.message}`); return; }
    if (selectedNodeId) loadQuestions(selectedNodeId);
  };

  const filteredNodes = nodeFilter.trim()
    ? nodes.filter(n => n.unit_letter.includes(nodeFilter) || n.id.includes(nodeFilter))
    : nodes;

  const FormComponent = editingType ? FORM_BY_TYPE[editingType] : null;

  return (
    <div dir="rtl" className="min-h-screen bg-violet-50 flex flex-col items-center p-4 gap-4 pb-16">
      <h1 className="text-xl font-bold text-violet-800">ورود و ویرایش سوال‌ها</h1>

      {/* Node picker */}
      <div className="w-full max-w-md">
        <input type="text" value={nodeFilter} onChange={(e) => setNodeFilter(e.target.value)}
          placeholder="فیلتر بر اساس حرف یا شناسه‌ی مرحله..."
          className="w-full px-4 py-2 rounded-xl border-2 border-violet-200 mb-2" />
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {filteredNodes.map(n => (
            <button key={n.id} onClick={() => selectNode(n.id)}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold border-2 ${selectedNodeId === n.id ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200'}`}>
              {n.unit_letter} · {n.type} #{n.ord}
            </button>
          ))}
        </div>
      </div>

      {selectedNodeId && (
        <div className="w-full max-w-md flex flex-col gap-3">
          {loadingQuestions ? (
            <p className="text-sm text-gray-400">در حال بارگذاری...</p>
          ) : (
            questions.map(q => (
              <div key={q.id} className="bg-white rounded-xl border-2 border-gray-200 p-3 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-violet-500 font-bold">{TYPE_LABELS[q.type]}</p>
                  <p className="text-sm text-gray-700 truncate">{q.question_text}</p>
                </div>
                <button onClick={() => startEdit(q)} className="text-xs font-bold text-violet-600 py-1 px-2">ویرایش</button>
                <button onClick={() => remove(q.id)} className="text-xs font-bold text-red-400 py-1 px-2">حذف</button>
              </div>
            ))
          )}

          {editingId === null && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-gray-500">افزودن سوال جدید — نوع رو انتخاب کن:</p>
              <div className="flex flex-wrap gap-2">
                {ALL_TYPES.filter(t => !UNSUPPORTED_TYPES.includes(t)).map(t => (
                  <button key={t} onClick={() => startNew(t)}
                    className="py-1.5 px-3 rounded-lg text-xs font-bold border-2 bg-white text-gray-600 border-violet-200">
                    + {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {editingId !== null && editingType && FormComponent && (
        <div className="w-full max-w-md bg-white rounded-2xl border-2 border-violet-300 shadow-lg p-4 flex flex-col gap-4">
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
