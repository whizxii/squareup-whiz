import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

export default function SolutionSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="solution"
      className={`relative overflow-hidden ${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-5xl mx-auto relative z-10 w-full" ref={ref}>

        {/* Two-col: left headline, right before/after */}
        <div className={`grid ${isPresenter ? "grid-cols-2" : "lg:grid-cols-2"} gap-16 items-center`}>

          {/* Left — headline + ROI chips */}
          <div className={`transition-all duration-500 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="font-bold text-xs uppercase tracking-[0.2em] mb-5" style={{ color: "hsl(var(--sq-orange))" }}>
              The Solution
            </p>
            <h2
              className={`font-black tracking-tight leading-[1.0] mb-8 ${
                isPresenter ? "text-5xl" : "text-[2.5rem] sm:text-[3rem] lg:text-[3.5rem]"
              }`}
              style={{ color: "hsl(var(--sq-text))" }}
            >
              Not a survey.<br />Not a transcript.<br />
              <span style={{ color: "hsl(var(--sq-orange))" }}>A decision brief<br />in 7 days.</span>
            </h2>

            {/* 3 chips */}
            <div className="flex flex-col gap-2.5">
              {[
                { stat: "10×", label: "cheaper than a research agency" },
                { stat: "8×",  label: "faster than traditional research" },
                { stat: "100%", label: "traceable — every decision, every quote" },
              ].map((c) => (
                <div key={c.stat} className="flex items-center gap-4 rounded-xl px-5 py-3"
                  style={{ background: "hsl(var(--sq-off-white))", border: "1px solid hsl(var(--sq-subtle))" }}>
                  <span className="font-black text-xl flex-shrink-0" style={{ color: "hsl(var(--sq-orange))" }}>{c.stat}</span>
                  <span className="font-medium text-sm" style={{ color: "hsl(var(--sq-text))" }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Before/After */}
          <div className={`space-y-3 transition-all duration-700 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

            {/* Without */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <div className="h-0.5 bg-red-400 w-full" />
              <div className="p-6">
                <p className="font-black text-xs uppercase tracking-widest mb-5 text-red-800">Without SquareUp</p>
                <div className="space-y-3">
                  {[
                    ["6–8 weeks", "to get research you can trust"],
                    ["₹30–50L", "for a research agency"],
                    ["No trail", "decisions made on gut, no record why"],
                  ].map(([stat, desc]) => (
                    <div key={stat} className="flex items-baseline gap-3">
                      <span className="font-black text-sm text-red-700 flex-shrink-0 w-20">{stat}</span>
                      <span className="text-sm text-red-900/70">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* With */}
            <div className="rounded-2xl overflow-hidden" style={{
              background: "hsl(var(--sq-off-white))",
              border: "1.5px solid hsl(var(--sq-orange) / 0.3)"
            }}>
              <div className="h-0.5 w-full" style={{ background: "hsl(var(--sq-orange))" }} />
              <div className="p-6">
                <p className="font-black text-xs uppercase tracking-widest mb-5" style={{ color: "hsl(var(--sq-orange))" }}>
                  With SquareUp
                </p>
                <div className="space-y-3">
                  {[
                    ["7 days", "Insight Brief on your desk"],
                    ["₹1–3L", "fraction of a traditional firm"],
                    ["Full trail", "every decision tied to verbatim quotes"],
                  ].map(([stat, desc]) => (
                    <div key={stat} className="flex items-baseline gap-3">
                      <span className="font-black text-sm flex-shrink-0 w-20" style={{ color: "hsl(var(--sq-orange))" }}>{stat}</span>
                      <span className="text-sm" style={{ color: "hsl(var(--sq-text))" }}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
