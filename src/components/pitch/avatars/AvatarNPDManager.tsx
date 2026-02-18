// AvatarNPDManager — NPD / Product Manager
// Clay-style SVG: Man in orange shirt, holding product box with ?, vault behind him
// Pain: "6 months of dev on the line. Real signal or intuition?"

const AvatarNPDManager = ({ size = 220 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 220 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="NPD Manager avatar"
  >
    {/* Ground shadow */}
    <ellipse cx="110" cy="205" rx="58" ry="10" fill="hsl(0,0%,0%)" opacity="0.10" />

    {/* ── Vault door (behind character) ── */}
    <rect x="18" y="72" width="72" height="90" rx="12" fill="#4A4A4A" />
    <circle cx="54" cy="117" r="28" fill="#3A3A3A" stroke="#2A2A2A" strokeWidth="3" />
    <circle cx="54" cy="117" r="20" fill="#555" />
    <circle cx="54" cy="117" r="12" fill="#444" />
    {/* Vault spokes */}
    <line x1="54" y1="97" x2="54" y2="137" stroke="#666" strokeWidth="3" strokeLinecap="round" />
    <line x1="34" y1="117" x2="74" y2="117" stroke="#666" strokeWidth="3" strokeLinecap="round" />
    <line x1="40" y1="103" x2="68" y2="131" stroke="#666" strokeWidth="3" strokeLinecap="round" />
    <line x1="68" y1="103" x2="40" y2="131" stroke="#666" strokeWidth="3" strokeLinecap="round" />
    {/* Vault handle */}
    <circle cx="54" cy="117" r="5" fill="#FF6B35" />
    {/* Vault lock bolts */}
    <circle cx="18" cy="80" r="4" fill="#555" />
    <circle cx="90" cy="80" r="4" fill="#555" />
    <circle cx="18" cy="155" r="4" fill="#555" />
    <circle cx="90" cy="155" r="4" fill="#555" />

    {/* Body / torso — orange shirt */}
    <rect x="72" y="118" width="80" height="68" rx="22" fill="#FF6B35" />
    {/* Shirt detail */}
    <path d="M104 118 L112 132 L120 118" fill="#E55A25" />

    {/* Neck */}
    <rect x="104" y="107" width="14" height="16" rx="7" fill="hsl(28,50%,72%)" />

    {/* Head — man, slightly broader */}
    <ellipse cx="111" cy="92" rx="31" ry="30" fill="hsl(28,50%,72%)" />

    {/* Hair — short, dark */}
    <path d="M82 82 Q82 60 111 60 Q140 60 140 80" fill="#2D1A0E" />
    <path d="M82 82 Q84 74 88 76" fill="#2D1A0E" />

    {/* Ears */}
    <ellipse cx="80" cy="93" rx="6" ry="8" fill="hsl(28,50%,72%)" />
    <ellipse cx="142" cy="93" rx="6" ry="8" fill="hsl(28,50%,72%)" />

    {/* Eyes — cautious, slightly widened */}
    <ellipse cx="100" cy="91" rx="4.5" ry="5" fill="#fff" />
    <ellipse cx="122" cy="91" rx="4.5" ry="5" fill="#fff" />
    <circle cx="101" cy="92" r="2.8" fill="#2D1A0E" />
    <circle cx="123" cy="92" r="2.8" fill="#2D1A0E" />
    <circle cx="102" cy="91" r="1" fill="#fff" />
    <circle cx="124" cy="91" r="1" fill="#fff" />

    {/* Eyebrows raised slightly — "should I commit?" */}
    <path d="M94 83 Q100 80 106 83" stroke="#2D1A0E" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M116 83 Q122 80 128 83" stroke="#2D1A0E" strokeWidth="2" strokeLinecap="round" fill="none" />

    {/* Mouth — neutral, considering */}
    <path d="M103 105 Q111 108 119 105" stroke="#B87A60" strokeWidth="2" strokeLinecap="round" fill="none" />

    {/* Left arm — slightly open, holding box */}
    <path d="M72 132 Q52 140 46 162" stroke="#FF6B35" strokeWidth="18" strokeLinecap="round" fill="none" />
    <ellipse cx="46" cy="166" rx="10" ry="9" fill="hsl(28,50%,72%)" />

    {/* Right arm */}
    <path d="M152 132 Q168 142 168 162" stroke="#FF6B35" strokeWidth="18" strokeLinecap="round" fill="none" />
    <ellipse cx="168" cy="166" rx="10" ry="9" fill="hsl(28,50%,72%)" />

    {/* ── Product box floating between hands ── */}
    <g transform="translate(82, 148)">
      <rect x="0" y="0" width="48" height="40" rx="8" fill="#FF6B35" filter="url(#shadow-box)" />
      {/* Box top flap */}
      <path d="M0 8 L24 0 L48 8" fill="#E55A25" />
      {/* Question mark */}
      <text x="16" y="32" fontSize="22" fontWeight="900" fill="white" opacity="0.95">?</text>
      {/* Box edge lines */}
      <line x1="0" y1="8" x2="0" y2="40" stroke="#E55A25" strokeWidth="1.5" />
      <line x1="48" y1="8" x2="48" y2="40" stroke="#E55A25" strokeWidth="1.5" />
    </g>

    <defs>
      <filter id="shadow-box" x="-10%" y="-10%" width="130%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.14" />
      </filter>
    </defs>
  </svg>
);

export default AvatarNPDManager;
