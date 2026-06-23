import React from 'react';

interface PageBgProps {
  variant?: 'blue' | 'purple' | 'green' | 'peach';
}

const COLORS = {
  blue:   { sky1: '#B8C4EE', sky2: '#CDD6F7', sky3: '#DDE4FF', mtn1: '#9DAAD6', mtn2: '#A8B3D8' },
  purple: { sky1: '#C4B0F5', sky2: '#D9CCFF', sky3: '#EDE6FF', mtn1: '#9B84D4', mtn2: '#B09EE0' },
  green:  { sky1: '#A8D8C0', sky2: '#C2EAD6', sky3: '#D8F5E8', mtn1: '#7EC0A0', mtn2: '#96CEB4' },
  peach:  { sky1: '#F5CBA0', sky2: '#FAD9B8', sky3: '#FDEBD4', mtn1: '#D4A870', mtn2: '#E0BA8C' },
};

const PageBg: React.FC<PageBgProps> = ({ variant = 'blue' }) => {
  const c = COLORS[variant];
  const id = variant;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`pgSky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={c.sky1} />
          <stop offset="50%"  stopColor={c.sky2} />
          <stop offset="100%" stopColor={c.sky3} />
        </linearGradient>
        <linearGradient id={`pgHill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6DC96D" />
          <stop offset="100%" stopColor="#4AAD4A" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="390" height="844" fill={`url(#pgSky-${id})`} />

      {/* Distant mountains */}
      <ellipse cx="90"  cy="700" rx="190" ry="150" fill={c.mtn1} opacity="0.45" />
      <ellipse cx="300" cy="720" rx="175" ry="140" fill={c.mtn2} opacity="0.38" />

      {/* Clouds */}
      <g opacity="0.88">
        <ellipse cx="72"  cy="115" rx="52" ry="28" fill="white" />
        <ellipse cx="104" cy="102" rx="36" ry="28" fill="white" />
        <ellipse cx="42"  cy="110" rx="30" ry="20" fill="white" />
      </g>
      <g opacity="0.82">
        <ellipse cx="295" cy="70"  rx="58" ry="26" fill="white" />
        <ellipse cx="330" cy="58"  rx="38" ry="25" fill="white" />
        <ellipse cx="262" cy="66"  rx="32" ry="21" fill="white" />
      </g>
      <g opacity="0.65">
        <ellipse cx="178" cy="160" rx="40" ry="19" fill="white" />
        <ellipse cx="205" cy="149" rx="26" ry="18" fill="white" />
      </g>

      {/* Green hills at bottom */}
      <path d="M0 720 Q95 620 200 668 Q305 620 390 660 L390 844 L0 844 Z" fill={`url(#pgHill-${id})`} opacity="0.85" />
      <rect x="0" y="800" width="390" height="44" fill="#5AAE5A" opacity="0.7" />

      {/* Small flowers */}
      <g transform="translate(80,790)">
        {[0,72,144,216,288].map((deg, i) => (
          <ellipse key={i}
            cx={Math.cos((deg*Math.PI)/180)*10}
            cy={Math.sin((deg*Math.PI)/180)*10-30}
            rx="6" ry="4" fill="#F48FB1"
            transform={`rotate(${deg},0,-30)`} />
        ))}
        <circle cx="0" cy="-30" r="6" fill="#FDD835" />
        <rect x="-2" y="-30" width="4" height="30" rx="2" fill="#3D9140" />
      </g>
      <g transform="translate(310,785)">
        {[0,60,120,180,240,300].map((deg, i) => (
          <ellipse key={i}
            cx={Math.cos((deg*Math.PI)/180)*12}
            cy={Math.sin((deg*Math.PI)/180)*12-35}
            rx="7" ry="5" fill="#80DEEA"
            transform={`rotate(${deg},0,-35)`} />
        ))}
        <circle cx="0" cy="-35" r="7" fill="#FFF176" />
        <rect x="-2" y="-35" width="4" height="35" rx="2" fill="#3D9140" />
      </g>

      {/* Confetti dots */}
      {[
        {x:50, y:300,c:'#F48FB1',r:4},{x:340,y:270,c:'#A5D6F5',r:3},
        {x:38, y:400,c:'#FDD835',r:3},{x:358,y:380,c:'#A5D6A7',r:4},
        {x:108,y:255,c:'#CE93D8',r:3},{x:270,y:330,c:'#FFB74D',r:3},
      ].map((d,i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} opacity="0.65" />
      ))}
    </svg>
  );
};

export default PageBg;
