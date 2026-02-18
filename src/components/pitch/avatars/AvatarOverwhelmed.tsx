// AvatarOverwhelmed — The Problem persona
// Clay-style SVG: Woman surrounded by floating tool icons (Slack, Sheets, Notion)
// Used in: Problem section

const AvatarOverwhelmed = ({ size = 240 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 240 240"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Overwhelmed researcher avatar"
  >
    {/* Ground shadow */}
    <ellipse cx="120" cy="222" rx="65" ry="11" fill="hsl(0,0%,0%)" opacity="0.09" />

    {/* Body */}
    <rect x="78" y="130" width="84" height="72" rx="24" fill="#FF6B35" />
    <path d="M112 130 L120 146 L128 130" fill="#E55A25" />

    {/* Neck */}
    <rect x="113" y="119" width="14" height="16" rx="7" fill="hsl(30,56%,77%)" />

    {/* Head */}
    <ellipse cx="120" cy="104" rx="30" ry="31" fill="hsl(30,56%,77%)" />

    {/* Hair */}
    <path d="M92 92 Q90 68 120 66 Q150 66 148 92 Q140 80 120 80 Q100 80 92 92Z" fill="#3D2314" />
    <path d="M92 92 Q88 112 90 132" stroke="#3D2314" strokeWidth="13" strokeLinecap="round" fill="none" />
    <path d="M148 92 Q152 112 150 132" stroke="#3D2314" strokeWidth="13" strokeLinecap="round" fill="none" />

    {/* Eyes — wide, overwhelmed */}
    <ellipse cx="109" cy="103" rx="5" ry="5.5" fill="#fff" />
    <ellipse cx="131" cy="103" rx="5" ry="5.5" fill="#fff" />
    <circle cx="110" cy="104" r="3" fill="#2D1A0E" />
    <circle cx="132" cy="104" r="3" fill="#2D1A0E" />
    <circle cx="111" cy="103" r="1.1" fill="#fff" />
    <circle cx="133" cy="103" r="1.1" fill="#fff" />

    {/* Stressed brows */}
    <path d="M103 93 Q109 90 115 93" stroke="#2D1A0E" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    <path d="M125 93 Q131 90 137 93" stroke="#2D1A0E" strokeWidth="2.2" strokeLinecap="round" fill="none" />

    {/* Overwhelmed mouth — slightly open */}
    <path d="M112 117 Q120 121 128 117" stroke="#C4896A" strokeWidth="2" strokeLinecap="round" fill="none" />
    <ellipse cx="120" cy="118" rx="5" ry="3" fill="#C4896A" opacity="0.5" />

    {/* Arms raised slightly */}
    <path d="M78 144 Q56 138 44 148" stroke="#FF6B35" strokeWidth="18" strokeLinecap="round" fill="none" />
    <ellipse cx="40" cy="150" rx="10" ry="9" fill="hsl(30,56%,77%)" />
    <path d="M162 144 Q184 138 196 148" stroke="#FF6B35" strokeWidth="18" strokeLinecap="round" fill="none" />
    <ellipse cx="200" cy="150" rx="10" ry="9" fill="hsl(30,56%,77%)" />

    {/* ── Slack icon bubble ── */}
    <g transform="translate(12, 52)">
      <rect x="0" y="0" width="42" height="42" rx="12" fill="#4A154B" filter="url(#shadow-tool)" />
      {/* Slack hashtag simplified */}
      <rect x="11" y="16" width="5" height="12" rx="2.5" fill="#E01E5A" />
      <rect x="26" y="16" width="5" height="12" rx="2.5" fill="#36C5F0" />
      <rect x="9" y="20" width="24" height="4.5" rx="2" fill="#2EB67D" />
      <rect x="9" y="28" width="24" height="4.5" rx="2" fill="#ECB22E" />
    </g>

    {/* ── Google Sheets icon bubble ── */}
    <g transform="translate(186, 62)">
      <rect x="0" y="0" width="42" height="42" rx="12" fill="#0F9D58" filter="url(#shadow-tool)" />
      {/* Sheet grid */}
      <rect x="8" y="8" width="26" height="26" rx="3" fill="white" opacity="0.15" />
      <line x1="8" y1="18" x2="34" y2="18" stroke="white" strokeWidth="1.5" opacity="0.6" />
      <line x1="8" y1="26" x2="34" y2="26" stroke="white" strokeWidth="1.5" opacity="0.6" />
      <line x1="20" y1="8" x2="20" y2="34" stroke="white" strokeWidth="1.5" opacity="0.6" />
      <rect x="10" y="10" width="8" height="6" rx="1" fill="white" opacity="0.5" />
    </g>

    {/* ── Notion icon bubble ── */}
    <g transform="translate(190, 118)">
      <rect x="0" y="0" width="42" height="42" rx="12" fill="#1A1A1A" filter="url(#shadow-tool)" />
      {/* Notion N */}
      <text x="9" y="30" fontSize="22" fontWeight="900" fill="white">N</text>
    </g>

    {/* ── Zendesk/ticket bubble (top center) ── */}
    <g transform="translate(148, 14)">
      <rect x="0" y="0" width="38" height="28" rx="10" fill="#03363D" filter="url(#shadow-tool)" />
      <text x="6" y="20" fontSize="17" fill="#BFFF00">🎫</text>
    </g>

    {/* ── Email/inbox bubble ── */}
    <g transform="translate(18, 110)">
      <rect x="0" y="0" width="38" height="28" rx="10" fill="#EA4335" filter="url(#shadow-tool)" />
      <path d="M5 8 L19 18 L33 8" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="5" y="8" width="28" height="16" rx="3" stroke="white" strokeWidth="1.5" fill="none" />
    </g>

    <defs>
      <filter id="shadow-tool" x="-15%" y="-15%" width="140%" height="150%">
        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.18" />
      </filter>
    </defs>
  </svg>
);

export default AvatarOverwhelmed;
