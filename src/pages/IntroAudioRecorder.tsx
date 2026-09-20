import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadVersioned, latestByKey } from '../lib/versionedUpload';
import { buildScenes, introClipKey, type Scene } from '../components/questions/UnitIntroGeneric';
import { UNIT_INTROS } from '../data/unitIntros';

const LETTERS = Object.keys(UNIT_INTROS);

const IntroAudioRecorder: React.FC = () => {
  const [activeLetter, setActiveLetter] = useState(LETTERS[0]);
  const [activeScene, setActiveScene] = useState(0);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clips, setClips] = useState<Record<string, { url: string }>>({});
  const [loadingClips, setLoadingClips] = useState(true);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);

  const scenes: Scene[] = buildScenes(UNIT_INTROS[activeLetter]);

  const loadClips = async () => {
    setLoadingClips(true);
    const { data } = await supabase.storage.from('audio').list('intro');
    const getPublicUrl = (path: string) => supabase.storage.from('audio').getPublicUrl(path).data.publicUrl;
    const latest = latestByKey(data ?? [], getPublicUrl, 'intro');
    const map: Record<string, { url: string }> = {};
    latest.forEach((v, key) => { map[key] = { url: v.url }; });
    setClips(map);
    setLoadingClips(false);
  };

  useEffect(() => { loadClips(); }, []);

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
    const key = introClipKey(activeLetter, activeScene);
    setRecording(false);
    await new Promise<void>((resolve) => { mr.onstop = () => resolve(); mr.stop(); });
    streamRef.current?.getTracks().forEach((tr) => tr.stop());

    const blob = new Blob(chunksRef.current, { type: mr.mimeType });

    setUploading(true);
    const { url, error } = await uploadVersioned('intro', key, blob);
    setUploading(false);
    if (error || !url) {
      alert(`خطا در آپلود: ${error}`);
      return;
    }
    setClips((prev) => ({ ...prev, [key]: { url } }));
  };

  const activeKey = introClipKey(activeLetter, activeScene);
  const scene = scenes[activeScene];
  const recordedCount = scenes.filter((s) => !!clips[introClipKey(activeLetter, s.id)]).length;

  return (
    <div dir="rtl" className="min-h-screen bg-violet-50 flex flex-col items-center p-4 gap-4 pb-10">
      <h1 className="text-xl font-bold text-violet-800">ضبط صدای اینترو واحدها</h1>
      <p className="text-xs text-gray-500 text-center max-w-sm">
        برای هر حرف، صحنه‌های اینترو رو یکی‌یکی انتخاب کن و صداتو ضبط کن. همون صدا به‌جای صدای رباتی پخش میشه و اینترو منتظر تموم‌شدنش می‌مونه.
      </p>

      <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
        {LETTERS.map((l) => (
          <button
            key={l}
            onClick={() => { setActiveLetter(l); setActiveScene(0); }}
            className={`w-11 h-11 rounded-xl text-lg font-bold border-2 transition-all
              ${l === activeLetter ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-700 border-violet-200'}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {scenes.map((s) => {
          const key = introClipKey(activeLetter, s.id);
          const done = !!clips[key];
          return (
            <button
              key={s.id}
              onClick={() => setActiveScene(s.id)}
              className={`py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all relative
                ${s.id === activeScene ? 'bg-violet-600 text-white border-violet-600'
                  : done ? 'bg-green-100 text-green-800 border-green-400'
                  : 'bg-white text-gray-700 border-violet-200'}`}
            >
              صحنه {s.id + 1}
              {done && s.id !== activeScene && <span className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 rounded-full" />}
            </button>
          );
        })}
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border-2 border-violet-200 p-4 flex flex-col gap-3">
        <p className="text-sm text-gray-500">حرف: <strong className="text-violet-700">{activeLetter}</strong> — صحنه {activeScene + 1} از {scenes.length}</p>
        <p className="text-base font-bold text-violet-800">{scene.title}</p>
        {scene.subtitle && <p className="text-sm text-gray-600">{scene.subtitle}</p>}
        <p className="text-xs text-gray-400">متن پیشنهادی: «{scene.speak}»</p>

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

        {uploading && <p className="text-sm text-violet-500">در حال آپلود...</p>}

        {!loadingClips && clips[activeKey] && !uploading && (
          <div className="flex flex-col gap-2 items-center">
            <audio src={clips[activeKey].url} controls className="w-full" />
            <p className="text-xs text-green-600">✓ ذخیره شد</p>
          </div>
        )}
      </div>

      {!loadingClips && (
        <p className="text-xs text-gray-500 text-center max-w-sm">
          ضبط‌شده‌های این حرف: {recordedCount} از {scenes.length}
        </p>
      )}
    </div>
  );
};

export default IntroAudioRecorder;
