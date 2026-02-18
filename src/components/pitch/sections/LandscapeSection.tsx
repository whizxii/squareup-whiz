import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const COMPETITORS = [
  { name: "Qualtrics",      x: 22, y: 72, size: 16 },
  { name: "Dovetail",       x: 30, y: 58, size: 14 },
  { name: "Zendesk",        x: 14, y: 60, size: 14 },
  { name: "SurveyMonkey",   x: 25, y: 82, size: 13 },
  { name: "Typeform",       x: 38, y: 74, size: 13 },
  { name: "UserTesting",    x: 45, y: 55, size: 14 },
];

const DIFF = [
  { label: "Qualtrics / SurveyMonkey", verdict: "Collects opinions. Low depth. No follow-up.", ok: false },
  { label: "Dovetail / Notion AI",      verdict: "Organizes recordings you already have. You still run the calls.", ok: false },
  { label: "Research Agencies",         verdict: "6–8 weeks. ₹30–50L. Findings arrive after the decision.", ok: false },
  { label: "SquareUp",                  verdict: "AI runs interviews. Generates signal on demand. Brief in 7 days.", ok: true },
];

export default function LandscapeSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="landscape"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        <div className={`mb-10 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Competitive Landscape
          </p>
          <h2 className={`font-black tracking-tight leading-[1.0] ${isPresenter ? "text-5xl" : "text-[2.5rem] sm:text-[3rem]"}`}
            style={{ color: "hsl(var(--sq-text))" }}>
            Every tool organizes data you already have.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>None generate new signal.</span>
          </h2>
        </div>

        <div className={`grid ${isPresenter ? "grid-cols-2" : "md:grid-cols-2"} gap-10 items-center transition-all duration-700 delay-200 ${revealed ? "opacity-100" : "opacity-0 translate-y-8"}`}>

          {/* Matrix */}
          <div className="relative mx-auto w-full" style={{ maxWidth: 440, aspectRatio: "1" }}>
            <svg viewBox="0 0 560 560" className="w-full h-full">
              {/* Quadrants */}
              <rect x="1" y="1" width="278" height="278" rx="10" fill="hsl(42,14%,97%)" />
              <rect x="281" y="1" width="278" height="278" rx="10" fill="hsl(18,100%,97%)" />
              <rect x="1" y="281" width="278" height="278" rx="10" fill="hsl(42,14%,97%)" />
              <rect x="281" y="281" width="278" height="278" rx="10" fill="hsl(42,14%,97%)" />

              {/* Axes */}
              <line x1="280" y1="10" x2="280" y2="550" stroke="hsl(42,14%,82%)" strokeWidth="1.5" strokeDasharray="4 3" />
              <line x1="10" y1="280" x2="550" y2="280" stroke="hsl(42,14%,82%)" strokeWidth="1.5" strokeDasharray="4 3" />

              {/* Labels */}
              <text x="280" y="12" textAnchor="middle" fontSize="10" fill="hsl(0,0%,50%)" fontWeight="700" fontFamily="sans-serif">▲ Drives Decisions</text>
              <text x="280" y="556" textAnchor="middle" fontSize="10" fill="hsl(0,0%,50%)" fontWeight="700" fontFamily="sans-serif">Passive ▼</text>
              <text x="8" y="284" textAnchor="middle" fontSize="10" fill="hsl(0,0%,50%)" fontWeight="700" fontFamily="sans-serif" transform="rotate(-90,8,280)">◀ Organizes</text>
              <text x="552" y="284" textAnchor="middle" fontSize="10" fill="hsl(0,0%,50%)" fontWeight="700" fontFamily="sans-serif" transform="rotate(90,552,280)">Generates ▶</text>

              {/* Competitors */}
              {COMPETITORS.map((c) => {
                const cx = (c.x / 100) * 560;
                const cy = (c.y / 100) * 560;
                return (
                  <g key={c.name}>
                    <circle cx={cx} cy={cy} r={c.size} fill="hsl(42,14%,75%)" opacity="0.7" />
                    <text x={cx} y={cy + c.size + 11} textAnchor="middle" fontSize="8" fill="hsl(0,0%,50%)" fontWeight="700" fontFamily="sans-serif">{c.name}</text>
                  </g>
                );
              })}

              {/* SquareUp */}
              <circle cx="455" cy="78" r="36" fill="hsl(18,100%,60%)" opacity="0.1" />
              <circle cx="455" cy="78" r="30" fill="hsl(18,100%,60%)" opacity="0.15" className="animate-ping-orange" style={{ transformOrigin: "455px 78px" }} />
              <circle cx="455" cy="78" r="24" fill="hsl(18,100%,60%)" />
              <text x="455" y="83" textAnchor="middle" fontSize="9" fill="white" fontWeight="900" fontFamily="sans-serif">SQ</text>
              <text x="455" y="120" textAnchor="middle" fontSize="12" fill="hsl(18,100%,38%)" fontWeight="900" fontFamily="sans-serif">SquareUp</text>
              <text x="455" y="134" textAnchor="middle" fontSize="8" fill="hsl(18,100%,50%)" fontWeight="600" fontFamily="sans-serif">Only player here</text>
            </svg>
          </div>

          {/* Diff list */}
          <div className="space-y-3">
            {DIFF.map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{
                  background: item.ok ? "hsl(var(--sq-orange) / 0.06)" : "hsl(var(--sq-off-white))",
                  border: `1px solid ${item.ok ? "hsl(var(--sq-orange) / 0.25)" : "hsl(var(--sq-subtle))"}`,
                }}>
                <span className="font-black flex-shrink-0 mt-0.5 text-sm" style={{ color: item.ok ? "hsl(var(--sq-orange))" : "hsl(0,60%,55%)" }}>
                  {item.ok ? "✓" : "✗"}
                </span>
                <div>
                  <p className="font-bold text-sm" style={{ color: item.ok ? "hsl(var(--sq-orange))" : "hsl(var(--sq-text))" }}>{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>{item.verdict}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
