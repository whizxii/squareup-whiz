// AvatarCXLead — CX / Customer Experience Lead
// Clay-style SVG: Woman with speech bubbles (noise) + orange signal bubble + funnel
// Pain: "100 tickets. One real problem. Can't find it fast enough."

const AvatarCXLead = ({ size = 220 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 220 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="CX Lead avatar"
  >
    {/* Ground shadow */}
    <ellipse cx="110" cy="205" rx="52" ry="9" fill="hsl(0,0%,0%)" opacity="0.09" />

    {/* Body / torso — orange top */}
    <rect x="70" y="120" width="80" height="68" rx="22" fill="#FF6B35" />
    {/* Neckline V */}
    <path d="M102 120 L110 136 L118 120" fill="#E55A25" />

    {/* Neck */}
    <rect x="103" y="110" width="14" height="15" rx="7" fill="hsl(32,54%,74%)" />

    {/* Head */}
    <ellipse cx="110" cy="95" rx="30" ry="31" fill="hsl(32,54%,74%)" />

    {/* Hair — shoulder length, warm brown */}
    <path d="M82 83 Q79 58 110 57 Q141 58 138 83 Q132 70 110 70 Q88 70 82 83Z" fill="#6B3A2A" />
    {/* Hair sides flowing down */}
    <path d="M82 83 Q76 105 79 125" stroke="#6B3A2A" strokeWidth="14" strokeLinecap="round" fill="none" />
    <path d="M138 83 Q144 105 141 125" stroke="#6B3A2A" strokeWidth="14" strokeLinecap="round" fill="none" />

    {/* Eyes — focused, ready to act */}
    <ellipse cx="99" cy="93" rx="4.5" ry="4.5" fill="#fff" />
    <ellipse cx="121" cy="93" rx="4.5" ry="4.5" fill="#fff" />
    <circle cx="100" cy="94" r="2.8" fill="#2D1A0E" />
    <circle cx="122" cy="94" r="2.8" fill="#2D1A0E" />
    <circle cx="101" cy="93" r="1" fill="#fff" />
    <circle cx="123" cy="93" r="1" fill="#fff" />

    {/* Focused brows */}
    <path d="M93 84 Q99 82 105 84" stroke="#4A2410" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M115 84 Q121 82 127 84" stroke="#4A2410" strokeWidth="2" strokeLinecap="round" fill="none" />

    {/* Calm but searching expression */}
    <path d="M103 106 Q110 109 117 106" stroke="#C4896A" strokeWidth="1.8" strokeLinecap="round" fill="none" />

    {/* Left arm — holding funnel */}
    <path d="M70 134 Q50 148 46 170" stroke="#FF6B35" strokeWidth="17" strokeLinecap="round" fill="none" />
    <ellipse cx="46" cy="174" rx="9" ry="9" fill="hsl(32,54%,74%)" />

    {/* Right arm extended */}
    <path d="M150 134 Q166 148 164 168" stroke="#FF6B35" strokeWidth="17" strokeLinecap="round" fill="none" />
    <ellipse cx="164" cy="172" rx="9" ry="9" fill="hsl(32,54%,74%)" />

    {/* ── Funnel in left hand ── */}
    <g transform="translate(28, 162)">
      <path d="M2 2 L22 2 L14 14 L14 22 L10 22 L10 14 Z" fill="#FF6B35" opacity="0.9" />
      <line x1="0" y1="0" x2="24" y2="0" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* ── Floating noise speech bubbles (gray, faded) ── */}
    {/* Small bubble top-left */}
    <g transform="translate(10, 52)">
      <rect x="0" y="0" width="38" height="22" rx="10" fill="#D0CFC9" opacity="0.55" />
      <path d="M8 22 L4 30 L16 22" fill="#D0CFC9" opacity="0.55" />
      <rect x="6" y="7" width="26" height="3" rx="2" fill="#A0A09A" opacity="0.5" />
      <rect x="6" y="13" width="18" height="3" rx="2" fill="#A0A09A" opacity="0.5" />
    </g>
    {/* Tiny bubble mid-left */}
    <g transform="translate(4, 90)">
      <rect x="0" y="0" width="28" height="18" rx="8" fill="#D0CFC9" opacity="0.4" />
      <rect x="5" y="5" width="18" height="2.5" rx="1.5" fill="#A0A09A" opacity="0.4" />
      <rect x="5" y="10" width="12" height="2.5" rx="1.5" fill="#A0A09A" opacity="0.4" />
    </g>
    {/* Medium bubble top-right */}
    <g transform="translate(158, 42)">
      <rect x="0" y="0" width="44" height="26" rx="12" fill="#D0CFC9" opacity="0.5" />
      <path d="M36 26 L42 34 L28 26" fill="#D0CFC9" opacity="0.5" />
      <rect x="7" y="7" width="30" height="3" rx="2" fill="#A0A09A" opacity="0.5" />
      <rect x="7" y="14" width="20" height="3" rx="2" fill="#A0A09A" opacity="0.5" />
    </g>

    {/* ── THE SIGNAL — orange highlighted bubble ── */}
    <g transform="translate(148, 92)">
      <rect x="0" y="0" width="54" height="34" rx="12" fill="#FF6B35" filter="url(#shadow-signal)" />
      <path d="M10 34 L6 44 L22 34" fill="#FF6B35" />
      {/* Star / signal icon */}
      <text x="8" y="22" fontSize="13" fill="white">⭐</text>
      <rect x="26" y="8" width="20" height="3" rx="2" fill="white" opacity="0.9" />
      <rect x="26" y="15" width="14" height="3" rx="2" fill="white" opacity="0.75" />
      <rect x="26" y="22" width="18" height="3" rx="2" fill="white" opacity="0.75" />
    </g>

    <defs>
      <filter id="shadow-signal" x="-10%" y="-10%" width="130%" height="150%">
        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#FF6B35" floodOpacity="0.30" />
      </filter>
    </defs>
  </svg>
);

export default AvatarCXLead;
