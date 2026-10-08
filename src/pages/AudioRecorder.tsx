import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadVersioned } from '../lib/versionedUpload';
import { QUESTION_TYPE_PROMPT, AUDIO_PICTURE_END_KEY } from '../lib/questionTypeAudio';
import { TYPE_LABELS, ALL_TYPES } from '../lib/questionTypes';
import type { QuestionType } from '../types';

// One recording slot per question type, plus a second slot for the audio_picture
// "end" phrasing (its spoken prompt differs from the "start" one).
type SlotKey = QuestionType | typeof AUDIO_PICTURE_END_KEY;
const END_FILTER = 'question_text.ilike.%آخر%,question_text.ilike.%ختم%'; // keep in sync with isAudioPictureEnd
const SLOTS: SlotKey[] = ALL_TYPES.flatMap((t) => (t === 'audio_picture' ? [t, AUDIO_PICTURE_END_KEY] : [t]));
const SLOT_LABELS: Record<string, string> = {
  ...TYPE_LABELS,
  audio_picture: 'صدا + عکس (شروع: «با این صدا شروع میشه»)',
  [AUDIO_PICTURE_END_KEY]: 'صدا + عکس (آخر: «صدای آخر شبیه این صداست»)',
};
const SLOT_PROMPT: Partial<Record<string, string>> = {
  ...QUESTION_TYPE_PROMPT,
  audio_picture: 'کدام یکی با این صدا شروع می‌شود؟',
  [AUDIO_PICTURE_END_KEY]: 'صدای آخر کدام یکی شبیه این صداست؟',
};
const slotType = (k: SlotKey): QuestionType => (k === AUDIO_PICTURE_END_KEY ? 'audio_picture' : k);
// Narrows a questions query to the rows that belong to a slot.
const forSlot = <Q extends { eq: any; or: any; not: any }>(q: Q, k: SlotKey): Q => {
  const base = q.eq('type', slotType(k));
  if (k === AUDIO_PICTURE_END_KEY) return base.or(END_FILTER);
  if (k === 'audio_picture') return base.not('question_text', 'ilike', '%آخر%').not('question_text', 'ilike', '%ختم%');
  return base;
};

interface ExampleRow {
  type: QuestionType;
  question_text: string;
  node_id: string;
}

