"use client";

export default function SquareUpLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 28"
      width="160"
      height="28"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="su-g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF5A36" />
          <stop offset="100%" stopColor="#FF914D" />
        </linearGradient>
        <linearGradient id="su-g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF3131" />
          <stop offset="100%" stopColor="#FF914D" />
        </linearGradient>
      </defs>
      {}
      <rect
        x="1" y="3" width="16" height="16" rx="3.5"
        transform="rotate(-12, 9, 11)"
        fill="url(#su-g1)" opacity="0.85"
      />
      <rect
        x="9" y="4" width="16" height="16" rx="3.5"
        transform="rotate(15, 17, 12)"
        fill="url(#su-g2)" opacity="0.9"
      />
      {}
      <text
        x="32" y="19"
        fontFamily="'Inter', system-ui, sans-serif"
        fontWeight="600"
        fontSize="15.5"
        letterSpacing="-0.03em"
        fill="currentColor"
      >
        Square Up
      </text>
    </svg>
  );
}
