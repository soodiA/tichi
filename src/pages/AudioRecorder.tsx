import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { QUESTION_TYPE_PROMPT } from '../lib/questionTypeAudio';
import type { QuestionType } from '../types';

const TYPE_LABELS: Record<QuestionType, string> = {
  audio_picture: 'صدا + عکس',
  syllable_count: 'شمردن بخش (عدد)',
  flower_count: 'شمردن بخش (گل)',
  record: 'تکرار تلفظ',
  fill_blanks: 'پر کردن جای خالی',
  handwriting: 'دستخط',
  audio_options: 'انتخاب صدای درست',
  sentence_complete: 'تکمیل جمله',
  arrange: 'چیدن کلمات',
  similar_letters: 'حروف شبیه هم',
  phoneme: 'صداکشی',
  middle_blank: 'جای خالی وسط جمله',
  sound_to_text: 'صدا به نوشتار',
  color_letter: 'رنگ کردن حرف',
  pair_match: 'جفت‌یابی',
};

const ALL_TYPES = Object.keys(TYPE_LABELS) as QuestionType[];

interface ExampleRow {
  type: QuestionType;
  question_text: string;
  node_id: string;
}

const AudioRecorder: React.FC = () => {
  const [examples, setExamples] = useState<Partial<Record<QuestionType, ExampleRow>>>({});
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<QuestionType>(ALL_TYPES[0]);
  const [recording, setRecording] = useState(false);
  const [clips, setClips] = useState<Partial<Record<QuestionType, { url: string; blob: Blob }>>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    (async () => {
      const found: Partial<Record<QuestionType, ExampleRow>> = {};
      for (const t of ALL_TYPES) {
        const { data } = await supabase
          .from('questions')
          .select('type, question_text, node_id')
          .eq('type', t)
          .order('id', { ascending: true })
          .limit(1);
        if (data && data.length > 0) found[t] = data[0] as ExampleRow;
      }
      setExamples(found);
      setLoading(false);
    })();
  }, []);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setClips(prev => ({ ...prev, [activeType]: { url, blob } }));
      stream.getTracks().forEach(tr => tr.stop());
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const download = (t: QuestionType) => {
    const clip = clips[t];
    if (!clip) return;
    const a = document.createElement('a');
    a.href = clip.url;
    a.download = `${t}.webm`;
    a.click();
  };

  const activeExample = examples[activeType];
  const activePrompt = QUESTION_TYPE_PROMPT[activeType];
  const recordedTypes = ALL_TYPES.filter(t => !!clips[t]);

  return (
    <div dir="rtl" className="min-h-screen bg-violet-50 flex flex-col items-center p-4 gap-4 pb-10">
      <h1 className="text-xl font-bold text-violet-800">ضبط صدای مشترک برای هر نوع سوال</h1>
      <p className="text-xs text-gray-500 text-center max-w-sm">
        برای هر نوع سوال، یک نمونه از دیتابیس نشون داده میشه (فقط برای مرجع). صدایی که ضبط می‌کنی برای همه‌ی سوال‌های اون نوع استفاده میشه.
      </p>

      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {ALL_TYPES.map(t => (
          <button key={t} onClick={() => setActiveType(t)}
            className={`py-2 px-3 rounded-xl text-sm font-bold border-2 transition-all relative
              ${t === activeType ? 'bg-violet-600 text-white border-violet-600'
                : clips[t] ? 'bg-green-100 text-green-800 border-green-400'
                : 'bg-white text-gray-700 border-violet-200'}`}>
            {TYPE_LABELS[t]}
            {clips[t] && t !== activeType && (
              <span className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border-2 border-violet-200 p-4 flex flex-col gap-3">
        <p className="text-sm text-gray-500">نوع: <strong className="text-violet-700">{TYPE_LABELS[activeType]}</strong></p>

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

        {clips[activeType] && (
          <div className="flex flex-col gap-2 items-center">
            <audio src={clips[activeType]!.url} controls className="w-full" />
            <button onClick={() => download(activeType)} className="bg-violet-600 text-white font-bold py-2 px-4 rounded-xl text-sm active:scale-95">
              ⬇ دانلود فایل ({activeType}.webm)
            </button>
          </div>
        )}
      </div>

      {recordedTypes.length > 0 && (
        <p className="text-xs text-gray-500 text-center max-w-sm">
          ضبط‌شده‌ها ({recordedTypes.length} از {ALL_TYPES.length}): {recordedTypes.map(t => TYPE_LABELS[t]).join('، ')}
          <br />
          هر فایل رو دانلود کن و همینجا تو تلگرام برام بفرست تا وصلش کنم به برنامه.
        </p>
      )}
    </div>
  );
};

export default AudioRecorder;
