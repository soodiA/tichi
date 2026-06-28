import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// All consonants with their curriculum ordinal
const CONSONANTS = [
  { letter: 'م', uid: 'mim', ord: 5 },
  { letter: 'س', uid: 'sin', ord: 6 },
  { letter: 'ت', uid: 'te', ord: 7 },
  { letter: 'ر', uid: 're', ord: 9 },
  { letter: 'ن', uid: 'noon', ord: 10 },
  { letter: 'ز', uid: 'ze', ord: 12 },
  { letter: 'ش', uid: 'shin', ord: 14 },
  { letter: 'ی', uid: 'ye', ord: 15 },
  { letter: 'ک', uid: 'kaf', ord: 17 },
  { letter: 'و', uid: 'vav', ord: 18 },
  { letter: 'پ', uid: 'pe', ord: 19 },
  { letter: 'گ', uid: 'gaf', ord: 20 },
  { letter: 'ف', uid: 'fe', ord: 21 },
  { letter: 'خ', uid: 'khe', ord: 22 },
  { letter: 'ق', uid: 'qaf', ord: 23 },
  { letter: 'ل', uid: 'lam', ord: 24 },
  { letter: 'ج', uid: 'jim', ord: 25 },
  { letter: 'ه', uid: 'he', ord: 27 },
  { letter: 'چ', uid: 'che', ord: 28 },
  { letter: 'ژ', uid: 'zhe', ord: 29 },
  { letter: 'ص', uid: 'sad', ord: 32 },
  { letter: 'ذ', uid: 'zal', ord: 33 },
  { letter: 'ع', uid: 'ein', ord: 34 },
  { letter: 'ث', uid: 'se', ord: 35 },
  { letter: 'ح', uid: 'he2', ord: 36 },
  { letter: 'ض', uid: 'zad', ord: 37 },
  { letter: 'ط', uid: 'ta2', ord: 38 },
  { letter: 'غ', uid: 'ghein', ord: 39 },
  { letter: 'ظ', uid: 'za2', ord: 40 },
];

// Vowel suffix and introduction ordinal
const VOWELS = [
  { key: 'aa',  suffix: 'ا',  label: 'آ',  introOrd: 1 },
  { key: 'fat', suffix: 'َ',  label: 'اَ', introOrd: 3 },
  { key: 'oo',  suffix: 'و',  label: 'او', introOrd: 8 },
  { key: 'ei',  suffix: 'ی',  label: 'ای', introOrd: 11 },
  { key: 'kas', suffix: 'ِ',  label: 'اِ', introOrd: 13 },
  { key: 'dam', suffix: 'ُ',  label: 'اُ', introOrd: 16 },
];

function comboText(letter: string, suffix: string) {
  return letter + suffix;
}

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
      const { data } = await supabase.storage.from('audio').list('combos');
      if (!data) return;
      const map: Record<string, ComboStatus> = {};
      data.forEach((f) => {
        const key = f.name.replace(/\.(webm|ogg|mp3|wav)$/, '');
        const { data: urlData } = supabase.storage.from('audio').getPublicUrl(`combos/${f.name}`);
        map[key] = { audioUrl: urlData.publicUrl, state: 'done' };
      });
      setStatuses(map);
    })();
  }, []);

  const startRecording = useCallback(async (storageKey: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr = new MediaRecorder(stream, { mimeType });
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
    const ext = blob.type.includes('webm') ? 'webm' : 'ogg';
    const path = `combos/${key}.${ext}`;

    setStatuses((prev) => ({ ...prev, [key]: { state: 'idle' } }));

    const { error } = await supabase.storage.from('audio').upload(path, blob, { upsert: true });
    if (error) {
      alert(`خطا در آپلود: ${error.message}`);
      return;
    }

    const { data: urlData } = supabase.storage.from('audio').getPublicUrl(path);
    const audioUrl = urlData.publicUrl;

    // Update all questions where media_label matches the combo text
    // Key format: "{uid}-{vowelKey}" e.g. "mim-aa"
    const [uid, vowelKey] = key.split('-');
    const consonant = CONSONANTS.find((c) => c.uid === uid);
    const vowel = VOWELS.find((v) => v.key === vowelKey);
    if (consonant && vowel) {
      const text = comboText(consonant.letter, vowel.suffix);
      await supabase.from('questions')
        .update({ question_audio_url: audioUrl })
        .eq('media_label', text);
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
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-2">ضبط صدای ترکیب‌ها</h1>
        <p className="text-gray-500 text-sm mb-4">
          روی میکروفن بزنید تا ضبط شروع شود، دوباره بزنید تا متوقف و ذخیره شود.
        </p>

        <input
          type="text"
          placeholder="فیلتر بر اساس حرف..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full mb-4 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-lg"
        />

        {filteredConsonants.map((c) => {
          const availableVowels = VOWELS.filter((v) => v.introOrd < c.ord);
          if (availableVowels.length === 0) return null;
          return (
            <div key={c.uid} className="mb-6">
              <h2 className="text-xl font-bold text-violet-700 mb-2">{c.letter} ({initForm(c.letter)})</h2>
              <div className="grid grid-cols-3 gap-2">
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
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all
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
                            className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center active:scale-95"
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
