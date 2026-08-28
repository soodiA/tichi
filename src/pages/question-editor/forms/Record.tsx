import React from 'react';
import type { FormProps } from '../types';
import { Field, TextInput } from '../shared';

const RecordForm: React.FC<FormProps> = ({ draft, patch }) => (
  <div className="flex flex-col gap-4">
    <Field label="کلمه‌ای که باید تکرار بشه (جواب درست)">
      <TextInput value={String(draft.correctAnswer)} onChange={(v) => patch({ correctAnswer: v, mediaLabel: v })} placeholder="مثلاً: آب" />
    </Field>
    <p className="text-xs text-gray-400">تشخیص گفتار این کلمه رو با صدای بچه مقایسه می‌کنه، پس دقیقاً همون چیزی باشه که باید گفته بشه.</p>
  </div>
);

export default RecordForm;
