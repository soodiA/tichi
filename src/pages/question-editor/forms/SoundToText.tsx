import React, { useEffect } from 'react';
import type { FormProps } from '../types';
import { OptionsEditor, SingleCorrectPicker, genOptionId } from '../shared';

const SoundToTextForm: React.FC<FormProps> = ({ draft, patch }) => {
  useEffect(() => {
    if (draft.options.length === 0) {
      patch({ options: Array.from({ length: 4 }, () => ({ id: genOptionId(), text: '' })) });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">صدایی که پخش میشه (کاربر باید نوشتار درستش رو انتخاب کنه) — این همون فیلد «صدای سوال» در بالای فرمه.</p>
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
