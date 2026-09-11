import React, { useEffect } from 'react';
import type { FormProps } from '../types';
import { Field, TextInput, OptionsEditor, OrderedCorrectPicker, genOptionId } from '../shared';

const PhonemeForm: React.FC<FormProps> = ({ draft, patch }) => {
  useEffect(() => {
    if (draft.options.length === 0) {
      patch({ options: Array.from({ length: 4 }, () => ({ id: genOptionId(), text: '' })) });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const orderIds = Array.isArray(draft.correctAnswer) ? draft.correctAnswer : [];

  return (
    <div className="flex flex-col gap-4">
      <Field label="کلمه‌ای که صداکشی میشه">
        <TextInput value={draft.mediaLabel} onChange={(v) => patch({ mediaLabel: v })} placeholder="مثلاً: بابا" />
      </Field>
      <p className="text-xs text-gray-500">صداهای تشکیل‌دهنده‌ی کلمه (حروف/اعراب) رو به‌عنوان گزینه اضافه کن.</p>
      <OptionsEditor
        options={draft.options}
        onChange={(options) => patch({ options })}
        fields={{ text: true }}
        storagePrefix="questions/phoneme"
        minCount={2}
      />
      <div>
        <p className="text-xs font-bold text-gray-500 mb-1">روی صداها به ترتیب درست بزن</p>
        <OrderedCorrectPicker options={draft.options} value={orderIds} onChange={(ids) => patch({ correctAnswer: ids })} />
      </div>
    </div>
  );
};

export default PhonemeForm;
