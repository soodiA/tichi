import React from 'react';
import type { FormProps } from '../types';
import { Field, TextInput, ImageField, ClipField } from '../shared';

const IMAGE_OPTION_ID = '__image__';

const RecordForm: React.FC<FormProps> = ({ draft, patch }) => {
  const word = String(draft.correctAnswer ?? '');
  const imageOpt = draft.options.find(o => o.id === IMAGE_OPTION_ID);

  const setImage = (url: string) => {
    const rest = draft.options.filter(o => o.id !== IMAGE_OPTION_ID);
    patch({ options: url ? [{ id: IMAGE_OPTION_ID, imageUrl: url }, ...rest] : rest });
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="کلمه‌ای که باید تکرار بشه (جواب درست)">
        <TextInput value={word} onChange={(v) => patch({ correctAnswer: v, mediaLabel: v })} placeholder="مثلاً: آب" />
      </Field>
      <p className="text-xs text-gray-400">تشخیص گفتار این کلمه رو با صدای بچه مقایسه می‌کنه، پس دقیقاً همون چیزی باشه که باید گفته بشه.</p>

      <Field label="صدای این کلمه (اختیاری)">
        <ClipField folder="words" textKey={word} />
      </Field>
      <Field label="عکس این کلمه (اختیاری — بعضی کلمات عکس ندارن)">
        <ImageField value={imageOpt?.imageUrl} onChange={setImage} storagePrefix="questions/record" />
      </Field>
    </div>
  );
};

export default RecordForm;
