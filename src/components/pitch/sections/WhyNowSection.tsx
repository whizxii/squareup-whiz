import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const PILLARS = [
  {
    stat: "10x+",
    statLabel: "Cheaper",
    statSub: "Natural, multilingual, adaptive AI interviews",
    statVs: "Traditional qual: $5K–50K per study. SquareUp: under $1K — AI collapsed the cost structure.",
    title: "Technology Unlock",
    tag: "NOW POSSIBLE",
  },
  {
    stat: "~0",
    statLabel: "",
    statSub: "Companies have a structured customer intelligence layer",
    statVs: "This only works with a compounding customer intelligence repository. Almost no company has built one. The infrastructure didn't exist — until now.",
    title: "The Missing Layer",
    tag: "GREENFIELD",
  },
  {
    stat: "—",
    statLabel: "",
    statSub: "No platform owns the full customer truth loop",
    statVs: "Some tools run interviews. Others organize notes. No single platform generates signal and delivers decisions end-to-end.",
    title: "The Structural Whitespace",
    tag: "WHITESPACE",
  },
  {
    stat: "Gen Z",
    statLabel: "",
    statSub: "Forcing brands to rethink everything",
    statVs: "Gen Z is forcing brands to rethink packaging, copy, positioning — everything. Legacy playbooks don't work. Brands need continuous, rapid customer understanding to keep up — not quarterly studies.",
    title: "The Generational Reset",
    tag: "SEISMIC SHIFT",
  },
];

export default function WhyNowSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter");

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
            What was previously impossible <br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>has just become reality.</span>
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
      </div>
    </section>
  );
}
