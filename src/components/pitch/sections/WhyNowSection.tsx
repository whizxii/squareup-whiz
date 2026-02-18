import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const PILLARS = [
  {
    num: "01",
    title: "AI can now interview at human quality — at cents per conversation",
    body: "GPT-4-class models probe and synthesise at human depth. The technology arrived in 2024.",
    stat: "~₹800",
    statLabel: "cost per AI-led 30-min interview vs ₹15,000+ for a human researcher",
  },
  {
    num: "02",
    title: "Brands are committing crores with zero customer validation",
    body: "CAC is rising. Teams at Zepto, Swiggy, Meesho launch on dashboards and gut feel.",
    stat: "₹10Cr+",
    statLabel: "average investment before validation happens",
  },
  {
    num: "03",
    title: "Traditional research firms can't compete — and they know it",
    body: "6–8 weeks. ₹30–50L. Findings arrive after the decision was already made.",
    stat: "6–8 weeks",
    statLabel: "average time-to-insight from a traditional research agency",
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

        <div className={`mb-14 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Why Now
          </p>
          <h2
            className={`font-black tracking-tight leading-tight ${
              isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"
            }`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            India is the right market to prove this.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>Then take it everywhere.</span>
          </h2>
          <p className="mt-4 text-base max-w-2xl" style={{ color: "hsl(var(--sq-muted))" }}>
            The density of consumer brands, the pace of decision-making, and the complete absence of affordable customer research tools — India is the perfect proving ground.
          </p>
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
                background: "hsl(var(--sq-card))",
                border: "1px solid hsl(var(--sq-subtle))"
              }}
            >
              {/* Number badge */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black text-sm"
                style={{ background: "hsl(var(--sq-orange) / 0.1)", color: "hsl(var(--sq-orange))" }}>
                {p.num}
              </div>

              <div className="flex-1">
                <h3 className={`font-black leading-snug mb-2 ${isPresenter ? "text-2xl" : "text-lg sm:text-xl"}`}
                  style={{ color: "hsl(var(--sq-text))" }}>
                  {p.title}
                </h3>
                <p className="leading-relaxed text-sm sm:text-base mb-4" style={{ color: "hsl(var(--sq-muted))" }}>
                  {p.body}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-sm" style={{ color: "hsl(var(--sq-orange))" }}>{p.stat}</span>
                  <span className="text-xs" style={{ color: "hsl(var(--sq-muted))" }}>— {p.statLabel}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
