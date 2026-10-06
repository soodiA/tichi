import React, { useEffect, useState } from 'react';
import { uploadVersioned, getLatestUrls } from '../lib/versionedUpload';
import { buildScenes, introClipKey, type Scene } from '../components/questions/UnitIntroGeneric';
import { UNIT_INTROS } from '../data/unitIntros';
import { loadIntroConfig, saveIntroConfig, applyIntroConfig, type IntroConfig, type SceneOverride } from '../lib/introConfig';

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

  const baseScenes: Scene[] = buildScenes(UNIT_INTROS[activeLetter]);
  const [cfg, setCfg] = useState<IntroConfig>({});
  const [cfgDirty, setCfgDirty] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const scenes: Scene[] = applyIntroConfig(baseScenes, cfg);

  useEffect(() => {
    let cancelled = false;
    setCfg({});
    setCfgDirty(false);
    loadIntroConfig(activeLetter).then((c) => { if (!cancelled) setCfg(c); });
    return () => { cancelled = true; };
  }, [activeLetter]);

  const patchScene = (id: number, patch: SceneOverride) => {
    setCfg((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setCfgDirty(true);
  };

  const resetScene = (id: number) => {
    setCfg((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setCfgDirty(true);
  };

  const saveCfg = async () => {
    setSavingCfg(true);
    const err = await saveIntroConfig(activeLetter, cfg);
    setSavingCfg(false);
    if (err) { alert(`خطا در ذخیره: ${err}`); return; }
    setCfgDirty(false);
  };

  const uploadImage = async (file: File) => {
    setImgUploading(true);
    const { url, error } = await uploadVersioned('introimg', introClipKey(activeLetter, activeScene), file);
    setImgUploading(false);
    if (error || !url) { alert(`خطا در آپلود تصویر: ${error}`); return; }
    patchScene(activeScene, { imageUrl: url });
  };

  const loadClips = async () => {
    setLoadingClips(true);
    const keys = LETTERS.flatMap((l) => buildScenes(UNIT_INTROS[l]).map((s) => introClipKey(l, s.id)));
    const found = await getLatestUrls('intro', keys);
    const map: Record<string, { url: string }> = {};
    found.forEach((url, key) => { map[key] = { url }; });
    setClips((prev) => ({ ...map, ...prev }));
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

        <div className="border-t border-violet-100 pt-3 flex flex-col gap-2">
          <p className="text-sm font-bold text-violet-800">ویرایش متن و تصویر این صحنه</p>
          <label className="text-xs text-gray-500">عنوان
            <input value={scene.title} onChange={(e) => patchScene(activeScene, { title: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800" />
          </label>
          <label className="text-xs text-gray-500">زیرعنوان
            <input value={scene.subtitle ?? ''} onChange={(e) => patchScene(activeScene, { subtitle: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800" />
          </label>
          <label className="text-xs text-gray-500">متنی که خوانده می‌شود (وقتی صدایی ضبط نشده)
            <input value={scene.speak} onChange={(e) => patchScene(activeScene, { speak: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800" />
          </label>
          <div className="flex gap-2">
            <label className="text-xs text-gray-500 flex-1">اموجی
              <input value={scene.emoji ?? ''} onChange={(e) => patchScene(activeScene, { emoji: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-lg text-gray-800" />
            </label>
            <label className="text-xs text-gray-500 flex-1">کلمه / حرف بزرگ
              <input value={scene.word ?? ''} onChange={(e) => patchScene(activeScene, { word: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-lg text-gray-800" />
            </label>
          </div>
          <div className="flex items-center gap-3">
            {scene.imageUrl && <img src={scene.imageUrl} alt="" className="w-16 h-16 object-contain rounded-lg border border-gray-200" />}
            <label className="text-xs font-bold text-violet-700 bg-violet-100 rounded-lg py-2 px-3 cursor-pointer">
              {imgUploading ? 'در حال آپلود...' : scene.imageUrl ? 'تغییر تصویر' : 'انتخاب تصویر'}
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }} />
            </label>
            {scene.imageUrl && (
              <button onClick={() => patchScene(activeScene, { imageUrl: '' })} className="text-xs text-red-500 font-bold">حذف تصویر</button>
            )}
          </div>
          <p className="text-[11px] text-gray-400">اگه تصویر بذاری به‌جای اموجی نشون داده میشه.</p>
          <div className="flex gap-2 mt-1">
            <button onClick={saveCfg} disabled={!cfgDirty || savingCfg}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold disabled:bg-gray-300">
              {savingCfg ? 'در حال ذخیره...' : cfgDirty ? 'ذخیره‌ی تغییرات واحد' : 'ذخیره شد ✓'}
            </button>
            <button onClick={() => resetScene(activeScene)} disabled={!cfg[activeScene]}
              className="py-2.5 px-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold disabled:opacity-40">بازگشت به پیش‌فرض</button>
          </div>
        </div>

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
