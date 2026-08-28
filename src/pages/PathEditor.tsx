import React, { useRef, useEffect, useState, useCallback } from 'react';

const SIZE = 300;
const FONT_SIZE = Math.round(SIZE * 0.78);
const CY = Math.round(SIZE * 0.62);
const LS_KEY = 'tichi-path-editor-saved-v3';

interface FormDef { name: string; glyph: string; }
interface LetterEntry { id: string; label: string; forms: FormDef[]; }

const one = (g: string): FormDef[] => [{ name: 'تنها', glyph: g }];
const two = (nonFinal: string, final: string): FormDef[] => [
  { name: 'غیرآخر', glyph: nonFinal },
  { name: 'آخر', glyph: final },
];
const four = (initial: string, medial: string, finalAttached: string, finalAlone: string): FormDef[] => [
  { name: 'اول', glyph: initial },
  { name: 'وسط', glyph: medial },
  { name: 'آخر چسبان', glyph: finalAttached },
  { name: 'آخر تنها', glyph: finalAlone },
];

// Shapes and naming dictated directly by Soodeh (2026-08-28) — do not re-derive generically.
const ENTRIES: LetterEntry[] = [
  { id: 'fatha', label: 'اَ', forms: [{ name: 'اول', glyph: 'اَ' }, { name: 'غیراول', glyph: 'ـَ' }] },
  { id: 'kasra', label: 'اِ', forms: [{ name: 'اول', glyph: 'اِ' }, { name: 'غیراول', glyph: 'ـِ' }] },
  { id: 'damma', label: 'اُ', forms: [{ name: 'اول', glyph: 'اُ' }, { name: 'غیراول', glyph: 'ـُ' }] },
  { id: 'alef', label: 'ا', forms: [{ name: 'اول', glyph: 'آ' }, { name: 'غیراول', glyph: 'ا' }] },
  { id: 'oo', label: 'او', forms: [{ name: 'اول', glyph: 'او' }, { name: 'غیراول', glyph: 'و' }] },
  { id: 'ei', label: 'ای', forms: [
    { name: 'اول', glyph: 'ایـ' },
    { name: 'وسط', glyph: 'یـ' },
    { name: 'آخر', glyph: 'ی' },
    { name: 'آخر تنها', glyph: 'ای' },
  ] },
  { id: 'be', label: 'ب', forms: two('بـ', 'ب') },
  { id: 'pe', label: 'پ', forms: two('پـ', 'پ') },
  { id: 'te', label: 'ت', forms: two('تـ', 'ت') },
  { id: 'se3', label: 'ث', forms: two('ثـ', 'ث') },
  { id: 'jim', label: 'ج', forms: two('جـ', 'ج') },
  { id: 'che', label: 'چ', forms: two('چـ', 'چ') },
  { id: 'he_jimi', label: 'ح', forms: two('حـ', 'ح') },
  { id: 'khe', label: 'خ', forms: two('خـ', 'خ') },
  { id: 'dal', label: 'د', forms: one('د') },
  { id: 'zal', label: 'ذ', forms: one('ذ') },
  { id: 're', label: 'ر', forms: one('ر') },
  { id: 'ze', label: 'ز', forms: one('ز') },
  { id: 'zhe', label: 'ژ', forms: one('ژ') },
  { id: 'sin', label: 'س', forms: two('سـ', 'س') },
  { id: 'shin', label: 'ش', forms: two('شـ', 'ش') },
  { id: 'sad', label: 'ص', forms: two('صـ', 'ص') },
  { id: 'zad', label: 'ض', forms: two('ضـ', 'ض') },
  { id: 'ta', label: 'ط', forms: one('ط') },
  { id: 'za', label: 'ظ', forms: one('ظ') },
  { id: 'ein', label: 'ع', forms: four('عـ', 'ـعـ', 'ـع', 'ع') },
  { id: 'ghein', label: 'غ', forms: four('غـ', 'ـغـ', 'ـغ', 'غ') },
  { id: 'fe', label: 'ف', forms: two('فـ', 'ف') },
  { id: 'ghaf', label: 'ق', forms: two('قـ', 'ق') },
  { id: 'kaf', label: 'ک', forms: two('کـ', 'ک') },
  { id: 'gaf', label: 'گ', forms: two('گـ', 'گ') },
  { id: 'lam', label: 'ل', forms: two('لـ', 'ل') },
  { id: 'mim', label: 'م', forms: two('مـ', 'م') },
  { id: 'nun', label: 'ن', forms: two('نـ', 'ن') },
  { id: 'vav', label: 'و', forms: one('و') },
  { id: 'he', label: 'ه', forms: four('هـ', 'ـهـ', 'ـه', 'ه') },
  { id: 'ye', label: 'ی', forms: two('یـ', 'ی') },
];

