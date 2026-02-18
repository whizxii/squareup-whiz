import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

export default function BusinessModelSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="businessmodel"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        <div className={`grid ${isPresenter ? "grid-cols-2" : "lg:grid-cols-2"} gap-16 items-center`}>

          {/* Left — headline */}
          <div className={`transition-all duration-500 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="font-bold text-xs uppercase tracking-[0.2em] mb-5" style={{ color: "hsl(var(--sq-orange))" }}>
              Business Model
            </p>
            <h2 className={`font-black tracking-tight leading-[1.0] mb-6 ${isPresenter ? "text-5xl" : "text-[2.5rem] sm:text-[3rem]"}`}
              style={{ color: "hsl(var(--sq-text))" }}>
              ₹1–3L to start.<br />
              <span style={{ color: "hsl(var(--sq-orange))" }}>₹75K–1.5L/mo<br />once they're in.</span>
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--sq-muted))" }}>
              Agency charges ₹30–50L and takes 8 weeks.<br />We charge ₹1–3L and deliver in 7 days.<br />The ROI case writes itself.
            </p>

            {/* Unit economics */}
            <div className="mt-8 space-y-2">
              {[
                { label: "Cost per AI interview", val: "~₹800" },
                { label: "vs human researcher",   val: "₹15,000+" },
                { label: "Gross margin target",   val: "~70%" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between rounded-xl px-4 py-2.5"
                  style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
                  <span className="text-sm" style={{ color: "hsl(var(--sq-muted))" }}>{r.label}</span>
                  <span className="font-black text-sm" style={{ color: "hsl(var(--sq-orange))" }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — tier cards */}
          <div className={`space-y-4 transition-all duration-600 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

            {/* Per study */}
            <div className="rounded-2xl p-7"
              style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-black text-xs uppercase tracking-widest mb-1" style={{ color: "hsl(var(--sq-muted))" }}>Per Study</p>
                  <h3 className="font-black text-lg" style={{ color: "hsl(var(--sq-text))" }}>Deep Dive</h3>
                </div>
                <span className="font-black text-2xl" style={{ color: "hsl(var(--sq-orange))" }}>₹1–3L</span>
              </div>
              <div className="space-y-1.5">
                {[
                  "One focused decision. Full AI interview campaign.",
                  "Executive Insight Brief in 7 days",
                  "Severity scoring + risks + verbatim quotes",
                ].map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: "hsl(var(--sq-orange))" }}>→</span>
                    <p className="text-xs" style={{ color: "hsl(var(--sq-muted))" }}>{f}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscription — highlighted */}
            <div className="rounded-2xl p-7 relative overflow-hidden"
              style={{ background: "hsl(var(--sq-off-white))", border: "2px solid hsl(var(--sq-orange) / 0.5)" }}>
              <div className="absolute top-4 right-4">
                <span className="text-white text-xs font-black px-3 py-1 rounded-full"
                  style={{ background: "hsl(var(--sq-orange))" }}>Moat</span>
              </div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-black text-xs uppercase tracking-widest mb-1" style={{ color: "hsl(var(--sq-muted))" }}>Per Month</p>
                  <h3 className="font-black text-lg" style={{ color: "hsl(var(--sq-text))" }}>Always-On Intelligence</h3>
                </div>
                <div className="text-right">
                  <span className="font-black text-xl" style={{ color: "hsl(var(--sq-orange))" }}>₹75K–1.5L</span>
                  <p className="text-xs" style={{ color: "hsl(var(--sq-muted))" }}>/month</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {[
                  "Ongoing signal across campaigns, launches, CX",
                  "Monthly executive debrief — routed to each team",
                  "Data flywheel: every conversation trains our models",
                ].map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: "hsl(var(--sq-orange))" }}>✓</span>
                    <p className="text-xs" style={{ color: "hsl(var(--sq-text))" }}>{f}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
