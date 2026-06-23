import React from 'react';

const SceneBg: React.FC = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    viewBox="0 0 390 844"
    preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#B8C4EE" />
        <stop offset="55%" stopColor="#CDD6F7" />
        <stop offset="100%" stopColor="#DDE4FF" />
      </linearGradient>
      <linearGradient id="mountain1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#9BA8D4" />
        <stop offset="100%" stopColor="#7B8BBF" />
      </linearGradient>
      <linearGradient id="mountain2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#A8B3D8" />
        <stop offset="100%" stopColor="#8A97C8" />
      </linearGradient>
      <linearGradient id="hill1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#5CB85C" />
        <stop offset="100%" stopColor="#3D9140" />
      </linearGradient>
      <linearGradient id="hill2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6DC96D" />
        <stop offset="100%" stopColor="#4AAD4A" />
      </linearGradient>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7BC87B" />
        <stop offset="100%" stopColor="#5AAE5A" />
      </linearGradient>
    </defs>

    {/* Sky */}
    <rect width="390" height="844" fill="url(#sky)" />

    {/* Distant mountains (purple-toned) */}
    <ellipse cx="100" cy="600" rx="200" ry="160" fill="url(#mountain1)" opacity="0.55" />
    <ellipse cx="300" cy="620" rx="180" ry="150" fill="url(#mountain2)" opacity="0.50" />
    <ellipse cx="195" cy="640" rx="250" ry="130" fill="#9DAAD6" opacity="0.35" />

    {/* Clouds */}
    <g opacity="0.95">
      <ellipse cx="75" cy="120" rx="55" ry="30" fill="white" />
      <ellipse cx="108" cy="105" rx="38" ry="30" fill="white" />
      <ellipse cx="44"  cy="115" rx="32" ry="22" fill="white" />
    </g>
    <g opacity="0.90">
      <ellipse cx="290" cy="75"  rx="60" ry="27" fill="white" />
      <ellipse cx="325" cy="62"  rx="40" ry="26" fill="white" />
      <ellipse cx="260" cy="71"  rx="34" ry="22" fill="white" />
    </g>
    <g opacity="0.75">
      <ellipse cx="175" cy="165" rx="42" ry="20" fill="white" />
      <ellipse cx="202" cy="153" rx="28" ry="20" fill="white" />
    </g>

    {/* Front hills */}
    <path d="M0 660 Q95 540 200 600 Q305 540 390 615 L390 844 L0 844 Z" fill="url(#hill1)" />
    <path d="M0 720 Q80 660 165 688 Q245 660 325 695 Q362 682 390 705 L390 844 L0 844 Z" fill="url(#hill2)" />

    {/* Ground strip */}
    <rect x="0" y="774" width="390" height="70" fill="url(#ground)" />

    {/* Big pink/red flower center */}
    <g transform="translate(195,715)">
      <rect x="-5" y="-95" width="10" height="95" rx="5" fill="#3D9140" />
      {/* Leaf */}
      <ellipse cx="14" cy="-55" rx="16" ry="8" fill="#4CAF50" transform="rotate(30,14,-55)" />
      {[0,40,80,120,160,200,240,280,320].map((deg, i) => (
        <ellipse
          key={i}
          cx={Math.cos((deg * Math.PI) / 180) * 25}
          cy={Math.sin((deg * Math.PI) / 180) * 25 - 95}
          rx="14" ry="9"
          fill="#E53935"
          transform={`rotate(${deg}, 0, -95)`}
          opacity="0.92"
        />
      ))}
      <circle cx="0" cy="-95" r="14" fill="#FDD835" />
      <circle cx="0" cy="-95" r="6" fill="#F9A825" />
    </g>

    {/* Blue flower left */}
    <g transform="translate(88,742)">
      <rect x="-3" y="-58" width="6" height="58" rx="3" fill="#3D9140" />
      {[0,60,120,180,240,300].map((deg, i) => (
        <ellipse
          key={i}
          cx={Math.cos((deg * Math.PI) / 180) * 18}
          cy={Math.sin((deg * Math.PI) / 180) * 18 - 58}
          rx="10" ry="7"
          fill="#5C9FE0"
          transform={`rotate(${deg}, 0, -58)`}
          opacity="0.92"
        />
      ))}
      <circle cx="0" cy="-58" r="9" fill="#FFF176" />
    </g>

    {/* Blue flower right */}
    <g transform="translate(303,735)">
      <rect x="-3" y="-62" width="6" height="62" rx="3" fill="#3D9140" />
      {[0,60,120,180,240,300].map((deg, i) => (
        <ellipse
          key={i}
          cx={Math.cos((deg * Math.PI) / 180) * 19}
          cy={Math.sin((deg * Math.PI) / 180) * 19 - 62}
          rx="11" ry="7"
          fill="#5C9FE0"
          transform={`rotate(${deg}, 0, -62)`}
          opacity="0.88"
        />
      ))}
      <circle cx="0" cy="-62" r="9" fill="#FFF176" />
    </g>

    {/* Small pink flower left */}
    <g transform="translate(145,758)">
      <rect x="-2" y="-40" width="4" height="40" rx="2" fill="#3D9140" />
      {[0,72,144,216,288].map((deg, i) => (
        <ellipse
          key={i}
          cx={Math.cos((deg * Math.PI) / 180) * 12}
          cy={Math.sin((deg * Math.PI) / 180) * 12 - 40}
          rx="7" ry="5"
          fill="#F48FB1"
          transform={`rotate(${deg}, 0, -40)`}
        />
      ))}
      <circle cx="0" cy="-40" r="7" fill="#FFF9C4" />
    </g>

    {/* Small pink flower right */}
    <g transform="translate(248,755)">
      <rect x="-2" y="-42" width="4" height="42" rx="2" fill="#3D9140" />
      {[0,72,144,216,288].map((deg, i) => (
        <ellipse
          key={i}
          cx={Math.cos((deg * Math.PI) / 180) * 13}
          cy={Math.sin((deg * Math.PI) / 180) * 13 - 42}
          rx="7" ry="5"
          fill="#CE93D8"
          transform={`rotate(${deg}, 0, -42)`}
        />
      ))}
      <circle cx="0" cy="-42" r="6" fill="#FFF59D" />
    </g>

    {/* Confetti dots */}
    {[
      {x:55, y:320, c:'#F48FB1', r:5},{x:335,y:285,c:'#A5D6F5',r:4},
      {x:40, y:415, c:'#FDD835',r:4},{x:355,y:390,c:'#A5D6A7',r:5},
      {x:115,y:270, c:'#CE93D8',r:4},{x:275,y:340,c:'#FFB74D',r:4},
      {x:200,y:250, c:'#F48FB1',r:3},{x:162,y:430,c:'#80DEEA', r:4},
      {x:310,y:250, c:'#FDD835',r:3},{x:70, y:200, c:'#A5D6F5',r:3},
    ].map((d, i) => (
      <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} opacity="0.75" />
    ))}
  </svg>
);

export default SceneBg;
