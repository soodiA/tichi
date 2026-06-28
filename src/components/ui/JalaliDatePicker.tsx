import React, { useState, useEffect } from 'react';
import * as jalaali from 'jalaali-js';

const MONTHS = [
  'فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور',
  'مهر','آبان','آذر','دی','بهمن','اسفند',
];

interface Props {
  value?: string;
  onChange: (iso: string) => void;
}

const JalaliDatePicker: React.FC<Props> = ({ value, onChange }) => {
  const currentJY = jalaali.toJalaali(new Date()).jy;

  const [jy, setJy] = useState<number>(currentJY - 10);
  const [jm, setJm] = useState<number>(1);
  const [jd, setJd] = useState<number>(1);

  useEffect(() => {
    if (!value) return;
    const d = new Date(value);
    const { jy: y, jm: m, jd: day } = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    setJy(y); setJm(m); setJd(day);
  }, []);

  const daysInMonth = jalaali.jalaaliMonthLength(jy, jm);

  const handleChange = (y: number, m: number, d: number) => {
    const safeD = Math.min(d, jalaali.jalaaliMonthLength(y, m));
    const { gy, gm, gd } = jalaali.toGregorian(y, m, safeD);
    onChange(`${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`);
  };

  const years = Array.from({ length: 40 }, (_, i) => currentJY - 5 - i);

  return (
    <div className="flex gap-2 w-full" dir="rtl">
      <select
        value={jy}
        onChange={(e) => { const y = +e.target.value; setJy(y); handleChange(y, jm, jd); }}
        className="flex-1 border-2 border-gray-200 rounded-xl px-2 py-3 text-center focus:outline-none focus:border-violet-500"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y.toLocaleString('fa-IR', { useGrouping: false })}</option>
        ))}
      </select>

      <select
        value={jm}
        onChange={(e) => { const m = +e.target.value; setJm(m); handleChange(jy, m, jd); }}
        className="flex-1 border-2 border-gray-200 rounded-xl px-2 py-3 text-center focus:outline-none focus:border-violet-500"
      >
        {MONTHS.map((name, i) => (
          <option key={i + 1} value={i + 1}>{name}</option>
        ))}
      </select>

      <select
        value={Math.min(jd, daysInMonth)}
        onChange={(e) => { const d = +e.target.value; setJd(d); handleChange(jy, jm, d); }}
        className="flex-[0.7] border-2 border-gray-200 rounded-xl px-2 py-3 text-center focus:outline-none focus:border-violet-500"
      >
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{d.toLocaleString('fa-IR')}</option>
        ))}
      </select>
    </div>
  );
};

export default JalaliDatePicker;

export function toJalaliDisplay(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const { jy, jm, jd } = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jd.toLocaleString('fa-IR')} ${MONTHS[jm - 1]} ${jy.toLocaleString('fa-IR', { useGrouping: false })}`;
}
