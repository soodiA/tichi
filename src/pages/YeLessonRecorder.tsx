import React, { useEffect, useRef, useState } from 'react';
import { uploadVersioned, getLatestUrls } from '../lib/versionedUpload';
import { YE_WORDS, YE_RULE, YE_PAGE_COUNT, yeClipKey } from '../data/yeWords';

// Records Soodeh's narration for each page of the "بیا" lesson on the ی section.
// Page 0 = the rule page, pages 1.. = one per word. A recorded page narration replaces the
// automatic part-by-part reading on that page.
const pageTitle = (i: number) => (i === 0 ? 'صفحهٔ قاعده' : YE_WORDS[i - 1].word);
const pageHint = (i: number) =>
  i === 0 ? YE_RULE : `${YE_WORDS[i - 1].parts.join(' + ')} = ${YE_WORDS[i - 1].word}`;

const YeLessonRecorder: React.FC = () => {
  const [active, setActive] = useState(0);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clips, setClips] = useState<Record<string, string>>({});
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    const keys = Array.from({ length: YE_PAGE_COUNT }, (_, i) => yeClipKey(i));
    getLatestUrls('intro', keys).then((m) => {
      const o: Record<string, string> = {};
      m.forEach((u, k) => { o[k] = u; });
      setClips(o);
    }).catch(() => {});
  }, []);

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr = new MediaRecorder(s, { mimeType });
      chunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.start();
      mrRef.current = mr;
      setRecording(true);
    } catch {
      alert('دسترسی به میکروفون ممکن نشد');
    }
  };

  const stop = async () => {
    const mr = mrRef.current;
    if (!mr) return;
    const key = yeClipKey(active);
    setRecording(false);
    await new Promise<void>((resolve) => { mr.onstop = () => resolve(); mr.stop(); });
    stream.current?.getTracks().forEach((t) => t.stop());
    setUploading(true);
    const { url, error } = await uploadVersioned('intro', key, new Blob(chunks.current, { type: mr.mimeType }));
    setUploading(false);
    if (error || !url) { alert(`خطا در آپلود: ${error}`); return; }
    setClips((p) => ({ ...p, [key]: url }));
  };

  const key = yeClipKey(active);
  const done = Object.keys(clips).length;

  return (
    <div dir="rtl" className="min-h-screen bg-rose-50 flex flex-col items-center p-4 gap-4 pb-10">
      <h1 className="text-xl font-bold text-rose-800">ضبط صدای درس «بیا» (بخش ی)</h1>
      <p className="text-xs text-gray-500 text-center max-w-sm">
        برای هر صفحه یک صدا ضبط کن. این صدا جای خواندن خودکار آن صفحه پخش می‌شود. اگر صدایی ضبط نکنی، صفحه همان‌طور که هست خوانده می‌شود.
      </p>
      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {Array.from({ length: YE_PAGE_COUNT }, (_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`py-2 px-3 rounded-xl text-sm font-bold border-2 relative ${i === active ? 'bg-rose-600 text-white border-rose-600' : clips[yeClipKey(i)] ? 'bg-green-100 text-green-800 border-green-400' : 'bg-white text-gray-700 border-rose-200'}`}
          >
            {pageTitle(i)}
          </button>
        ))}
      </div>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border-2 border-rose-200 p-4 flex flex-col gap-3">
        <p className="text-base font-bold text-rose-800">{pageTitle(active)}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{pageHint(active)}</p>
        <div className="flex gap-3 justify-center mt-2">
          {!recording ? (
            <button onClick={start} disabled={uploading} className="bg-red-500 text-white font-bold py-3 px-6 rounded-2xl active:scale-95 disabled:opacity-50">⏺ شروع ضبط</button>
          ) : (
            <button onClick={stop} className="bg-gray-700 text-white font-bold py-3 px-6 rounded-2xl active:scale-95">⏹ توقف</button>
          )}
        </div>
        {uploading && <p className="text-sm text-rose-500">در حال آپلود...</p>}
        {clips[key] && !uploading && (
          <div className="flex flex-col gap-2 items-center">
            <audio src={clips[key]} controls className="w-full" />
            <p className="text-xs text-green-600">✓ ذخیره شد</p>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500">ضبط‌شده: {done} از {YE_PAGE_COUNT}</p>
    </div>
  );
};

export default YeLessonRecorder;
