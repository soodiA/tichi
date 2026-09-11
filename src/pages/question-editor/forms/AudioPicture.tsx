import React, { useEffect } from 'react';
import type { FormProps } from '../types';
import { OptionsEditor, SingleCorrectPicker, Field, ClipField } from '../shared';
import { genOptionId } from '../shared';
import { parseAudioPictureTarget } from '../../../lib/clipAudio';

const AudioPictureForm: React.FC<FormProps> = ({ draft, patch }) => {
  useEffect(() => {
    if (draft.options.length === 0) {
      patch({ options: Array.from({ length: 4 }, () => ({ id: genOptionId(), text: '' })) });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const target = parseAudioPictureTarget(draft.questionText);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">۴ گزینه‌ی عکس/صدا؛ کاربر یکی رو انتخاب می‌کنه.</p>
      {target && (
        <Field label={`صدای حرف «${target.letter}» (اختیاری)`}>
          <ClipField folder="letters" textKey={target.letter} />
        </Field>
      )}
      <OptionsEditor
        options={draft.options}
        onChange={(options) => patch({ options })}
        fields={{ text: true, image: true, audio: true }}
        storagePrefix="questions/audio_picture"
        minCount={2}
      />
      <div>
        <p className="text-xs font-bold text-gray-500 mb-1">جواب درست</p>
        <SingleCorrectPicker options={draft.options} value={String(draft.correctAnswer)} onChange={(id) => patch({ correctAnswer: id })} />
      </div>
    </div>
  );
};

export default AudioPictureForm;
