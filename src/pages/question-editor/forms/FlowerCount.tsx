import React from 'react';
import type { FormProps } from '../types';
import { Field, TextInput, NumberInput } from '../shared';

const FlowerCountForm: React.FC<FormProps> = ({ draft, patch }) => (
  <div className="flex flex-col gap-4">
    <Field label="کلمه (media_label)">
      <TextInput value={draft.mediaLabel} onChange={(v) => patch({ mediaLabel: v })} placeholder="مثلاً: ماهی" />
    </Field>
    <Field label="تعداد بخش‌های درست (حداکثر ۵ گل)">
      <NumberInput
        value={draft.syllableCount}
        onChange={(v) => patch({ syllableCount: v, correctAnswer: String(v) })}
      />
    </Field>
  </div>
);

export default FlowerCountForm;
