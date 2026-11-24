import React from 'react';
import { useNavigate } from 'react-router-dom';
import './landing.css';

// Public front door of tichikids.ir: pick a subject. Only the Persian app lives in this codebase.
// Math and Kangaroo are "soon" until they are hosted on this domain: the air-gap guard
// (deploy/check-no-external.sh) rejects links to other hosts. To enable one, switch its action to
// { kind: 'link', href: '/path-on-this-domain/' }.

interface Subject {
  key: 'persian' | 'math' | 'kangaroo';
  title: string;
  hint: string;
  img: string;
  action: { kind: 'route'; to: string } | { kind: 'link'; href: string } | { kind: 'soon' };
}

const SUBJECTS: Subject[] = [
  { key: 'persian', title: 'فارسی اول دبستان', hint: 'حروف، کلمه‌ها و داستان‌ها', img: '/landing/persian.png', action: { kind: 'route', to: '/start' } },
  { key: 'math', title: 'ریاضی اول دبستان', hint: 'عددها، شکل‌ها و بازی با ریاضی', img: '/landing/math.png', action: { kind: 'soon' } },
  { key: 'kangaroo', title: 'کانگورو', hint: 'معماها و چالش‌های ریاضی', img: '/landing/kangaroo.png', action: { kind: 'soon' } },
];

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [soonKey, setSoonKey] = React.useState<string | null>(null);

  const open = (s: Subject) => {
    if (s.action.kind === 'route') navigate(s.action.to);
    else if (s.action.kind === 'link') window.location.href = s.action.href;
    else {
      setSoonKey(s.key);
      window.setTimeout(() => setSoonKey((k) => (k === s.key ? null : k)), 2200);
    }
  };

  return (
    <div className="tichi" dir="rtl">
      <span className="tichi-star s1" aria-hidden="true">✦</span>
      <span className="tichi-star s2" aria-hidden="true">✧</span>
      <span className="tichi-star s3" aria-hidden="true">✦</span>
      <header className="tichi-header">
        <div className="tichi-brand" aria-label="تیچی">Ti<span>chi</span></div>
      </header>
      <main className="tichi-main">
        <section className="tichi-hero">
          <div className="tichi-intro">
            <span className="tichi-kicker">به دنیای تیچی خوش اومدی!</span>
            <h1>سلام دوست کوچولوی من!<br />من <span>تیچی</span> هستم.</h1>
            <p>امروز دوست داری با هم چی یاد بگیریم؟</p>
          </div>
          <img className="tichi-panda" src="/landing/tichi.png" alt="تیچی، معلم پاندای کوچک با عینک و کتاب" />
        </section>
        <h2 className="tichi-section-title">درس مورد علاقه‌ات رو انتخاب کن</h2>
        <nav className="tichi-grid" aria-label="انتخاب درس">
          {SUBJECTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => open(s)}
              className={`tichi-card ${s.key === 'persian' ? '' : s.key}`}
              aria-label={s.title}
            >
              <div className="tichi-art" aria-hidden="true"><img src={s.img} alt="" /></div>
              <h2>{s.title}</h2>
              <p>{s.hint}</p>
              <span className="tichi-go">بزن بریم <span aria-hidden="true">←</span></span>
              {s.action.kind === 'soon' && <span className="tichi-soon">به‌زودی</span>}
              {soonKey === s.key && <span role="status" className="tichi-toast">این بخش به‌زودی باز می‌شود</span>}
            </button>
          ))}
        </nav>
      </main>
      <footer className="tichi-footer">هر روز، یک چیز تازه یاد می‌گیریم!</footer>
    </div>
  );
};

export default Landing;
