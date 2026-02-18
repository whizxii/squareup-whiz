import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

export default function SolutionSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="solution"
      className={`relative overflow-hidden ${isPresenter ? "h-full flex items-center px-20" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-5xl mx-auto relative z-10 w-full" ref={ref}>

        {/* Header */}
        <div className={`mb-14 text-center transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            The Fix
          </p>
          <h2
            className={`font-black tracking-tight leading-tight max-w-3xl mx-auto ${
              isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"
            }`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            Not a survey. Not a transcript.<br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>A decision-ready brief in 7 days.</span>
          </h2>
        </div>

        {/* Wedge thesis — above comparison */}
        <div className={`mb-8 rounded-2xl px-7 py-5 text-center transition-all duration-500 delay-100 ${revealed ? "opacity-100" : "opacity-0"}`}
          style={{ background: "hsl(var(--sq-orange) / 0.07)", border: "1px solid hsl(var(--sq-orange) / 0.2)" }}>
          <p className="font-black text-base" style={{ color: "hsl(var(--sq-text))" }}>
            Every decision, traceable.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>Every team gets their brief.</span>
          </p>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--sq-muted))" }}>
            Growth → campaign pointers. Product → launch risks. Founders → the full picture.
          </p>
        </div>

        {/* Before / After */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-700 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

          {/* Before */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <div className="h-1 bg-red-400 w-full" />
            <div className="p-7">
              <p className="font-black text-xs uppercase tracking-[0.15em] mb-7 text-red-800">
                Without SquareUp
              </p>
              <div className="space-y-5">
                {[
                  { stat: "No trail", desc: "Decisions made on calls — no record of why" },
                  { stat: "Gut feel", desc: "Drives go/no-go at most consumer brands" },
                  { stat: "6–8 weeks", desc: "To get research you can trust" },
                  { stat: "₹30–50L", desc: "For a research agency, if you can afford one" },
                ].map((item) => (
                  <div key={item.stat} className="flex items-baseline gap-3">
                    <span className="font-black text-red-700 text-sm flex-shrink-0 w-24">{item.stat}</span>
                    <span className="text-sm text-red-900/80">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* After */}
          <div className="rounded-2xl overflow-hidden" style={{
            background: "hsl(var(--sq-orange) / 0.05)",
            border: "1px solid hsl(var(--sq-orange) / 0.25)"
          }}>
            <div className="h-1 w-full" style={{ background: "hsl(var(--sq-orange))" }} />
            <div className="p-7">
              <p className="font-black text-xs uppercase tracking-[0.15em] mb-7" style={{ color: "hsl(var(--sq-orange))" }}>
                With SquareUp
              </p>
              <div className="space-y-5">
                {[
                  { stat: "Full audit trail", desc: "Every decision tied to verbatim quotes + severity scores" },
                  { stat: "Real signal", desc: "From AI-led conversations, not internal guesses" },
                  { stat: "7 days", desc: "Insight Brief on your desk" },
                  { stat: "₹1–3L", desc: "Fraction of a traditional research firm" },
                ].map((item) => (
                  <div key={item.stat} className="flex items-baseline gap-3">
                    <span className="font-black text-sm flex-shrink-0 w-28" style={{ color: "hsl(var(--sq-orange))" }}>{item.stat}</span>
                    <span className="text-sm" style={{ color: "hsl(var(--sq-text))" }}>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ROI chip */}
        <div className={`mt-6 flex justify-center gap-4 transition-all duration-500 delay-500 ${revealed ? "opacity-100" : "opacity-0"}`}>
          {["10x cheaper", "8x faster", "100% traceable"].map((chip) => (
            <span key={chip} className="font-black text-xs px-4 py-2 rounded-full" style={{
              background: "hsl(var(--sq-card))",
              border: "1px solid hsl(var(--sq-subtle))",
              color: "hsl(var(--sq-text))"
            }}>
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
