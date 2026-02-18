import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const PILLARS = [
  {
    num: "01",
    stat: "₹800",
    statSub: "per AI-led 30-min interview",
    statVs: "vs ₹15,000+ for a human researcher",
    title: "AI can now interview at human quality — at cents per conversation",
    tag: "TECHNOLOGY UNLOCK",
  },
  {
    num: "02",
    stat: "₹10Cr+",
    statSub: "committed before validation",
    statVs: "Zepto, Swiggy, Meesho — all launching on dashboards",
    title: "Brands are committing crores with zero customer validation",
    tag: "MARKET URGENCY",
  },
  {
    num: "03",
    stat: "6–8 wks",
    statSub: "average research turnaround",
    statVs: "findings arrive after the decision was already made",
    title: "Traditional research firms can't compete — and they know it",
    tag: "INCUMBENT COLLAPSE",
  },
];

export default function WhyNowSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="whynow"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        <div className={`mb-16 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Why Now
          </p>
          <h2
            className={`font-black tracking-tight leading-tight ${
              isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"
            }`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            2024 changed everything.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>The window just opened.</span>
          </h2>
          <p className="mt-4 text-base max-w-xl" style={{ color: "hsl(var(--sq-muted))" }}>
            AI interviews at human quality. India's fastest brands flying blind. Incumbents broken by design.
          </p>
        </div>

        {/* 3 horizontal pillar strips */}
        <div className="space-y-4">
          {PILLARS.map((p, i) => (
            <div
              key={p.num}
              className={`relative rounded-2xl overflow-hidden transition-all duration-600 ${
                revealed ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"
              }`}
              style={{
                transitionDelay: `${i * 150}ms`,
                background: "hsl(var(--sq-card))",
                border: "1px solid hsl(var(--sq-subtle))",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)"
              }}
            >
              {/* Left orange accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: "hsl(var(--sq-orange))" }} />

              <div className="flex items-center gap-0 pl-6">
                {/* Stat block */}
                <div className="flex-shrink-0 py-6 pr-8 border-r" style={{ borderColor: "hsl(var(--sq-subtle))", minWidth: 160 }}>
                  <div className="font-black leading-none mb-1" style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", color: "hsl(var(--sq-orange))" }}>
                    {p.stat}
                  </div>
                  <div className="font-bold text-xs" style={{ color: "hsl(var(--sq-text))" }}>{p.statSub}</div>
                  <div className="text-xs mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>{p.statVs}</div>
                </div>

                {/* Title + tag */}
                <div className="flex-1 px-7 py-6">
                  <span className="inline-block font-black text-xs tracking-[0.15em] mb-2 px-2.5 py-1 rounded-full" style={{
                    background: "hsl(var(--sq-orange) / 0.08)",
                    color: "hsl(var(--sq-orange))"
                  }}>{p.tag}</span>
                  <h3 className={`font-black leading-snug ${isPresenter ? "text-xl" : "text-base sm:text-lg"}`}
                    style={{ color: "hsl(var(--sq-text))" }}>
                    {p.title}
                  </h3>
                </div>

                {/* Number badge — right side */}
                <div className="flex-shrink-0 pr-7 hidden sm:block">
                  <span className="font-black text-6xl" style={{ color: "hsl(var(--sq-orange) / 0.08)" }}>{p.num}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* India callout */}
        <div className={`mt-10 rounded-2xl px-7 py-5 transition-all duration-500 delay-600 ${revealed ? "opacity-100" : "opacity-0"}`}
          style={{ background: "hsl(var(--sq-orange) / 0.07)", border: "1px solid hsl(var(--sq-orange) / 0.2)" }}>
          <p className="font-black text-base" style={{ color: "hsl(var(--sq-orange))" }}>
            India: 4,000 consumer brands. Zero affordable research tools.{" "}
            <span style={{ color: "hsl(var(--sq-text))" }}>Perfect proving ground.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
