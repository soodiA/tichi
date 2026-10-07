import React, { useEffect } from 'react';
import type { FormProps } from '../types';
import { SingleCorrectPicker } from '../shared';

// The blank is always one of these two: ـِـ (ezafe/connector kasra) or یِ (mediating ye).
export const MIDDLE_BLANK_OPTIONS = [
  { id: 'mb-kasra', text: 'ـِـ' },
  { id: 'mb-ye', text: 'یِ' },
];

const MiddleBlankForm: React.FC<FormProps> = ({ draft, patch }) => {
  useEffect(() => {
    if (draft.options.length === 0) patch({ options: MIDDLE_BLANK_OPTIONS });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">
        توی متن سوال بالا عبارت رو به شکل «کلمه‌ی اول ..... کلمه‌ی دوم» بنویس (مثلاً «مادَر ..... مَن»). گزینه‌ها همیشه ـِـ و یِ هستن.
      </p>
      <div>
        <p className="text-xs font-bold text-gray-500 mb-1">جواب درست</p>
        <SingleCorrectPicker options={draft.options} value={String(draft.correctAnswer)} onChange={(id) => patch({ correctAnswer: id })} />
      </div>
    </div>
  );
};

export default MiddleBlankForm;
