import React, { useEffect } from 'react';
import type { FormProps } from '../types';
import { OptionsEditor, genOptionId } from '../shared';

const PairMatchForm: React.FC<FormProps> = ({ draft, patch }) => {
  useEffect(() => {
    if (draft.options.length === 0) {
      patch({
        options: Array.from({ length: 4 }, () => ({ id: genOptionId(), text: '' })),
        correctAnswer: 'pair',
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">هر ۲ گزینه که «کلید جفت» یکسان دارن با هم جفت می‌شن (مثلاً دوتا رو «A» و دوتا رو «B» بذار).</p>
      <OptionsEditor
        options={draft.options}
        onChange={(options) => patch({ options })}
        fields={{ text: true, image: true, pairKey: true }}
        storagePrefix="questions/pair_match"
        minCount={4}
      />
    </div>
  );
};

export default PairMatchForm;
