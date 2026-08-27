import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface OptionRow {
  id: string;
  text?: string;
  audioUrl?: string;
}

interface QuestionRow {
  id: string;
  node_id: string;
  question_text: string;
  question_audio_url: string | null;
  options: OptionRow[];
  correct_answer: string;
  ord: number;
}

const PAGE_SIZE = 20;
const BUCKET = 'audio';

type Target =
  | { kind: 'question'; questionId: string }
  | { kind: 'option'; questionId: string; optionId: string };

export default function RecordQuestionAudio() {
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [search, setSearch] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [statusByKey, setStatusByKey] = useState<Record<string, 'recording' | 'uploading' | 'saved' | 'error'>>({});

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const load = useCallback(async () => {
    let query = supabase
      .from('questions')
      .select('id, node_id, question_text, question_audio_url, options, correct_answer, ord', { count: 'exact' })
      .order('ord', { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (search.trim()) query = query.ilike('question_text', `%${search.trim()}%`);
    if (onlyMissing) query = query.eq('question_audio_url', '');
    const { data, count } = await query;
    setRows((data as QuestionRow[]) ?? []);
    setTotal(count ?? null);
  }, [page, search, onlyMissing]);

  useEffect(() => { load(); }, [load]);

  const keyFor = (t: Target) => t.kind === 'question' ? `q:${t.questionId}` : `o:${t.questionId}:${t.optionId}`;

  const startRecording = useCallback(async (target: Target) => {
    if (activeKey) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr = new MediaRecorder(stream, { mimeType });
      chunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.start();
      mediaRecorder.current = mr;
      const key = keyFor(target);
      setActiveKey(key);
      setStatusByKey((s) => ({ ...s, [key]: 'recording' }));
    } catch {
      alert('دسترسی به میکروفون ممکن نیست');
    }
  }, [activeKey]);

  const stopRecording = useCallback(async (target: Target) => {
    if (!mediaRecorder.current) return;
    const key = keyFor(target);
    setActiveKey(null);

    await new Promise<void>((resolve) => {
      mediaRecorder.current!.onstop = () => resolve();
      mediaRecorder.current!.stop();
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());

    const blob = new Blob(chunks.current, { type: mediaRecorder.current.mimeType });
    const ext = blob.type.includes('webm') ? 'webm' : 'ogg';
    const path = target.kind === 'question'
      ? `questions/${target.questionId}.${ext}`
      : `questions/${target.questionId}__${target.optionId}.${ext}`;

    setStatusByKey((s) => ({ ...s, [key]: 'uploading' }));

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true });
    if (upErr) {
      console.error('[record] upload failed', upErr);
      setStatusByKey((s) => ({ ...s, [key]: 'error' }));
      return;
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const audioUrl = urlData.publicUrl;

    if (target.kind === 'question') {
      const { error } = await supabase.from('questions')
        .update({ question_audio_url: audioUrl })
        .eq('id', target.questionId);
      if (error) { console.error('[record] db update failed', error); setStatusByKey((s) => ({ ...s, [key]: 'error' })); return; }
      setRows((prev) => prev.map((r) => r.id === target.questionId ? { ...r, question_audio_url: audioUrl } : r));
    } else {
      const row = rows.find((r) => r.id === target.questionId);
      if (!row) return;
      const newOptions = row.options.map((o) => o.id === target.optionId ? { ...o, audioUrl } : o);
      const { error } = await supabase.from('questions')
        .update({ options: newOptions })
        .eq('id', target.questionId);
      if (error) { console.error('[record] db update failed', error); setStatusByKey((s) => ({ ...s, [key]: 'error' })); return; }
      setRows((prev) => prev.map((r) => r.id === target.questionId ? { ...r, options: newOptions } : r));
    }
    setStatusByKey((s) => ({ ...s, [key]: 'saved' }));
  }, [rows]);

  const playAudio = (url: string) => new Audio(url).play().catch(() => {});

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-2">ضبط صدای سوال‌ها و گزینه‌ها</h1>
        <p className="text-gray-500 text-sm mb-4">این صفحه فقط برای مدیریت محتواست، لینک آن جایی در برنامه نمایش داده نمی‌شود.</p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="جستجو در متن سوال..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-300"
          />
          <label className="flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => { setOnlyMissing(e.target.checked); setPage(0); }} />
            فقط بدون صدا
          </label>
        </div>

        {total !== null && <p className="text-xs text-gray-400 mb-2">تعداد کل: {total.toLocaleString('fa-IR')}</p>}

        {rows.map((q) => (
          <div key={q.id} className="rounded-2xl border-2 border-gray-200 bg-white p-4 mb-3">
            <p className="font-bold text-gray-800 mb-1">{q.question_text || '(بدون متن)'}</p>
            <p className="text-xs text-gray-400 mb-3">id: {q.id}</p>

            <Row
              label="صدای سوال"
              audioUrl={q.question_audio_url || undefined}
              statusKey={keyFor({ kind: 'question', questionId: q.id })}
              status={statusByKey[keyFor({ kind: 'question', questionId: q.id })]}
              activeKey={activeKey}
              onStart={() => startRecording({ kind: 'question', questionId: q.id })}
              onStop={() => stopRecording({ kind: 'question', questionId: q.id })}
              onPlay={playAudio}
            />

            {q.options.map((o) => (
              <Row
                key={o.id}
                label={`گزینه: ${o.text ?? o.id}${o.id === q.correct_answer ? ' (درست)' : ''}`}
                audioUrl={o.audioUrl}
                statusKey={keyFor({ kind: 'option', questionId: q.id, optionId: o.id })}
                status={statusByKey[keyFor({ kind: 'option', questionId: q.id, optionId: o.id })]}
                activeKey={activeKey}
                onStart={() => startRecording({ kind: 'option', questionId: q.id, optionId: o.id })}
                onStop={() => stopRecording({ kind: 'option', questionId: q.id, optionId: o.id })}
                onPlay={playAudio}
              />
            ))}
          </div>
        ))}

        <div className="flex items-center justify-center gap-3 my-6">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-xl bg-gray-200 text-gray-600 disabled:opacity-40">صفحه قبل</button>
          <span className="text-sm text-gray-500">صفحه {page + 1}</span>
          <button onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl bg-gray-200 text-gray-600">صفحه بعد</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, audioUrl, statusKey, status, activeKey, onStart, onStop, onPlay }: {
  label: string;
  audioUrl?: string;
  statusKey: string;
  status?: 'recording' | 'uploading' | 'saved' | 'error';
  activeKey: string | null;
  onStart: () => void;
  onStop: () => void;
  onPlay: (url: string) => void;
}) {
  const isRecording = activeKey === statusKey;
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="flex-1 text-sm text-gray-700">{label}</span>
      <button
        onClick={() => isRecording ? onStop() : onStart()}
        disabled={!!activeKey && !isRecording}
        className={`w-9 h-9 rounded-full flex items-center justify-center text-base
          ${isRecording ? 'bg-red-500 text-white animate-pulse'
            : activeKey ? 'bg-gray-200 text-gray-400' : 'bg-violet-500 text-white active:scale-95'}`}
      >
        {isRecording ? '⏹' : '🎤'}
      </button>
      {audioUrl && (
        <button onClick={() => onPlay(audioUrl)}
          className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center active:scale-95">▶</button>
      )}
      {status === 'uploading' && <span className="text-xs text-amber-500">در حال آپلود...</span>}
      {status === 'error' && <span className="text-xs text-red-500">خطا</span>}
    </div>
  );
}
