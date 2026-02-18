import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const PILLARS = [
  {
    stat: "₹800",
    statSub: "per AI-led 30-min interview",
    statVs: "vs ₹15,000+ for a human researcher",
    title: "AI can now interview at human quality — for cents per conversation",
    tag: "TECHNOLOGY UNLOCK",
  },
  {
    stat: "₹10Cr+",
    statSub: "committed before validation",
    statVs: "Zepto, Swiggy, Meesho launching on dashboards",
    title: "India's fastest brands are flying blind at crore scale",
    tag: "MARKET URGENCY",
  },
  {
    stat: "6–8 wks",
    statSub: "average research turnaround",
    statVs: "findings arrive after the decision was made",
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
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        <div className={`mb-14 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>Why Now</p>
          <h2 className={`font-black tracking-tight leading-[1.0] ${isPresenter ? "text-5xl" : "text-[2.5rem] sm:text-[3rem]"}`}
            style={{ color: "hsl(var(--sq-text))" }}>
            2024 changed everything.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>The window just opened.</span>
          </h2>
        </div>

        <div className="space-y-4">
          {PILLARS.map((p, i) => (
            <div key={i}
              className={`relative rounded-2xl overflow-hidden transition-all duration-600 ${
                revealed ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"
              }`}
              style={{
                transitionDelay: `${i * 150}ms`,
                background: "hsl(var(--sq-off-white))",
                border: "1px solid hsl(var(--sq-subtle))",
              }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: "hsl(var(--sq-orange))" }} />
              <div className="flex items-center gap-0 pl-6">
                {/* Stat */}
                <div className="flex-shrink-0 py-6 pr-8 border-r" style={{ borderColor: "hsl(var(--sq-subtle))", minWidth: 150 }}>
                  <div className="font-black leading-none mb-1"
                    style={{ fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)", color: "hsl(var(--sq-orange))" }}>
                    {p.stat}
                  </div>
                  <div className="font-bold text-xs" style={{ color: "hsl(var(--sq-text))" }}>{p.statSub}</div>
                  <div className="text-xs mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>{p.statVs}</div>
                </div>
                {/* Content */}
                <div className="flex-1 px-7 py-6">
                  <span className="inline-block font-black text-xs tracking-widest mb-2 px-2.5 py-1 rounded-full"
                    style={{ background: "hsl(var(--sq-orange) / 0.08)", color: "hsl(var(--sq-orange))" }}>
                    {p.tag}
                  </span>
                  <h3 className={`font-black leading-snug ${isPresenter ? "text-xl" : "text-sm sm:text-base"}`}
                    style={{ color: "hsl(var(--sq-text))" }}>
                    {p.title}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-8 rounded-2xl px-7 py-5 transition-all duration-500 delay-600 ${revealed ? "opacity-100" : "opacity-0"}`}
          style={{ background: "hsl(var(--sq-orange) / 0.06)", border: "1px solid hsl(var(--sq-orange) / 0.2)" }}>
          <p className="font-black text-base" style={{ color: "hsl(var(--sq-orange))" }}>
            India: 4,000 consumer brands. Zero affordable research tools.{" "}
            <span style={{ color: "hsl(var(--sq-text))" }}>Perfect proving ground.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
