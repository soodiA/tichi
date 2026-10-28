import React, { useState } from 'react';
import type { Question } from '../../types';
import { submitQuestionReport } from '../../lib/reports';
import { useStore } from '../../store/useStore';

interface ReportButtonProps {
  question: Question;
  nodeId: string | null;
}

type SendState = 'idle' | 'sending' | 'sent' | 'failed';

const ReportButton: React.FC<ReportButtonProps> = ({ question, nodeId }) => {
  const currentUser = useStore((s) => s.currentUser);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [state, setState] = useState<SendState>('idle');

  const close = () => {
    setOpen(false);
    setText('');
    setState('idle');
  };

  const send = async () => {
    setState('sending');
    const ok = await submitQuestionReport({
      question,
      nodeId,
      description: text,
      reporterUsername: currentUser?.username ?? null,
    });
    setState(ok ? 'sent' : 'failed');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="self-center text-xs font-bold text-gray-500 bg-white/70 rounded-full px-4 py-2 active:scale-95 transition-transform"
      >
        🚩 گزارش خطا در این سوال
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" dir="rtl" onClick={close}>
          <div
            className="w-full max-w-md bg-white rounded-t-3xl p-5 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {state === 'sent' ? (
              <>
                <p className="text-center text-lg font-extrabold text-emerald-600">ممنون! گزارشت ارسال شد 💜</p>
                <button onClick={close} className="btn-primary">بستن</button>
              </>
            ) : (
              <>
                <p className="text-lg font-extrabold text-gray-800">مشکل این سوال چیه؟</p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder="مثلاً: صدا اشتباهه، جواب درست نیست، عکس نمایش داده نمیشه..."
                  className="w-full rounded-xl border border-gray-300 p-3 text-gray-700"
                />
                {state === 'failed' && (
                  <p className="text-sm text-red-500">ارسال نشد. اینترنتت رو چک کن و دوباره امتحان کن.</p>
                )}
                <div className="flex gap-2">
                  <button onClick={send} disabled={state === 'sending'} className="btn-primary flex-1">
                    {state === 'sending' ? 'در حال ارسال...' : 'ارسال گزارش'}
                  </button>
                  <button onClick={close} className="btn-secondary flex-1">انصراف</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ReportButton;
