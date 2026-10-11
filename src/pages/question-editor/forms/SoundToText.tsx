import React, { useEffect } from 'react';
import type { FormProps } from '../types';
import { Field, TextInput, OptionsEditor, SingleCorrectPicker, genOptionId } from '../shared';

const SoundToTextForm: React.FC<FormProps> = ({ draft, patch }) => {
  useEffect(() => {
    if (draft.options.length === 0) {
      patch({ options: Array.from({ length: 4 }, () => ({ id: genOptionId(), text: '' })) });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4">
      <Field label="لیبل (حرف یا ترکیبی که صداش پخش میشه — به کاربر نشون داده نمیشه)">
        <TextInput
          value={draft.mediaLabel}
          onChange={(v) => {
            const key = (t?: string) => (t ?? '').normalize('NFC').replace(/[\u200c\u0640]/g, '').trim();
            const match = draft.options.find((o) => key(o.text) !== '' && key(o.text) === key(v));
            patch({ mediaLabel: v, ...(match ? { correctAnswer: match.id } : {}) });
          }}
          placeholder="مثلاً: بَ"
        />
      </Field>
      <p className="text-xs text-gray-500">برنامه از روی لیبل می‌فهمه چه صدایی پخش بشه (ضبط‌های صفحه‌ی ضبط ترکیب‌ها/حروف). گزینه‌ی درست باید با لیبل برابر باشه؛ اگه یکی از گزینه‌ها دقیقاً همین متن رو داشته باشه خودکار به‌عنوان جواب درست انتخاب میشه.</p>
      <OptionsEditor
        options={draft.options}
        onChange={(options) => patch({ options })}
        fields={{ text: true }}
        storagePrefix="questions/sound_to_text"
        minCount={2}
      />
      <div>
        <p className="text-xs font-bold text-gray-500 mb-1">جواب درست</p>
        <SingleCorrectPicker options={draft.options} value={String(draft.correctAnswer)} onChange={(id) => patch({ correctAnswer: id })} />
      </div>
    </div>
  );
};

export default SoundToTextForm;
