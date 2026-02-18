// AvatarGrowthLead — Growth / Marketing Lead
// Clay-style SVG: Woman in orange blazer, leaning toward a flatline bar chart
// Pain: "Running campaigns blind. Which segment actually drove that lift?"

const AvatarGrowthLead = ({ size = 220 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 220 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Growth Lead avatar"
  >
    {/* Ground shadow */}
    <ellipse cx="110" cy="205" rx="58" ry="10" fill="hsl(0,0%,0%)" opacity="0.10" />

    {/* Body / torso — orange blazer */}
    <rect x="68" y="118" width="84" height="72" rx="24" fill="#FF6B35" />
    {/* Blazer lapels */}
    <path d="M100 118 L110 138 L120 118" fill="#E55A25" />
    {/* White shirt underneath */}
    <rect x="102" y="118" width="16" height="32" rx="4" fill="#FFF5F0" />

    {/* Neck */}
    <rect x="103" y="108" width="14" height="16" rx="7" fill="hsl(30,56%,77%)" />

    {/* Head */}
    <ellipse cx="110" cy="94" rx="30" ry="32" fill="hsl(30,56%,77%)" />

    {/* Hair — pulled back, professional */}
    <path d="M82 82 Q80 60 110 58 Q140 58 138 82 Q130 72 110 72 Q90 72 82 82Z" fill="#3D2314" />
    {/* Bun */}
    <circle cx="110" cy="62" r="10" fill="#3D2314" />

    {/* Eyes */}
    <ellipse cx="100" cy="92" rx="4" ry="4.5" fill="#fff" />
    <ellipse cx="120" cy="92" rx="4" ry="4.5" fill="#fff" />
    <circle cx="101" cy="93" r="2.5" fill="#2D1A0E" />
    <circle cx="121" cy="93" r="2.5" fill="#2D1A0E" />
    {/* Eye shine */}
    <circle cx="102" cy="92" r="0.9" fill="#fff" />
    <circle cx="122" cy="92" r="0.9" fill="#fff" />

    {/* Thoughtful expression — slight raise of one brow */}
    <path d="M95 85 Q100 83 105 85" stroke="#3D2314" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M115 84 Q120 82.5 125 84" stroke="#3D2314" strokeWidth="1.5" strokeLinecap="round" fill="none" />

    {/* Mouth — slight analytical pursed look */}
    <path d="M103 104 Q110 107 117 104" stroke="#C4896A" strokeWidth="1.8" strokeLinecap="round" fill="none" />

    {/* Left arm — leaning forward toward chart */}
    <path d="M68 130 Q48 140 46 158" stroke="#FF6B35" strokeWidth="18" strokeLinecap="round" fill="none" />
    <ellipse cx="46" cy="162" rx="9" ry="9" fill="hsl(30,56%,77%)" />

    {/* Right arm */}
    <path d="M152 130 Q165 145 162 160" stroke="#FF6B35" strokeWidth="18" strokeLinecap="round" fill="none" />
    <ellipse cx="162" cy="164" rx="9" ry="9" fill="hsl(30,56%,77%)" />

    {/* ── Floating bar chart ── */}
    <g transform="translate(148, 58)">
      {/* Chart BG card */}
      <rect x="0" y="0" width="58" height="46" rx="8" fill="white" filter="url(#shadow-chart)" />
      {/* Bars */}
      <rect x="8"  y="28" width="9" height="10" rx="2" fill="#D0CFC9" />
      <rect x="21" y="18" width="9" height="20" rx="2" fill="#FF6B35" />
      <rect x="34" y="12" width="9" height="26" rx="2" fill="#FF6B35" />
      {/* Flatline arrow — up then flat */}
      <path d="M8 30 L24 18 L40 14 L52 14" stroke="#3D2314" strokeWidth="1.8" strokeLinecap="round" fill="none" strokeDasharray="2 1" />
      <circle cx="52" cy="14" r="3" fill="#FFAA4D" />
      {/* Question mark on last point */}
      <text x="48" y="11" fontSize="6" fill="#4A4A4A" fontWeight="700">?</text>
    </g>

    {/* Magnifying glass floating */}
    <g transform="translate(152, 106)">
      <circle cx="10" cy="10" r="8" stroke="#FF6B35" strokeWidth="2.5" fill="white" opacity="0.95" />
      <line x1="16" y1="16" x2="22" y2="22" stroke="#FF6B35" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="10" cy="10" r="4" fill="#FFF5F0" />
    </g>

    {/* Drop shadow filter */}
    <defs>
      <filter id="shadow-chart" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.10" />
      </filter>
    </defs>
  </svg>
);

export default AvatarGrowthLead;
