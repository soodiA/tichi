import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { uploadVersioned, latestByKey } from '../lib/versionedUpload';

// The 32 letters of the Persian alphabet, standalone (not letter+vowel combos —
// see RecordCombos.tsx for those).
const LETTERS = [
  'ا', 'ب', 'پ', 'ت', 'ث', 'ج', 'چ', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'ژ', 'س', 'ش',
  'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'گ', 'ل', 'م', 'ن', 'و', 'ه', 'ی',
];

type RecordState = 'idle' | 'recording' | 'uploading' | 'done';
interface ClipStatus {
  audioUrl?: string;
  state: RecordState;
}

type Section = 'words' | 'letters';

const WordAudioRecorder: React.FC = () => {
  const [section, setSection] = useState<Section>('words');
  const [words, setWords] = useState<string[]>([]);
  const [loadingWords, setLoadingWords] = useState(true);
  const [filter, setFilter] = useState('');
  const [statuses, setStatuses] = useState<Record<string, ClipStatus>>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Distinct single-word media_label values from the questions table
  // (excludes comma-separated option lists like "آرد ، مَرد ، تَر ، دور ، دَر"
  // and short letter/combo labels already covered by RecordCombos).
  useEffect(() => {
    (async () => {
      setLoadingWords(true);
      const pageSize = 1000;
      const labels = new Set<string>();
      for (let offset = 0; ; offset += pageSize) {
        const { data } = await supabase
          .from('questions')
          .select('media_label')
          .not('media_label', 'is', null)
          .range(offset, offset + pageSize - 1);
        if (!data || data.length === 0) break;
        data.forEach((r) => {
          const label = (r as { media_label: string }).media_label;
          if (label && !label.includes('،') && !label.includes(',')) {
            const base = label.replace(/[ً-ْ]/g, ''); // strip diacritics
            if (base.length > 1) labels.add(label);
          }
        });
        if (data.length < pageSize) break;
      }
      setWords(Array.from(labels).sort());
      setLoadingWords(false);
    })();
  }, []);

  // Load already-recorded clips for both sections from storage.
  useEffect(() => {
    (async () => {
      const map: Record<string, ClipStatus> = {};
      for (const [folder] of [['words'], ['letters']] as const) {
        const { data } = await supabase.storage.from('audio').list(folder);
        if (!data) continue;
        const getPublicUrl = (path: string) => supabase.storage.from('audio').getPublicUrl(path).data.publicUrl;
        latestByKey(data, getPublicUrl, folder).forEach((v, name) => {
          map[`${folder}:${name}`] = { audioUrl: v.url, state: 'done' };
        });
      }
      setStatuses(map);
    })();
  }, []);

  const startRecording = useCallback(async (key: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr = new MediaRecorder(stream, { mimeType });
      chunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.start();
      mediaRecorder.current = mr;
      setActiveKey(key);
      setStatuses((prev) => ({ ...prev, [key]: { state: 'recording' } }));
    } catch {
      alert('دسترسی به میکروفن ممکن نیست');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorder.current || !activeKey) return;
    const key = activeKey;
    setActiveKey(null);

    await new Promise<void>((resolve) => {
      mediaRecorder.current!.onstop = () => resolve();
      mediaRecorder.current!.stop();
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());

    const blob = new Blob(chunks.current, { type: mediaRecorder.current.mimeType });
    const [folder, text] = key.split(':');

    setStatuses((prev) => ({ ...prev, [key]: { state: 'uploading' } }));

    const { url: audioUrl, error } = await uploadVersioned(folder, text, blob);
    if (error || !audioUrl) {
      alert(`خطا در آپلود: ${error}`);
      setStatuses((prev) => ({ ...prev, [key]: { state: 'idle' } }));
      return;
    }

    if (folder === 'words') {
      await supabase.from('questions').update({ question_audio_url: audioUrl }).eq('media_label', text);
    }

    setStatuses((prev) => ({ ...prev, [key]: { audioUrl, state: 'done' } }));
  }, [activeKey]);

  const playAudio = (url: string) => new Audio(url).play().catch(() => {});

  const filteredWords = filter.trim() ? words.filter((w) => w.includes(filter.trim())) : words;
  const recordedWordCount = words.filter((w) => statuses[`words:${w}`]).length;
  const recordedLetterCount = LETTERS.filter((l) => statuses[`letters:${l}`]).length;

  const renderCard = (folder: Section, text: string, sub?: string) => {
    const key = `${folder}:${text}`;
    const status = statuses[key] ?? { state: 'idle' as const };
    const isRecording = activeKey === key;
    const isUploading = status.state === 'uploading';
    return (
      <div key={key}
        className={`rounded-2xl border-2 p-3 flex flex-col items-center gap-2
          ${isRecording ? 'border-red-400 bg-red-50' :
            status.state === 'done' ? 'border-emerald-400 bg-emerald-50' :
            'border-gray-200 bg-white'}`}
      >
        <span className="text-2xl md:text-3xl font-extrabold text-gray-800">{text}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
        <div className="flex gap-2">
          <button
            onClick={() => (isRecording ? stopRecording() : startRecording(key))}
            disabled={(!!activeKey && !isRecording) || isUploading}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all
              ${isRecording ? 'bg-red-500 text-white animate-pulse'
                : activeKey || isUploading ? 'bg-gray-200 text-gray-400'
                : 'bg-violet-500 text-white active:scale-95'}`}
          >
            {isRecording ? '⏹' : '🎤'}
          </button>
          {status.audioUrl && (
            <button onClick={() => playAudio(status.audioUrl!)}
              className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center active:scale-95">
              ▶
            </button>
          )}
        </div>
        {isUploading && <span className="text-xs text-violet-500">در حال آپلود...</span>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-none w-full">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-2">ضبط صدای کلمات و حروف</h1>
        <p className="text-gray-500 text-sm md:text-base mb-4">
          روی میکروفن بزنید تا ضبط شروع شود، دوباره بزنید تا متوقف و ذخیره شود.
        </p>

        <div className="flex gap-2 mb-4 max-w-md">
          <button onClick={() => setSection('words')}
            className={`flex-1 py-3 rounded-xl text-base font-bold border-2 ${section === 'words' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            کلمات ({recordedWordCount}/{words.length})
          </button>
          <button onClick={() => setSection('letters')}
            className={`flex-1 py-3 rounded-xl text-base font-bold border-2 ${section === 'letters' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            ۳۲ حرف الفبا ({recordedLetterCount}/{LETTERS.length})
          </button>
        </div>

        {section === 'words' && (
          <>
            <input
              type="text"
              placeholder="فیلتر کلمات..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full max-w-md mb-4 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 text-lg"
            />
            {loadingWords ? (
              <p className="text-sm text-gray-400">در حال بارگذاری کلمات...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {filteredWords.map((w) => renderCard('words', w))}
              </div>
            )}
          </>
        )}

        {section === 'letters' && (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {LETTERS.map((l) => renderCard('letters', l))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WordAudioRecorder;
