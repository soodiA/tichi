import React from 'react';

interface PageBgProps {
  variant?: 'blue' | 'peach' | 'green' | 'purple';
}

const PageBg: React.FC<PageBgProps> = ({ variant = 'blue' }) => {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`pgSky-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#B8C4EE" />
          <stop offset="50%"  stopColor="#CDD6F7" />
          <stop offset="100%" stopColor="#DDE4FF" />
        </linearGradient>
        <linearGradient id={`pgHill-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6DC96D" />
          <stop offset="100%" stopColor="#4AAD4A" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="390" height="844" fill={`url(#pgSky-${variant})`} />

      {/* Distant mountains */}
      <ellipse cx="90"  cy="700" rx="190" ry="150" fill="#9DAAD6" opacity="0.40" />
      <ellipse cx="300" cy="720" rx="175" ry="140" fill="#A8B3D8" opacity="0.35" />

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
      <path d="M0 720 Q95 620 200 668 Q305 620 390 660 L390 844 L0 844 Z" fill={`url(#pgHill-${variant})`} opacity="0.85" />
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
