import React from 'react';
import type { FormProps } from '../types';
import { Field, TextInput } from '../shared';

const HandwritingForm: React.FC<FormProps> = ({ draft, patch }) => (
  <div className="flex flex-col gap-4">
    <Field label="حرف/شکلی که باید نوشته بشه">
      <TextInput value={String(draft.correctAnswer)} onChange={(v) => patch({ correctAnswer: v, mediaLabel: v })} placeholder="مثلاً: بـ" />
    </Field>
    <p className="text-xs text-amber-600">
      دقت کن این دقیقاً همون شکلی باشه که توی /path-editor مسیرش رو کشیدی و ذخیره کردی (مثلاً «بـ» نه «ب» اگه شکل غیرآخره) — وگرنه مسیر راهنما نداره.
    </p>
  </div>
);

export default HandwritingForm;
