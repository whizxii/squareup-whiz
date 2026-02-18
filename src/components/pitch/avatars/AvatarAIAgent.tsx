// AvatarAIAgent — Friendly AI agent with headset, clay style
// Used in: How It Works step 2, AI Demo section

const AvatarAIAgent = ({ size = 200 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="AI Agent avatar"
  >
    {/* Glow behind */}
    <circle cx="100" cy="95" r="60" fill="#FF6B35" opacity="0.07" />

    {/* Body — rounded robot clay body */}
    <rect x="58" y="116" width="84" height="60" rx="28" fill="#FF6B35" />
    {/* Chest panel */}
    <rect x="74" y="128" width="52" height="34" rx="10" fill="#E55A25" />
    {/* Chest LED lights */}
    <circle cx="86" cy="138" r="4" fill="#FFAA4D" />
    <circle cx="100" cy="138" r="4" fill="#4ADE80" />
    <circle cx="114" cy="138" r="4" fill="#60A5FA" />
    {/* Chest line */}
    <rect x="80" y="148" width="40" height="3" rx="2" fill="#FF6B35" opacity="0.5" />
    <rect x="80" y="155" width="28" height="3" rx="2" fill="#FF6B35" opacity="0.35" />

    {/* Neck connector */}
    <rect x="90" y="106" width="20" height="16" rx="6" fill="#E55A25" />

    {/* Head — rounded square robot head */}
    <rect x="62" y="58" width="76" height="56" rx="22" fill="#FF6B35" />

    {/* Antenna */}
    <rect x="97" y="42" width="6" height="20" rx="3" fill="#FFAA4D" />
    <circle cx="100" cy="40" r="7" fill="#FFAA4D" />
    <circle cx="100" cy="40" r="4" fill="#FF6B35" />

    {/* Headset arc */}
    <path d="M66 80 Q66 52 100 52 Q134 52 134 80" stroke="#E55A25" strokeWidth="5" fill="none" strokeLinecap="round" />
    {/* Ear cups */}
    <rect x="57" y="76" width="16" height="22" rx="8" fill="#E55A25" />
    <rect x="127" y="76" width="16" height="22" rx="8" fill="#E55A25" />
    {/* Mic boom */}
    <path d="M127 90 Q140 96 142 108" stroke="#E55A25" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <circle cx="142" cy="110" r="5" fill="#FFAA4D" />

    {/* Eyes — friendly glowing screens */}
    <rect x="74" y="72" width="20" height="14" rx="6" fill="#0D0D0D" />
    <rect x="106" y="72" width="20" height="14" rx="6" fill="#0D0D0D" />
    {/* Eye glow */}
    <rect x="76" y="74" width="16" height="10" rx="4" fill="#60A5FA" opacity="0.9" />
    <rect x="108" y="74" width="16" height="10" rx="4" fill="#60A5FA" opacity="0.9" />
    {/* Scan line */}
    <rect x="78" y="78" width="12" height="2" rx="1" fill="white" opacity="0.7" />
    <rect x="110" y="78" width="12" height="2" rx="1" fill="white" opacity="0.7" />

    {/* Mouth — friendly speaker grille */}
    <rect x="78" y="96" width="44" height="10" rx="5" fill="#E55A25" />
    <rect x="84" y="99" width="6" height="4" rx="2" fill="#FF6B35" />
    <rect x="94" y="99" width="6" height="4" rx="2" fill="#FF6B35" />
    <rect x="104" y="99" width="6" height="4" rx="2" fill="#FF6B35" />
    <rect x="114" y="99" width="6" height="4" rx="2" fill="#FF6B35" />

    {/* Arms */}
    <path d="M58 130 Q40 136 36 154" stroke="#FF6B35" strokeWidth="16" strokeLinecap="round" fill="none" />
    <rect x="27" y="152" width="18" height="14" rx="7" fill="#E55A25" />
    <path d="M142 130 Q160 136 164 154" stroke="#FF6B35" strokeWidth="16" strokeLinecap="round" fill="none" />
    <rect x="155" y="152" width="18" height="14" rx="7" fill="#E55A25" />

    {/* Floating sparkle elements */}
    <circle cx="28" cy="68" r="3" fill="#FFAA4D" opacity="0.8" />
    <circle cx="172" cy="80" r="4" fill="#FFAA4D" opacity="0.6" />
    <circle cx="20" cy="110" r="2" fill="#FF6B35" opacity="0.5" />
    <path d="M168 58 L172 66 L168 74 L164 66Z" fill="#FFAA4D" opacity="0.7" />
  </svg>
);

export default AvatarAIAgent;
