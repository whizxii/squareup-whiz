import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

export default function BusinessModelSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="businessmodel"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-4xl mx-auto w-full" ref={ref}>

        {/* Header */}
        <div className={`mb-14 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Business Model
          </p>
          <h2
            className={`font-black tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            Simple pricing.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>Immediate ROI.</span>
          </h2>
          <p className="mt-3 text-base" style={{ color: "hsl(var(--sq-muted))" }}>
            A fraction of your monthly ad spend — to avoid expensive mistakes.
          </p>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 transition-all duration-600 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

          {/* Transactional */}
          <div className="rounded-3xl p-8" style={{
            background: "hsl(var(--sq-off-white))",
            border: "1px solid hsl(var(--sq-subtle))"
          }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-black text-xs uppercase tracking-widest mb-1" style={{ color: "hsl(var(--sq-muted))" }}>Per Study</p>
                <h3 className="font-black text-xl" style={{ color: "hsl(var(--sq-text))" }}>Deep Dive</h3>
              </div>
              <span className="font-black" style={{ fontSize: "1.75rem", color: "hsl(var(--sq-orange))" }}>₹1–3L</span>
            </div>
            <div className="space-y-3">
              {[
                "Focused validation for one decision",
                "Full AI-led interview campaign",
                "Executive Insight Brief in 7 days",
                "Severity scoring + validated risks",
              ].map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <span className="font-bold flex-shrink-0" style={{ color: "hsl(var(--sq-orange))" }}>→</span>
                  <p className="text-sm" style={{ color: "hsl(var(--sq-muted))" }}>{f}</p>
                </div>
              ))}
            </div>
            <p className="text-xs mt-5 font-medium" style={{ color: "hsl(var(--sq-muted))" }}>
              Entry point. One brief, one decision, full confidence.
            </p>
          </div>

          {/* Subscription — recommended */}
          <div className="rounded-3xl p-8 relative overflow-hidden" style={{
            background: "hsl(var(--sq-off-white))",
            border: "2px solid hsl(var(--sq-orange))"
          }}>
            <div className="absolute top-4 right-4">
              <span className="text-white text-xs font-black px-3 py-1 rounded-full"
                style={{ background: "hsl(var(--sq-orange))" }}>
                Recommended
              </span>
            </div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-black text-xs uppercase tracking-widest mb-1" style={{ color: "hsl(var(--sq-muted))" }}>Per Month</p>
                <h3 className="font-black text-xl" style={{ color: "hsl(var(--sq-text))" }}>Continuous Intelligence</h3>
              </div>
              <div className="text-right">
                <span className="font-black" style={{ fontSize: "1.5rem", color: "hsl(var(--sq-orange))" }}>₹75K–1.5L</span>
                <p className="text-xs font-bold" style={{ color: "hsl(var(--sq-muted))" }}>/month</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                "Always-on customer intelligence layer",
                "Calls, tickets, reviews, socials — unified",
                "Monthly executive debrief",
                "Full team access + workflow integration",
                "Data flywheel compounds over time",
              ].map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <span className="font-bold flex-shrink-0" style={{ color: "hsl(var(--sq-orange))" }}>✓</span>
                  <p className="text-sm" style={{ color: "hsl(var(--sq-text))" }}>{f}</p>
                </div>
              ))}
            </div>
            <p className="text-xs mt-5 font-medium" style={{ color: "hsl(var(--sq-muted))" }}>
              Where the moat builds. Switching cost grows with every brief.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