const ZWNJ = '‌';

type Point = [number, number];
type Stroke = Point[];
// key: `${entryId}|${formName}`
type SavedPaths = Record<string, Stroke[]>;
const key = (entryId: string, formName: string) => `${entryId}|${formName}`;

function loadSaved(): SavedPaths {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}'); } catch { return {}; }
}
function persistSaved(data: SavedPaths) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

const PathEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [entryId, setEntryId] = useState('be');
  const [formName, setFormName] = useState('غیرآخر');
  const [strokes, setStrokes] = useState<Stroke[]>([[]]);
  const [currentStroke, setCurrentStroke] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPt, setPreviewPt] = useState(0);
  const [previewStroke, setPreviewStroke] = useState(0);
  const [saved, setSaved] = useState<SavedPaths>(loadSaved);
  const [saveMsg, setSaveMsg] = useState('');
  const [showAllCode, setShowAllCode] = useState(false);

  const entry = ENTRIES.find(e => e.id === entryId)!;
  const currentForm = entry.forms.find(f => f.name === formName) ?? entry.forms[0];
  const displayLetter = ZWNJ + currentForm.glyph + ZWNJ;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#fdf4ff';
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = '#ddd6fe';
    ctx.font = `bold ${FONT_SIZE}px Vazirmatn, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayLetter, SIZE / 2, CY);

    strokes.forEach((stroke, si) => {
      if (stroke.length === 0) return;
      const isCurrent = si === currentStroke;
      const color = isCurrent ? '#7c3aed' : '#a78bfa';

      if (stroke.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(stroke[0][0], stroke[0][1]);
        for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i][0], stroke[i][1]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      stroke.forEach(([x, y], pi) => {
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fillStyle = pi === 0 ? '#059669' : color;
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(pi + 1), x, y);
      });

      if (stroke.length > 0) {
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#6d28d9';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`S${si + 1}`, stroke[0][0] + 10, stroke[0][1] - 14);
      }
    });

    if (showPreview) {
      const st = strokes[previewStroke];
      if (st && previewPt < st.length) {
        const [px, py] = st[previewPt];
        ctx.beginPath();
        ctx.arc(px, py, 13, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124,58,237,0.7)';
        ctx.fill();
      }
    }
  }, [strokes, currentStroke, displayLetter, showPreview, previewPt, previewStroke]);

  useEffect(() => { document.fonts.ready.then(() => setFontsReady(true)); }, []);
  useEffect(() => { if (fontsReady) draw(); }, [draw, fontsReady]);

  const canvasPos = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scale = SIZE / rect.width;
    let cx: number, cy2: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      cx = e.touches[0].clientX; cy2 = e.touches[0].clientY;
    } else {
      cx = (e as React.MouseEvent).clientX; cy2 = (e as React.MouseEvent).clientY;
    }
    return [Math.round((cx - rect.left) * scale), Math.round((cy2 - rect.top) * scale)];
  };

  const addPoint = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault();
    const pt = canvasPos(e);
    if (!pt) return;
    setStrokes(prev => prev.map((s, i) => i === currentStroke ? [...s, pt] : s));
  };

  const addStroke = () => {
    const next = strokes.length;
    setStrokes(prev => [...prev, []]);
    setCurrentStroke(next);
  };

  const undo = () => setStrokes(prev => prev.map((s, i) => i === currentStroke ? s.slice(0, -1) : s));

  const clearAll = () => { setStrokes([[]]); setCurrentStroke(0); setShowPreview(false); };

  const deleteStroke = (si: number) => {
    if (strokes.length === 1) { setStrokes([[]]); setCurrentStroke(0); return; }
    const ns = strokes.filter((_, i) => i !== si);
    setStrokes(ns);
    setCurrentStroke(Math.max(0, si - 1));
  };

  const loadFor = (eId: string, fName: string) => {
    const savedForForm = saved[key(eId, fName)];
    if (savedForForm && savedForForm.length > 0) {
      setStrokes([...savedForForm.map(s => [...s] as Stroke), []]);
      setCurrentStroke(savedForForm.length);
    } else {
      setStrokes([[]]);
      setCurrentStroke(0);
    }
    setShowPreview(false);
  };

  const changeEntry = (eId: string) => {
    setEntryId(eId);
    const forms = ENTRIES.find(e => e.id === eId)!.forms;
    const nextForm = forms.some(f => f.name === formName) ? formName : forms[0].name;
    setFormName(nextForm);
    loadFor(eId, nextForm);
  };

  const changeForm = (fName: string) => {
    setFormName(fName);
    loadFor(entryId, fName);
  };

  const saveLetter = () => {
    const valid = strokes.filter(s => s.length > 0);
    if (valid.length === 0) { setSaveMsg('هیچ نقطه‌ای وجود نداره!'); setTimeout(() => setSaveMsg(''), 2000); return; }
    const newSaved = { ...saved, [key(entryId, formName)]: valid };
    setSaved(newSaved);
    persistSaved(newSaved);
    setSaveMsg(`✓ «${entry.label}» (${formName}) ذخیره شد`);
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const deleteSaved = (k: string) => {
    const ns = { ...saved };
    delete ns[k];
    setSaved(ns);
    persistSaved(ns);
  };

  const genAllCode = () => {
    const byEntry = new Map<string, Partial<Record<string, Stroke[]>>>();
    for (const [k, sts] of Object.entries(saved)) {
      const sep = k.indexOf('|');
      const eId = k.slice(0, sep), fName = k.slice(sep + 1);
      if (!byEntry.has(eId)) byEntry.set(eId, {});
      byEntry.get(eId)![fName] = sts;
    }
    if (byEntry.size === 0) return '// هنوز چیزی ذخیره نشده';
    const blocks = ENTRIES.filter(e => byEntry.has(e.id)).map(e => {
      const forms = byEntry.get(e.id)!;
      const formBlocks = e.forms.filter(f => forms[f.name]).map(f => {
        const sts = forms[f.name]!;
        const inner = sts.map(s => `        [${s.map(([x, y]) => `[${x}, ${y}]`).join(', ')}]`).join(',\n');
        return `      '${f.name}': [\n${inner},\n      ],`;
      }).join('\n');
      return `  '${e.id}' /* ${e.label} */: {\n${formBlocks}\n  },`;
    }).join('\n');
    return `const STROKE_PATHS: Record<string, Record<string, [number,number][][]>> = {\n${blocks}\n};`;
  };

  const currentPts = strokes[currentStroke] ?? [];
  const validStrokes = strokes.filter(s => s.length > 0);
  const isSaved = !!saved[key(entryId, formName)];
  const savedFormsForEntry = entry.forms.filter(f => !!saved[key(entryId, f.name)]);

  useEffect(() => {
    if (!showPreview) return;
    if (validStrokes.length === 0) return;
    let si = 0, pi = 0;
    const interval = setInterval(() => {
      setPreviewStroke(si); setPreviewPt(pi);
      pi++;
      if (pi >= validStrokes[si].length) { pi = 0; si = (si + 1) % validStrokes.length; }
    }, 500);
    return () => clearInterval(interval);
  }, [showPreview, strokes]);

  return (
    <div dir="rtl" className="min-h-screen bg-violet-50 flex flex-col items-center p-4 gap-4 pb-10">
      <h1 className="text-xl font-bold text-violet-800">ویرایشگر مسیر حروف</h1>

      {/* Letter/entry selector */}
      <div className="flex flex-wrap gap-2 justify-center max-w-sm">
        {ENTRIES.map(e => {
          const hasSaved = e.forms.some(f => !!saved[key(e.id, f.name)]);
          return (
            <button key={e.id} onClick={() => changeEntry(e.id)}
              className={`min-w-10 h-10 px-1 rounded-xl text-lg font-bold border-2 transition-all relative
                ${e.id === entryId ? 'bg-violet-600 text-white border-violet-600'
                  : hasSaved ? 'bg-green-100 text-green-800 border-green-400'
                  : 'bg-white text-gray-700 border-violet-200 active:scale-95'}`}>
              {e.label}
              {hasSaved && e.id !== entryId && (
                <span className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">سبز = حداقل یک شکل ذخیره شده</p>

      {/* Form selector */}
      <div className="flex gap-2 flex-wrap justify-center">
        {entry.forms.map(f => {
          const hasSaved = !!saved[key(entryId, f.name)];
          return (
            <button key={f.name} onClick={() => changeForm(f.name)}
              className={`py-2 px-4 rounded-xl text-sm font-bold border-2 transition-all
                ${f.name === formName ? 'bg-fuchsia-600 text-white border-fuchsia-600'
                  : hasSaved ? 'bg-green-100 text-green-800 border-green-400'
                  : 'bg-white text-gray-700 border-fuchsia-200'}`}>
              {f.name}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">
        شکل‌های «{entry.label}»: {entry.forms.length} تا
        {savedFormsForEntry.length > 0 && ` (ذخیره شده: ${savedFormsForEntry.map(f => f.name).join('، ')})`}
      </p>

      {/* Canvas */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg border-2 border-violet-300"
           style={{ width: 300, height: 300 }}>
        <canvas ref={canvasRef} width={SIZE} height={SIZE} className="w-full h-full"
          onClick={addPoint} onTouchEnd={addPoint} style={{ touchAction: 'none' }} />
      </div>

      <p className="text-sm text-violet-600 text-center">
        کلیک/ضربه = نقطه جدید &nbsp;|&nbsp; Stroke فعلی: <strong>S{currentStroke + 1}</strong> ({currentPts.length} نقطه)
      </p>

      {/* Main controls */}
      <div className="flex gap-2 flex-wrap justify-center">
        <button onClick={addStroke} className="bg-violet-600 text-white font-bold py-2 px-3 rounded-xl text-sm active:scale-95">
          + Stroke جدید
        </button>
        <button onClick={undo} disabled={currentPts.length === 0}
          className="bg-amber-500 text-white font-bold py-2 px-3 rounded-xl text-sm active:scale-95 disabled:opacity-40">
          ↩ undo
        </button>
        <button onClick={clearAll} className="bg-red-400 text-white font-bold py-2 px-3 rounded-xl text-sm active:scale-95">
          🗑 پاک
        </button>
        <button onClick={() => setShowPreview(p => !p)}
          className={`font-bold py-2 px-3 rounded-xl text-sm active:scale-95 ${showPreview ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
          {showPreview ? '⏸' : '▶'} پیش‌نمایش
        </button>
      </div>

      {/* Save button */}
      <button onClick={saveLetter}
        className={`w-full max-w-sm font-bold py-3 rounded-2xl text-lg active:scale-95 transition-all
          ${isSaved ? 'bg-green-500 text-white' : 'bg-violet-700 text-white'}`}>
        {isSaved ? `✓ بروز‌رسانی «${entry.label}» (${formName})` : `💾 ذخیره «${entry.label}» (${formName})`}
      </button>
      {saveMsg && <p className="text-green-600 font-bold text-sm">{saveMsg}</p>}

      {/* Stroke list */}
      {strokes.some(s => s.length > 0) && (
        <div className="w-full max-w-sm flex flex-col gap-1">
          {strokes.map((s, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm
              ${i === currentStroke ? 'border-violet-500 bg-violet-100' : 'border-gray-200 bg-white'}`}>
              <button onClick={() => setCurrentStroke(i)} className="flex-1 text-right font-bold text-violet-700">
                S{i + 1}: {s.length} نقطه {s.length === 1 ? '(dot/tap)' : ''}
              </button>
              <button onClick={() => deleteStroke(i)} className="text-red-400 font-bold px-1">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Saved entries summary */}
      {Object.keys(saved).length > 0 && (
        <div className="w-full max-w-sm">
          <p className="text-sm font-bold text-violet-700 mb-2">شکل‌های ذخیره شده ({Object.keys(saved).length}):</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(saved).map(([k, sts]) => {
              const sep = k.indexOf('|');
              const eId = k.slice(0, sep), fName = k.slice(sep + 1);
              const e = ENTRIES.find(x => x.id === eId);
              return (
                <div key={k} className="flex items-center gap-1 bg-green-100 border border-green-400 rounded-xl px-2 py-1">
                  <span className="font-bold text-green-800">{e?.label ?? eId} ({fName})</span>
                  <span className="text-xs text-green-600">({sts.length} S)</span>
                  <button onClick={() => deleteSaved(k)} className="text-red-400 text-xs font-bold">✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All code output */}
      {Object.keys(saved).length > 0 && (
        <div className="w-full max-w-sm">
          <button onClick={() => setShowAllCode(p => !p)}
            className="w-full bg-gray-800 text-white font-bold py-2 rounded-xl text-sm mb-2 active:scale-95">
            {showAllCode ? 'مخفی کن' : '📋 نمایش همه کدها'}
          </button>
          {showAllCode && (
            <textarea readOnly value={genAllCode()}
              className="w-full h-60 font-mono text-xs bg-gray-900 text-green-400 p-3 rounded-xl resize-none"
              onClick={e => (e.target as HTMLTextAreaElement).select()} />
          )}
        </div>
      )}
    </div>
  );
};

export default PathEditor;
