import React, { useEffect, useState } from 'react';
import type { FormProps } from '../types';
import { Field, TextInput, genOptionId } from '../shared';

// Reconstructs the "full word" + which positions are blank from an existing draft,
// so editing an existing question re-opens in the same word/blank-toggle UI.
function deriveFromDraft(draft: FormProps['draft']) {
  if (draft.template.length > 0) {
    const word = draft.template.map((c) => c ?? '_').join('');
    const blanks = new Set(draft.template.map((c, i) => (c === null ? i : -1)).filter(i => i !== -1));
    return { word, blanks };
  }
  return { word: '', blanks: new Set<number>() };
}

const FillBlanksForm: React.FC<FormProps> = ({ draft, patch }) => {
  const init = deriveFromDraft(draft);
  const [word, setWord] = useState(init.word);
  const [blanks, setBlanks] = useState<Set<number>>(init.blanks);
  const [distractors, setDistractors] = useState('');

  const chars = [...word];

  const toggleBlank = (i: number) => {
    const next = new Set(blanks);
    if (next.has(i)) next.delete(i); else next.add(i);
    setBlanks(next);
  };

  useEffect(() => {
    const template = chars.map((c, i) => (blanks.has(i) ? null : c));
    const correctTiles = chars
      .map((c, i) => (blanks.has(i) ? { id: genOptionId(), text: c } : null))
      .filter((x): x is { id: string; text: string } => x !== null);
    const distractorTiles = distractors.split(',').map(s => s.trim()).filter(Boolean)
      .map(text => ({ id: genOptionId(), text }));
    const options = [
      { id: '__template__', text: JSON.stringify(template) },
      ...correctTiles,
      ...distractorTiles,
    ];
    const correctAnswer = correctTiles.length === 1 ? correctTiles[0].id : correctTiles.map(t => t.id);
    patch({ template, options, correctAnswer, mediaLabel: word });
  }, [word, distractors, JSON.stringify([...blanks])]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4">
      <Field label="کلمه‌ی کامل">
        <TextInput value={word} onChange={setWord} placeholder="مثلاً: بادام" />
      </Field>
      {chars.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 mb-1">روی حرف(های) جای‌خالی بزن</p>
          <div className="flex gap-2 flex-wrap" dir="rtl">
            {chars.map((c, i) => (
              <button key={i} type="button" onClick={() => toggleBlank(i)}
                className={`w-11 h-11 rounded-xl text-xl font-bold border-2 ${blanks.has(i) ? 'bg-amber-100 border-amber-400 text-amber-600' : 'bg-white border-gray-200 text-gray-700'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
      <Field label="گزینه‌های غلط (با کاما جدا کن)">
        <TextInput value={distractors} onChange={setDistractors} placeholder="مثلاً: س, ت" />
      </Field>
    </div>
  );
};

export default FillBlanksForm;
