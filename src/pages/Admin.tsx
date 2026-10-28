import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAdminKey, setAdminKey, listQuestionReports, setQuestionReportStatus,
  type QuestionReport,
} from '../lib/reports';

const TOOLS: { path: string; icon: string; title: string; desc: string }[] = [
  { path: '/question-editor', icon: '✏️', title: 'ویرایش سوال‌ها', desc: 'ساخت و ویرایش سوال‌های هر درس' },
  { path: '/record-audio', icon: '🎙️', title: 'ضبط صدای سوال‌ها', desc: 'ضبط صدای متن هر سوال' },
  { path: '/intro-audio-recorder', icon: '🎬', title: 'ضبط صدای اینترو', desc: 'صدای صحنه‌های معرفی هر حرف' },
  { path: '/word-audio-recorder', icon: '🔤', title: 'ضبط صدای کلمه‌ها', desc: 'صدای کلمه‌ها و حرف‌ها' },
  { path: '/record-combos', icon: '🔊', title: 'ضبط صدای ترکیب‌ها', desc: 'ترکیب حرف و حرکت' },
  { path: '/audio-recorder', icon: '🎤', title: 'ضبط صدا', desc: 'ضبط‌کننده‌ی عمومی' },
  { path: '/path-editor', icon: '✍️', title: 'ویرایش مسیر دست‌خط', desc: 'کشیدن مسیر نوشتن حرف‌ها' },
];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });

const Admin: React.FC = () => {
  const [key, setKey] = useState(getAdminKey());
  const [authed, setAuthed] = useState(false);
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (k: string) => {
    setLoading(true);
    setError('');
    const rows = await listQuestionReports(k);
    setLoading(false);
    if (rows === null) {
      setAuthed(false);
      setError('کلید ادمین اشتباه است یا اتصال برقرار نشد.');
      return;
    }
    setAdminKey(k);
    setAuthed(true);
    setReports(rows);
  }, []);

  useEffect(() => {
    const saved = getAdminKey();
    if (saved) load(saved);
  }, [load]);

  const toggle = async (r: QuestionReport) => {
    const next = r.status === 'open' ? 'resolved' : 'open';
    if (await setQuestionReportStatus(key, r.id, next)) {
      setReports((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
    }
  };

  const logout = () => {
    setAdminKey('');
    setKey('');
    setAuthed(false);
    setReports([]);
  };

  const openCount = reports.filter((r) => r.status === 'open').length;
  const shown = reports.filter((r) => showResolved || r.status === 'open');

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-6">پنل مدیریت تیچی</h1>

        <h2 className="text-lg font-bold text-violet-700 mb-3">ابزارها</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {TOOLS.map((t) => (
            <Link
              key={t.path}
              to={t.path}
              className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 hover:border-violet-400 transition-colors"
            >
              <span className="text-3xl">{t.icon}</span>
              <span>
                <span className="block font-bold text-gray-800">{t.title}</span>
                <span className="block text-xs text-gray-500">{t.desc}</span>
              </span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-bold text-violet-700">
            گزارش‌های خطا {authed && `(${openCount.toLocaleString('fa-IR')} باز)`}
          </h2>
          {authed && (
            <>
              <button onClick={() => load(key)} className="text-sm text-violet-600 font-bold">بروزرسانی</button>
              <button onClick={logout} className="text-sm text-gray-400 mr-auto">خروج</button>
            </>
          )}
        </div>

        {!authed ? (
          <form
            onSubmit={(e) => { e.preventDefault(); load(key); }}
            className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3 max-w-xl"
          >
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="کلید ادمین"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300"
            />
            <button type="submit" disabled={loading || !key} className="btn-primary">
              {loading ? '...' : 'نمایش گزارش‌ها'}
            </button>
            {error && <p className="text-sm text-red-500 sm:basis-full">{error}</p>}
          </form>
        ) : (
          <>
            <label className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
              نمایش گزارش‌های رسیدگی‌شده
            </label>
            {shown.length === 0 && <p className="text-gray-400">گزارشی وجود ندارد 🎉</p>}
            <div className="flex flex-col gap-3">
              {shown.map((r) => (
                <div
                  key={r.id}
                  className={`bg-white rounded-2xl border p-4 ${r.status === 'open' ? 'border-amber-300' : 'border-gray-200 opacity-70'}`}
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
                    <span>{fmtDate(r.created_at)}</span>
                    <span>کاربر: {r.reporter_username ?? 'ناشناس'}</span>
                    <span>نوع: {r.question_type ?? '—'}</span>
                    <span className="font-mono" dir="ltr">{r.question_id}</span>
                  </div>
                  <p className="text-xs font-bold text-gray-400">متن سوال</p>
                  <p className="font-bold text-gray-800 mb-2">{r.question_snapshot?.questionText ?? '—'}</p>
                  <p className="text-xs font-bold text-gray-400">توضیح کاربر</p>
                  <p className="text-gray-700 mb-3 whitespace-pre-wrap">{r.description || '(بدون توضیح)'}</p>
                  <div className="flex gap-3 items-center">
                    <Link to="/question-editor" className="text-sm font-bold text-violet-600">ویرایش سوال ←</Link>
                    <button onClick={() => toggle(r)} className="text-sm font-bold text-emerald-600 mr-auto">
                      {r.status === 'open' ? '✓ رسیدگی شد' : 'باز کردن دوباره'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