const AudioRecorder: React.FC = () => {
  const [examples, setExamples] = useState<Partial<Record<SlotKey, ExampleRow>>>({});
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<SlotKey>(SLOTS[0]);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clips, setClips] = useState<Partial<Record<SlotKey, { url: string; count: number }>>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    (async () => {
      const found: Partial<Record<SlotKey, ExampleRow>> = {};
      const clipsFound: Partial<Record<SlotKey, { url: string; count: number }>> = {};
      for (const t of SLOTS) {
        const { data } = await forSlot(supabase
          .from('questions')
          .select('type, question_text, node_id, question_audio_url'), t)
          .order('id', { ascending: true })
          .limit(1);
        if (data && data.length > 0) {
          found[t] = data[0] as ExampleRow;
          const url = (data[0] as { question_audio_url?: string }).question_audio_url;
          // End rows used to share the start recording; that doesn't count as recorded.
          const isEndClip = url?.includes('/audio/types/YXVkaW9fcGljdHVyZV9lbmQ');
          if (url && (t !== AUDIO_PICTURE_END_KEY || isEndClip) && !(t === 'audio_picture' && isEndClip)) clipsFound[t] = { url, count: 0 };
        }
      }
      setExamples(found);
      setClips(clipsFound);
      setLoading(false);
    })();
  }, []);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
    const mr = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecording(true);
  };

  const stopRecording = async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    const t = activeType;
    setRecording(false);
    await new Promise<void>((resolve) => { mr.onstop = () => resolve(); mr.stop(); });
    streamRef.current?.getTracks().forEach(tr => tr.stop());

    const blob = new Blob(chunksRef.current, { type: mr.mimeType });

    setUploading(true);
    const { url, error: upErr } = await uploadVersioned('types', t, blob);
    if (upErr || !url) {
      alert(`خطا در آپلود: ${upErr}`);
      setUploading(false);
      return;
    }

    // Every question of this type shares the same recorded prompt.
    const { error: updErr } = await forSlot(supabase
      .from('questions')
      .update({ question_audio_url: url }), t);
    setUploading(false);
    if (updErr) {
      alert(`فایل آپلود شد ولی وصل کردنش به سوال‌ها خطا داد: ${updErr.message}`);
      return;
    }
    setClips(prev => ({ ...prev, [t]: { url, count: 0 } }));
  };

  const activeExample = examples[activeType];
  const activePrompt = SLOT_PROMPT[activeType];
  const recordedTypes = SLOTS.filter(t => !!clips[t]);

  return (
    <div dir="rtl" className="min-h-screen bg-violet-50 flex flex-col items-center p-4 gap-4 pb-10">
      <h1 className="text-xl font-bold text-violet-800">ضبط صدای مشترک برای هر نوع سوال</h1>
      <p className="text-xs text-gray-500 text-center max-w-sm">
        برای هر نوع سوال، یک نمونه از دیتابیس نشون داده میشه (فقط برای مرجع). صدایی که ضبط می‌کنی برای همه‌ی سوال‌های اون نوع استفاده میشه.
      </p>

      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {SLOTS.map(t => (
          <button key={t} onClick={() => setActiveType(t)}
            className={`py-2 px-3 rounded-xl text-sm font-bold border-2 transition-all relative
              ${t === activeType ? 'bg-violet-600 text-white border-violet-600'
                : clips[t] ? 'bg-green-100 text-green-800 border-green-400'
                : 'bg-white text-gray-700 border-violet-200'}`}>
            {SLOT_LABELS[t]}
            {clips[t] && t !== activeType && (
              <span className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border-2 border-violet-200 p-4 flex flex-col gap-3">
        <p className="text-sm text-gray-500">نوع: <strong className="text-violet-700">{SLOT_LABELS[activeType]}</strong></p>

        {loading ? (
          <p className="text-sm text-gray-400">در حال بارگذاری نمونه...</p>
        ) : activeExample ? (
          <p className="text-sm text-gray-600">نمونه از دیتابیس: «{activeExample.question_text}»</p>
        ) : (
          <p className="text-sm text-amber-600">هیچ سوالی از این نوع در دیتابیس پیدا نشد.</p>
        )}

        {activePrompt && (
          <p className="text-base font-bold text-violet-800">پیشنهاد متن عمومی: «{activePrompt}»</p>
        )}

        <div className="flex gap-3 justify-center mt-2">
          {!recording ? (
            <button onClick={startRecording} className="bg-red-500 text-white font-bold py-3 px-6 rounded-2xl active:scale-95">
              ⏺ شروع ضبط
            </button>
          ) : (
            <button onClick={stopRecording} className="bg-gray-700 text-white font-bold py-3 px-6 rounded-2xl active:scale-95">
              ⏹ توقف
            </button>
          )}
        </div>

        {uploading && <p className="text-sm text-violet-500">در حال آپلود و وصل کردن به سوال‌ها...</p>}

        {clips[activeType] && !uploading && (
          <div className="flex flex-col gap-2 items-center">
            <audio src={clips[activeType]!.url} controls className="w-full" />
            <p className="text-xs text-green-600">✓ ذخیره شد و به همه‌ی سوال‌های این نوع وصل شد</p>
          </div>
        )}
      </div>

      {recordedTypes.length > 0 && (
        <p className="text-xs text-gray-500 text-center max-w-sm">
          ضبط‌شده‌ها ({recordedTypes.length} از {SLOTS.length}): {recordedTypes.map(t => SLOT_LABELS[t]).join('، ')}
        </p>
      )}
    </div>
  );
};

export default AudioRecorder;
