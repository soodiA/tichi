import React from 'react';

const SceneBg: React.FC = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    viewBox="0 0 390 844"
    preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Sky gradient */}
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#A8D4F5" />
        <stop offset="100%" stopColor="#C8E8FF" />
      </linearGradient>
      <linearGradient id="hill1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4CAF50" />
        <stop offset="100%" stopColor="#388E3C" />
      </linearGradient>
      <linearGradient id="hill2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#66BB6A" />
        <stop offset="100%" stopColor="#43A047" />
      </linearGradient>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#81C784" />
        <stop offset="100%" stopColor="#4CAF50" />
      </linearGradient>
    </defs>

    {/* Sky */}
    <rect width="390" height="844" fill="url(#sky)" />

    {/* Sun */}
    <circle cx="320" cy="90" r="45" fill="#FFE066" opacity="0.9" />
    <circle cx="320" cy="90" r="55" fill="#FFE066" opacity="0.25" />

    {/* Clouds */}
    {/* Cloud 1 */}
    <g opacity="0.92">
      <ellipse cx="80" cy="130" rx="48" ry="28" fill="white" />
      <ellipse cx="108" cy="118" rx="34" ry="26" fill="white" />
      <ellipse cx="52" cy="125" rx="28" ry="20" fill="white" />
    </g>
    {/* Cloud 2 */}
    <g opacity="0.88">
      <ellipse cx="270" cy="80" rx="55" ry="25" fill="white" />
      <ellipse cx="300" cy="68" rx="36" ry="24" fill="white" />
      <ellipse cx="245" cy="76" rx="30" ry="20" fill="white" />
    </g>
    {/* Cloud 3 (small) */}
    <g opacity="0.75">
      <ellipse cx="170" cy="170" rx="38" ry="18" fill="white" />
      <ellipse cx="192" cy="160" rx="24" ry="18" fill="white" />
    </g>

    {/* Back hill */}
    <ellipse cx="195" cy="780" rx="320" ry="200" fill="#81C784" opacity="0.6" />

    {/* Main hills */}
    <path d="M0 640 Q100 520 200 580 Q300 520 390 600 L390 844 L0 844 Z" fill="url(#hill1)" />
    <path d="M0 700 Q80 640 160 670 Q240 640 320 680 Q360 670 390 690 L390 844 L0 844 Z" fill="url(#hill2)" />

    {/* Ground */}
    <rect x="0" y="760" width="390" height="84" fill="url(#ground)" />

    {/* Flower 1 (big pink) */}
    <g transform="translate(185, 700)">
      <rect x="-4" y="-80" width="8" height="80" rx="4" fill="#388E3C" />
      {/* Petals */}
      {[0,45,90,135,180,225,270,315].map((deg, i) => (
        <ellipse
          key={i}
          cx={Math.cos((deg * Math.PI) / 180) * 22}
          cy={Math.sin((deg * Math.PI) / 180) * 22 - 80}
          rx="12" ry="8"
          fill="#F06292"
          transform={`rotate(${deg}, 0, -80)`}
          opacity="0.9"
        />
      ))}
      <circle cx="0" cy="-80" r="12" fill="#FFD54F" />
    </g>

    {/* Flower 2 (blue left) */}
    <g transform="translate(90, 730)">
      <rect x="-3" y="-55" width="6" height="55" rx="3" fill="#388E3C" />
      {[0,60,120,180,240,300].map((deg, i) => (
        <ellipse
          key={i}
          cx={Math.cos((deg * Math.PI) / 180) * 17}
          cy={Math.sin((deg * Math.PI) / 180) * 17 - 55}
          rx="9" ry="6"
          fill="#64B5F6"
          transform={`rotate(${deg}, 0, -55)`}
          opacity="0.9"
        />
      ))}
      <circle cx="0" cy="-55" r="9" fill="#FFF176" />
    </g>

    {/* Flower 3 (blue right) */}
    <g transform="translate(300, 720)">
      <rect x="-3" y="-60" width="6" height="60" rx="3" fill="#388E3C" />
      {[0,60,120,180,240,300].map((deg, i) => (
        <ellipse
          key={i}
          cx={Math.cos((deg * Math.PI) / 180) * 18}
          cy={Math.sin((deg * Math.PI) / 180) * 18 - 60}
          rx="10" ry="7"
          fill="#7E57C2"
          transform={`rotate(${deg}, 0, -60)`}
          opacity="0.85"
        />
      ))}
      <circle cx="0" cy="-60" r="9" fill="#FFE082" />
    </g>

    {/* Small flower 4 */}
    <g transform="translate(140, 750)">
      <rect x="-2" y="-38" width="4" height="38" rx="2" fill="#388E3C" />
      {[0,72,144,216,288].map((deg, i) => (
        <ellipse
          key={i}
          cx={Math.cos((deg * Math.PI) / 180) * 12}
          cy={Math.sin((deg * Math.PI) / 180) * 12 - 38}
          rx="7" ry="5"
          fill="#F48FB1"
          transform={`rotate(${deg}, 0, -38)`}
        />
      ))}
      <circle cx="0" cy="-38" r="7" fill="#FFF9C4" />
    </g>

    {/* Small flower 5 */}
    <g transform="translate(250, 748)">
      <rect x="-2" y="-40" width="4" height="40" rx="2" fill="#388E3C" />
      {[0,72,144,216,288].map((deg, i) => (
        <ellipse
          key={i}
          cx={Math.cos((deg * Math.PI) / 180) * 13}
          cy={Math.sin((deg * Math.PI) / 180) * 13 - 40}
          rx="7" ry="5"
          fill="#80DEEA"
          transform={`rotate(${deg}, 0, -40)`}
        />
      ))}
      <circle cx="0" cy="-40" r="6" fill="#FFF59D" />
    </g>

    {/* Confetti dots */}
    {[
      {x:60,y:340,c:'#F06292'},{x:330,y:300,c:'#64B5F6'},
      {x:45,y:420,c:'#FFD54F'},{x:350,y:400,c:'#81C784'},
      {x:110,y:280,c:'#CE93D8'},{x:280,y:350,c:'#FF8A65'},
      {x:200,y:260,c:'#F06292'},{x:160,y:440,c:'#64B5F6'},
    ].map((d, i) => (
      <circle key={i} cx={d.x} cy={d.y} r="5" fill={d.c} opacity="0.7" />
    ))}
  </svg>
);

export default SceneBg;
