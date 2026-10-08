import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadVersioned, getLatestUrls } from '../lib/versionedUpload';
import { pickRecordingMimeType } from '../lib/recordingFormat';
import { CONSONANTS, VOWELS, comboText } from '../lib/combos';

const NON_CONNECTING = new Set('رزژدذواآ');
function initForm(letter: string) {
  return NON_CONNECTING.has(letter) ? letter : letter + 'ـ';
}

type RecordState = 'idle' | 'recording' | 'done';

interface ComboStatus {
  audioUrl?: string;
  state: RecordState;
}

export default function RecordCombos() {
  const [statuses, setStatuses] = useState<Record<string, ComboStatus>>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Load existing audio URLs from Supabase storage
  useEffect(() => {
    (async () => {
      const keys = CONSONANTS.flatMap((c) => VOWELS.map((v) => `${c.uid}-${v.key}`));
      const found = await getLatestUrls('combos', keys);
      const map: Record<string, ComboStatus> = {};
      found.forEach((url, key) => { map[key] = { audioUrl: url, state: 'done' }; });
      // Merge: don't clobber anything recorded while the lookup was running.
      setStatuses((prev) => ({ ...map, ...prev }));
    })();
  }, []);

  const startRecording = useCallback(async (storageKey: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mimeType } = pickRecordingMimeType();
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.start();
      mediaRecorder.current = mr;
      setActiveKey(storageKey);
      setStatuses((prev) => ({ ...prev, [storageKey]: { state: 'recording' } }));
    } catch (err) {
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

    setStatuses((prev) => ({ ...prev, [key]: { state: 'idle' } }));

    const { url: audioUrl, error } = await uploadVersioned('combos', key, blob);
    if (error || !audioUrl) {
      alert(`خطا در آپلود: ${error}`);
      return;
    }

    setStatuses((prev) => ({ ...prev, [key]: { audioUrl, state: 'done' } }));
  }, [activeKey]);

  const playAudio = (url: string) => {
    new Audio(url).play().catch(() => {});
  };

  const filterLower = filter.trim();
  const filteredConsonants = filterLower
    ? CONSONANTS.filter((c) => c.letter === filterLower || c.uid.includes(filterLower))
    : CONSONANTS;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-none w-full">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-2">ضبط صدای ترکیب‌ها</h1>
        <p className="text-gray-500 text-sm md:text-base mb-4">
          روی میکروفن بزنید تا ضبط شروع شود، دوباره بزنید تا متوقف و ذخیره شود.
        </p>

        <input
          type="text"
          placeholder="فیلتر بر اساس حرف..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-md mb-4 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 text-lg"
        />

        {filteredConsonants.map((c) => {
          const availableVowels = VOWELS.filter((v) => v.introOrd < c.ord);
          if (availableVowels.length === 0) return null;
          return (
            <div key={c.uid} className="mb-6">
              <h2 className="text-xl font-bold text-violet-700 mb-2">{c.letter} ({initForm(c.letter)})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {availableVowels.map((v) => {
                  const combo = comboText(c.letter, v.suffix);
                  const storageKey = `${c.uid}-${v.key}`;
                  const status = statuses[storageKey] ?? { state: 'idle' };
                  const isRecording = activeKey === storageKey;

                  return (
                    <div key={storageKey}
                      className={`rounded-2xl border-2 p-3 flex flex-col items-center gap-2
                        ${isRecording ? 'border-red-400 bg-red-50' :
                          status.state === 'done' ? 'border-emerald-400 bg-emerald-50' :
                          'border-gray-200 bg-white'}`}
                    >
                      <span className="text-3xl font-extrabold text-gray-800">{combo}</span>
                      <span className="text-xs text-gray-400">{v.label}</span>

                      <div className="flex gap-2">
                        {/* Record / Stop button */}
                        <button
                          onClick={() => isRecording ? stopRecording() : startRecording(storageKey)}
                          disabled={!!activeKey && !isRecording}
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all
                            ${isRecording
                              ? 'bg-red-500 text-white animate-pulse'
                              : activeKey
                              ? 'bg-gray-200 text-gray-400'
                              : 'bg-violet-500 text-white active:scale-95'
                            }`}
                        >
                          {isRecording ? '⏹' : '🎤'}
                        </button>

                        {/* Play button (if recorded) */}
                        {status.audioUrl && (
                          <button
                            onClick={() => playAudio(status.audioUrl!)}
                            className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center active:scale-95"
                          >
                            ▶
                          </button>
                        )}
                      </div>

                      {status.state === 'done' && !status.audioUrl && (
                        <span className="text-xs text-emerald-600">در حال آپلود...</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
