import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const PILLARS = [
  {
    num: "01",
    title: "AI crossed the threshold",
    body: "LLMs can now conduct human-quality interviews at scale — at cents per conversation. This wasn't possible 24 months ago. The window just opened.",
    stat: "100x cheaper than human researchers",
    statLabel: "cost per insight",
  },
  {
    num: "02",
    title: "Teams are making ₹10Cr decisions with ₹0 of real customer signal",
    body: "Budgets are tighter. CAC is rising. Consumer brands across QSR, platforms, and direct channels are committing millions to launches built on internal metrics and gut feel. When it goes wrong, it burns runway and credibility.",
    stat: "72% of product launches",
    statLabel: "fail due to poor customer understanding",
  },
  {
    num: "03",
    title: "The old research model is broken beyond repair",
    body: "6–8 week timelines. ₹40L+ price tags. Findings that arrive after the decision was already made. Research firms are being disrupted by the same AI that's disrupting everything else.",
    stat: "6–8 weeks",
    statLabel: "average time-to-insight with traditional research",
  },
];

export default function WhyNowSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="whynow"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-dark))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        {/* Header — on dark */}
        <div className={`mb-14 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Why Now
          </p>
          <h2
            className={`font-black text-white tracking-tight leading-tight ${
              isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"
            }`}
          >
            Three forces converging.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>Right now.</span>
          </h2>
        </div>

        <div className="space-y-4">
          {PILLARS.map((p, i) => (
            <div
              key={p.num}
              className={`relative rounded-2xl p-7 overflow-hidden flex gap-6 items-start transition-all duration-600 ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{
                transitionDelay: `${i * 160}ms`,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)"
              }}
            >
              {/* Large number watermark */}
              <span
                className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-[7rem] leading-none select-none pointer-events-none"
                style={{ color: "hsl(var(--sq-orange) / 0.05)" }}
              >
                {p.num}
              </span>

              {/* Number badge */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black text-sm"
                style={{ background: "hsl(var(--sq-orange) / 0.15)", color: "hsl(var(--sq-orange))" }}>
                {p.num}
              </div>

              <div className="flex-1 relative z-10">
                <h3 className={`font-black text-white leading-snug mb-2 ${isPresenter ? "text-2xl" : "text-lg sm:text-xl"}`}>
                  {p.title}
                </h3>
                <p className="leading-relaxed text-sm sm:text-base mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {p.body}
                </p>
                {/* Inline stat */}
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-sm" style={{ color: "hsl(var(--sq-amber))" }}>{p.stat}</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>— {p.statLabel}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
