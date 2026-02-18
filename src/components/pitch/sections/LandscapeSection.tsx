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

        <div className={`mb-10 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Competitive Landscape
          </p>
          <h2
            className={`font-black tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            Every tool organizes feedback you already have.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>None generate new signal.</span>
          </h2>
          <p className="mt-3 text-base max-w-xl" style={{ color: "hsl(var(--sq-muted))" }}>
            Qualtrics, Dovetail, Typeform — all passive. They wait for data to arrive. SquareUp goes and gets it.
          </p>
        </div>

        <div className={`grid ${isPresenter ? "grid-cols-2" : "md:grid-cols-2"} gap-10 items-center transition-all duration-700 delay-200 ${revealed ? "opacity-100" : "opacity-0 translate-y-8"}`}>
          {/* Matrix */}
          <div className="relative mx-auto w-full" style={{ maxWidth: 480, aspectRatio: "1" }}>
            <svg viewBox="0 0 560 560" className="w-full h-full">
              <rect x="1" y="1" width="278" height="278" rx="12" ry="12" fill="hsl(0,0%,98%)" />
              <rect x="281" y="1" width="278" height="278" rx="12" ry="12" fill="hsl(18,100%,60%,0.06)" />
              <rect x="1" y="281" width="278" height="278" rx="12" ry="12" fill="hsl(0,0%,96%)" />
              <rect x="281" y="281" width="278" height="278" rx="12" ry="12" fill="hsl(0,0%,95%)" />

              <line x1="280" y1="10" x2="280" y2="550" stroke="hsl(0,0%,82%)" strokeWidth="1.5" strokeDasharray="4 3" />
              <line x1="10" y1="280" x2="550" y2="280" stroke="hsl(0,0%,82%)" strokeWidth="1.5" strokeDasharray="4 3" />

              <text x="280" y="10" textAnchor="middle" fontSize="10" fill="hsl(0,0%,55%)" fontWeight="700" fontFamily="sans-serif">▲ Drives Decisions</text>
              <text x="280" y="556" textAnchor="middle" fontSize="10" fill="hsl(0,0%,55%)" fontWeight="700" fontFamily="sans-serif">Passive ▼</text>
              <text x="8" y="284" textAnchor="middle" fontSize="10" fill="hsl(0,0%,55%)" fontWeight="700" fontFamily="sans-serif" transform="rotate(-90,8,280)">◀ Organizes Existing</text>
              <text x="552" y="284" textAnchor="middle" fontSize="10" fill="hsl(0,0%,55%)" fontWeight="700" fontFamily="sans-serif" transform="rotate(90,552,280)">Generates New Signal ▶</text>

              <text x="60" y="50" fontSize="9" fill="hsl(0,0%,70%)" fontWeight="600" fontFamily="sans-serif">Organizes + Drives</text>
              <text x="310" y="50" fontSize="9" fill="hsl(18,100%,50%)" fontWeight="700" fontFamily="sans-serif">Generates + Drives</text>
              <text x="60" y="540" fontSize="9" fill="hsl(0,0%,70%)" fontWeight="600" fontFamily="sans-serif">Organizes + Passive</text>
              <text x="310" y="540" fontSize="9" fill="hsl(0,0%,70%)" fontWeight="600" fontFamily="sans-serif">Generates + Passive</text>

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

              <circle cx="455" cy="78" r="38" fill="hsl(18,100%,60%)" opacity="0.12" />
              <circle cx="455" cy="78" r="32" fill="hsl(18,100%,60%)" opacity="0.15" className="animate-ping-orange" style={{ transformOrigin: "455px 78px" }} />
              <circle cx="455" cy="78" r="26" fill="hsl(18,100%,60%)" />
              <text x="455" y="83" textAnchor="middle" fontSize="9" fill="white" fontWeight="900" fontFamily="sans-serif">SQ</text>
              <text x="455" y="122" textAnchor="middle" fontSize="13" fill="hsl(18,100%,38%)" fontWeight="900" fontFamily="sans-serif">SquareUp</text>
              <text x="455" y="137" textAnchor="middle" fontSize="9" fill="hsl(18,100%,50%)" fontWeight="600" fontFamily="sans-serif">Only player here</text>
            </svg>
          </div>

          {/* Differentiator list */}
          <div className="space-y-4">
            {[
              { label: "Qualtrics / SurveyMonkey", verdict: "Collects opinions. Low depth. No follow-up.", icon: "✗" },
              { label: "Dovetail / Notion AI", verdict: "Organizes recordings you already have. You still need to run the calls.", icon: "✗" },
              { label: "UserTesting", verdict: "Consumer UX testing. Single-session. Not decision-research.", icon: "✗" },
              { label: "Research Agencies", verdict: "6–8 weeks. ₹30–50L. Findings arrive after the decision was made.", icon: "✗" },
              { label: "SquareUp", verdict: "AI runs the interviews. Generates signal on demand. Insight Brief in 7 days.", icon: "✓", highlight: true },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-xl px-4 py-3" style={{
                background: item.highlight ? "hsl(var(--sq-orange) / 0.07)" : "hsl(var(--sq-off-white))",
                border: `1px solid ${item.highlight ? "hsl(var(--sq-orange) / 0.25)" : "hsl(var(--sq-subtle))"}`,
              }}>
                <span className="font-black flex-shrink-0 mt-0.5" style={{ color: item.highlight ? "hsl(var(--sq-orange))" : "#B91C1C" }}>{item.icon}</span>
                <div>
                  <p className="font-bold text-sm" style={{ color: item.highlight ? "hsl(var(--sq-orange))" : "hsl(var(--sq-text))" }}>{item.label}</p>
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
