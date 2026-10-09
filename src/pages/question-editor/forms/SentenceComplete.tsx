import React, { useEffect } from 'react';
import type { FormProps } from '../types';
import { Field, TextInput, OptionsEditor, SingleCorrectPicker, genOptionId } from '../shared';

const SentenceCompleteForm: React.FC<FormProps> = ({ draft, patch }) => {
  useEffect(() => {
    if (draft.options.length === 0) {
      patch({ options: Array.from({ length: 4 }, () => ({ id: genOptionId(), text: '' })) });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4">
      <Field label="متن جمله (media_label)">
        <TextInput value={draft.mediaLabel} onChange={(v) => patch({ mediaLabel: v })} placeholder="مثلاً: من ... را دوست دارم" />
      </Field>
      <p className="text-xs text-gray-500">به‌جای کلمه‌ی جاافتاده «...» بگذار. در فیلد سوال بالا فقط بنویس «جمله را کامل کن».</p>
      <OptionsEditor
        options={draft.options}
        onChange={(options) => patch({ options })}
        fields={{ text: true, audio: true }}
        storagePrefix="questions/sentence_complete"
        minCount={2}
      />
      <div>
        <p className="text-xs font-bold text-gray-500 mb-1">جواب درست</p>
        <SingleCorrectPicker options={draft.options} value={String(draft.correctAnswer)} onChange={(id) => patch({ correctAnswer: id })} />
      </div>
    </div>
  );
};

export default SentenceCompleteForm;
