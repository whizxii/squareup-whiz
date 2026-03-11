import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const PILLARS = [
  {
    stat: "90%",
    statLabel: "Cost Drop",
    statSub: "Voice AI costs dropped 90% in 18 months",
    statVs: "Multilingual AI interviews became viable in 2024 — this wasn't possible in 2023. What cost ₹50K per study now costs under ₹5K.",
    title: "Technology Unlock",
    tag: "NOW POSSIBLE",
  },
  {
    stat: "57%",
    statLabel: "",
    statSub: "Of researchers report growing demand for qual (ESOMAR)",
    statVs: "83% of orgs plan to invest in AI for research in 2025 (Qualtrics). Yet no platform delivers structured customer intelligence for mid-market brands.",
    title: "The Demand Surge",
    tag: "PROVEN DEMAND",
  },
  {
    stat: "$5.3M",
    statLabel: "",
    statSub: "Raised by Conveo.ai (YC S24) — validating the category globally",
    statVs: "Conveo targets Unilever & P&G. Nobody is building this for India's consumer brands — FMCG, platforms, D2C. The whitespace is wide open.",
    title: "Category Validated",
    tag: "GLOBAL SIGNAL",
  },
  {
    stat: "125M",
    statLabel: "",
    statSub: "New online shoppers in India in 3 years",
    statVs: "Millennials + Gen Z = 70% of India's digital consumer base. Consumer behavior is shifting faster than brands can track. Quarterly studies can't keep up — brands need continuous signal.",
    title: "The Consumer Explosion",
    tag: "SEISMIC SHIFT",
  },
];

export default function WhyNowSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter" || mode === "download");

  return (
    <section
      id="whynow"
      className={`${isPresenter ? "min-h-screen flex items-center px-16" : "py-32 px-8 sm:px-16"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-6xl mx-auto w-full" ref={ref}>

        <div className={`${isPresenter ? "mb-8" : "mb-16"} text-center transition-all duration-700 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>The Catalyst</p>
          <h2 className={`font-black tracking-tight leading-[1.05] ${isPresenter ? "text-5xl" : "text-4xl sm:text-5xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}>
            Four forces just converged.<br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>The window is ~18 months.</span>
          </h2>
        </div>

        <div className={`grid ${isPresenter ? "grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"} gap-6`}>
          {PILLARS.map((p, i) => (
            <div key={i}
              className={`relative rounded-3xl overflow-hidden transition-all duration-700 ${isPresenter ? "p-5" : "p-8"} ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              style={{
                transitionDelay: `${i * 150}ms`,
                background: "hsl(var(--sq-off-white))",
                border: "1px solid hsl(var(--sq-subtle))",
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "hsl(var(--sq-orange))" }} />

              <div className={isPresenter ? "mb-4" : "mb-8"}>
                <span className="inline-block font-black text-[10px] tracking-widest mb-4 px-3 py-1.5 rounded-full"
                  style={{ background: "hsl(var(--sq-orange) / 0.1)", color: "hsl(var(--sq-orange))" }}>
                  {p.tag}
                </span>
                <h3 className={`font-black leading-snug ${isPresenter ? "text-base" : "text-xl"}`} style={{ color: "hsl(var(--sq-text))" }}>
                  {p.title}
                </h3>
              </div>

              <div className={`border-t ${isPresenter ? "pt-4" : "pt-6"}`} style={{ borderColor: "hsl(var(--sq-subtle))" }}>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className={`${isPresenter ? "text-4xl" : "sq-stat-section"} sq-glow-text font-black leading-none`}
                    style={{ color: "hsl(var(--sq-orange))" }}>
                    {p.stat}
                  </div>
                  {p.statLabel && (
                    <div className={`${isPresenter ? "text-xl" : "text-2xl"} font-black`} style={{ color: "hsl(var(--sq-orange))" }}>
                      {p.statLabel}
                    </div>
                  )}
                </div>
                <div className={`font-bold ${isPresenter ? "text-xs" : "text-sm"} mb-1`} style={{ color: "hsl(var(--sq-text))" }}>{p.statSub}</div>
                <div className="text-xs font-semibold" style={{ color: "hsl(var(--sq-muted))" }}>{p.statVs}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Convergence statement */}
        <div className={`mt-8 text-center transition-all duration-500 delay-500 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="inline-block rounded-2xl px-8 py-5"
            style={{ background: "hsl(var(--sq-orange) / 0.06)", border: "1px solid hsl(var(--sq-orange) / 0.2)" }}>
            <p className="font-black text-sm" style={{ color: "hsl(var(--sq-text))" }}>
              These forces converged in 2024–25.{" "}
              <span style={{ color: "hsl(var(--sq-orange))" }}>
                The window to build the category-defining platform in India is ~18 months before global players localize.
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
