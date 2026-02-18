import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const COMPETITORS = [
  { name: "Qualtrics", x: 22, y: 72, size: 18 },
  { name: "Dovetail", x: 30, y: 58, size: 16 },
  { name: "Zendesk", x: 14, y: 60, size: 16 },
  { name: "SurveyMonkey", x: 25, y: 82, size: 14 },
  { name: "Typeform", x: 38, y: 74, size: 14 },
  { name: "UserTesting", x: 45, y: 55, size: 15 },
];

export default function LandscapeSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="landscape"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        {/* Header */}
        <div className={`mb-12 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Competitive Landscape
          </p>
          <h2
            className={`font-black tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            Everyone organizes feedback.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>Nobody generates it.</span>
          </h2>
          <p className="mt-3 text-base" style={{ color: "hsl(var(--sq-muted))" }}>
            SquareUp is the only system that actively creates decision-grade signal from scratch.
          </p>
        </div>

        <div className={`transition-all duration-700 delay-200 ${revealed ? "opacity-100" : "opacity-0 translate-y-8"}`}>
          <div className="relative mx-auto" style={{ maxWidth: 560, aspectRatio: "1" }}>
            <svg viewBox="0 0 560 560" className="w-full h-full">
              {/* Quadrant fills */}
              <rect x="1" y="1" width="278" height="278" rx="12" ry="12" fill="hsl(0,0%,98%)" />
              <rect x="281" y="1" width="278" height="278" rx="12" ry="12" fill="hsl(18,100%,60%,0.06)" />
              <rect x="1" y="281" width="278" height="278" rx="12" ry="12" fill="hsl(0,0%,96%)" />
              <rect x="281" y="281" width="278" height="278" rx="12" ry="12" fill="hsl(0,0%,95%)" />

              {/* Axes */}
              <line x1="280" y1="10" x2="280" y2="550" stroke="hsl(0,0%,82%)" strokeWidth="1.5" strokeDasharray="4 3" />
              <line x1="10" y1="280" x2="550" y2="280" stroke="hsl(0,0%,82%)" strokeWidth="1.5" strokeDasharray="4 3" />

              {/* Axis labels */}
              <text x="280" y="10" textAnchor="middle" fontSize="10" fill="hsl(0,0%,55%)" fontWeight="700" fontFamily="sans-serif">▲ Drives Decisions</text>
              <text x="280" y="556" textAnchor="middle" fontSize="10" fill="hsl(0,0%,55%)" fontWeight="700" fontFamily="sans-serif">Passive / Reactive ▼</text>
              <text x="8" y="284" textAnchor="middle" fontSize="10" fill="hsl(0,0%,55%)" fontWeight="700" fontFamily="sans-serif" transform="rotate(-90,8,280)">◀ Organizes Existing Data</text>
              <text x="552" y="284" textAnchor="middle" fontSize="10" fill="hsl(0,0%,55%)" fontWeight="700" fontFamily="sans-serif" transform="rotate(90,552,280)">Generates New Signal ▶</text>

              {/* Quadrant labels */}
              <text x="60" y="50" fontSize="9" fill="hsl(0,0%,70%)" fontWeight="600" fontFamily="sans-serif">Organizes + Drives</text>
              <text x="310" y="50" fontSize="9" fill="hsl(18,100%,50%)" fontWeight="700" fontFamily="sans-serif">Generates + Drives</text>
              <text x="60" y="540" fontSize="9" fill="hsl(0,0%,70%)" fontWeight="600" fontFamily="sans-serif">Organizes + Passive</text>
              <text x="310" y="540" fontSize="9" fill="hsl(0,0%,70%)" fontWeight="600" fontFamily="sans-serif">Generates + Passive</text>

              {/* Competitor dots */}
              {COMPETITORS.map((c) => {
                const cx = (c.x / 100) * 560;
                const cy = (c.y / 100) * 560;
                return (
                  <g key={c.name}>
                    <circle cx={cx} cy={cy} r={c.size} fill="hsl(0,0%,78%)" opacity="0.8" />
                    <text x={cx} y={cy + c.size + 12} textAnchor="middle" fontSize="9" fill="hsl(0,0%,50%)" fontWeight="700" fontFamily="sans-serif">{c.name}</text>
                  </g>
                );
              })}

              {/* SquareUp — dominant, top-right */}
              <circle cx="455" cy="78" r="38" fill="hsl(18,100%,60%)" opacity="0.12" />
              <circle cx="455" cy="78" r="32" fill="hsl(18,100%,60%)" opacity="0.15" className="animate-ping-orange" style={{ transformOrigin: "455px 78px" }} />
              <circle cx="455" cy="78" r="26" fill="hsl(18,100%,60%)" />
              <text x="455" y="83" textAnchor="middle" fontSize="9" fill="white" fontWeight="900" fontFamily="sans-serif">SQ</text>
              <text x="455" y="122" textAnchor="middle" fontSize="13" fill="hsl(18,100%,38%)" fontWeight="900" fontFamily="sans-serif">SquareUp</text>
              <text x="455" y="137" textAnchor="middle" fontSize="9" fill="hsl(18,100%,50%)" fontWeight="600" fontFamily="sans-serif">Only player here</text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
