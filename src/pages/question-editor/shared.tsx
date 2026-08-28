import React, { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Option } from '../../types';

export async function uploadToStorage(prefix: string, file: Blob, ext: string): Promise<string> {
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('audio').upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from('audio').getPublicUrl(path).data.publicUrl;
}

export const genOptionId = () => `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs font-bold text-gray-500">{label}</span>
    {children}
  </label>
);

export const TextInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <input
    type="text"
    dir="rtl"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full px-3 py-2 rounded-xl border-2 border-violet-200 text-gray-800 focus:outline-none focus:border-violet-500"
  />
);

export const NumberInput: React.FC<{ value: number | ''; onChange: (v: number | '') => void }> = ({ value, onChange }) => (
  <input
    type="number"
    value={value}
    onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
    className="w-24 px-3 py-2 rounded-xl border-2 border-violet-200 text-gray-800 focus:outline-none focus:border-violet-500"
  />
);

// Upload-or-paste-URL widget for a single image, shared across all option/media image fields.
export const ImageField: React.FC<{ value?: string; onChange: (url: string) => void; storagePrefix: string }> = ({ value, onChange, storagePrefix }) => {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const url = await uploadToStorage(storagePrefix, file, ext);
      onChange(url);
    } catch (e) {
      alert(`خطا در آپلود عکس: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {value && (
        <img src={value} alt="" className="w-10 h-10 object-contain rounded-lg border border-gray-200 bg-white" />
      )}
      <input
        type="text"
        dir="ltr"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="آدرس عکس یا ایموجی"
        className="flex-1 px-3 py-2 rounded-xl border-2 border-violet-200 text-gray-800 text-sm focus:outline-none focus:border-violet-500"
      />
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
        className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center text-lg active:scale-95 disabled:opacity-40">
        {busy ? '…' : '📷'}
      </button>
    </div>
  );
};

// Record-or-upload widget for a single audio clip.
export const AudioField: React.FC<{ value?: string; onChange: (url: string) => void; storagePrefix: string }> = ({ value, onChange, storagePrefix }) => {
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (blob: Blob, ext: string) => {
    setBusy(true);
    try {
      const url = await uploadToStorage(storagePrefix, blob, ext);
      onChange(url);
    } catch (e) {
      alert(`خطا در آپلود صدا: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
    const mr = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: mr.mimeType });
      upload(blob, blob.type.includes('webm') ? 'webm' : 'ogg');
    };
    mr.start();
    mrRef.current = mr;
    setRecording(true);
  };

  const stopRecording = () => {
    mrRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="flex items-center gap-2">
      {value && <audio src={value} controls className="h-9 flex-1" />}
      {!value && <span className="flex-1 text-xs text-gray-400">صدایی انتخاب نشده</span>}
      <input ref={fileRef} type="file" accept="audio/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, f.name.split('.').pop() || 'mp3'); }} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || recording}
        className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center text-lg active:scale-95 disabled:opacity-40">
        ⬆
      </button>
      <button type="button" onClick={recording ? stopRecording : startRecording} disabled={busy}
        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg active:scale-95 disabled:opacity-40 ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-violet-100 text-violet-600'}`}>
        {recording ? '⏹' : '🎤'}
      </button>
    </div>
  );
};

interface OptionFieldsConfig {
  text?: boolean;
  image?: boolean;
  audio?: boolean;
  pairKey?: boolean;
}

// Generic add/remove/edit list of Option rows, used by most option-based question types.
export const OptionsEditor: React.FC<{
  options: Option[];
  onChange: (opts: Option[]) => void;
  fields: OptionFieldsConfig;
  storagePrefix: string;
  minCount?: number;
}> = ({ options, onChange, fields, storagePrefix, minCount = 2 }) => {
  const update = (id: string, patch: Partial<Option>) =>
    onChange(options.map(o => o.id === id ? { ...o, ...patch } : o));
  const remove = (id: string) => onChange(options.filter(o => o.id !== id));
  const add = () => onChange([...options, { id: genOptionId(), text: '' }]);

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt, i) => (
        <div key={opt.id} className="flex flex-col gap-2 p-3 rounded-xl border-2 border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">گزینه {i + 1}</span>
            <button type="button" onClick={() => remove(opt.id)} disabled={options.length <= minCount}
              className="text-red-400 text-xs font-bold disabled:opacity-30">حذف</button>
          </div>
          {fields.text && (
            <TextInput value={opt.text ?? ''} onChange={(v) => update(opt.id, { text: v })} placeholder="متن گزینه" />
          )}
          {fields.image && (
            <ImageField value={opt.imageUrl} onChange={(v) => update(opt.id, { imageUrl: v })} storagePrefix={`${storagePrefix}/images`} />
          )}
          {fields.audio && (
            <AudioField value={opt.audioUrl} onChange={(v) => update(opt.id, { audioUrl: v })} storagePrefix={`${storagePrefix}/options`} />
          )}
          {fields.pairKey && (
            <TextInput value={opt.pairKey ?? ''} onChange={(v) => update(opt.id, { pairKey: v })} placeholder="کلید جفت (دو گزینه با کلید یکسان جفت میشن)" />
          )}
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm font-bold text-violet-600 py-2">+ افزودن گزینه</button>
    </div>
  );
};

// Pick exactly one option as the correct answer.
export const SingleCorrectPicker: React.FC<{ options: Option[]; value: string; onChange: (id: string) => void }> = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o, i) => (
      <button key={o.id} type="button" onClick={() => onChange(o.id)}
        className={`py-2 px-3 rounded-xl text-sm font-bold border-2 ${value === o.id ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-200'}`}>
        {o.text || `گزینه ${i + 1}`}
      </button>
    ))}
  </div>
);

// Build an ordered list of option ids by tapping them in the correct sequence.
export const OrderedCorrectPicker: React.FC<{ options: Option[]; value: string[]; onChange: (ids: string[]) => void }> = ({ options, value, onChange }) => {
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter(v => v !== id));
    else onChange([...value, id]);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {options.map((o, i) => {
          const pos = value.indexOf(o.id);
          return (
            <button key={o.id} type="button" onClick={() => toggle(o.id)}
              className={`py-2 px-3 rounded-xl text-sm font-bold border-2 relative ${pos >= 0 ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200'}`}>
              {pos >= 0 && <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center">{pos + 1}</span>}
              {o.text || `گزینه ${i + 1}`}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => onChange([])} className="text-xs text-gray-400 self-start">پاک کردن ترتیب</button>
    </div>
  );
};
