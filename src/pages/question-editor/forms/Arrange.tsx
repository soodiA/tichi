import React, { useEffect } from 'react';
import type { FormProps } from '../types';
import { OptionsEditor, OrderedCorrectPicker, genOptionId } from '../shared';

const ArrangeForm: React.FC<FormProps> = ({ draft, patch }) => {
  useEffect(() => {
    if (draft.options.length === 0) {
      patch({ options: Array.from({ length: 3 }, () => ({ id: genOptionId(), text: '' })) });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const orderIds = Array.isArray(draft.correctAnswer) ? draft.correctAnswer : [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">کلمه‌های جمله رو اینجا اضافه کن (به هر ترتیبی، مهم نیست).</p>
      <OptionsEditor
        options={draft.options}
        onChange={(options) => patch({ options })}
        fields={{ text: true, audio: true }}
        storagePrefix="questions/arrange"
        minCount={2}
      />
      <div>
        <p className="text-xs font-bold text-gray-500 mb-1">روی کلمه‌ها به ترتیب درست بزن</p>
        <OrderedCorrectPicker options={draft.options} value={orderIds} onChange={(ids) => patch({ correctAnswer: ids })} />
      </div>
    </div>
  );
};

export default ArrangeForm;
