import React from 'react';
import type { FormProps } from '../types';
import { Field, TextInput } from '../shared';

const ColorLetterForm: React.FC<FormProps> = ({ draft, patch }) => (
  <div className="flex flex-col gap-4">
    <Field label="حرفی که رنگ میشه">
      <TextInput value={draft.mediaLabel} onChange={(v) => patch({ mediaLabel: v, correctAnswer: v })} placeholder="مثلاً: ع" />
    </Field>
  </div>
);

export default ColorLetterForm;
