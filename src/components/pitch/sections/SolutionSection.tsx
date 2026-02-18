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
        <div className={`mb-14 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            What We Do
          </p>
          <h2
            className={`font-black tracking-tight leading-tight max-w-3xl ${
              isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"
            }`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            SquareUp runs AI customer interviews<br />
            and delivers a{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>decision-ready brief in 7 days.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: "hsl(var(--sq-muted))" }}>
            Not a survey. Not a transcript. An Insight Brief — with severity scores, validated risks, and a recommended next step.
            Your team gets clarity, not homework.
          </p>
        </div>

        {/* Before / After */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-700 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

          {/* Before */}
          <div className="rounded-2xl p-7 relative overflow-hidden" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-400" />
            <p className="font-black text-xs uppercase tracking-[0.15em] mb-6 text-red-800">
              Without SquareUp
            </p>
        <div className="space-y-4">
              {[
                { stat: "No trail", desc: "decisions made on calls — no record of why" },
                { stat: "Gut feel", desc: "drives go/no-go calls at most consumer brands" },
                { stat: "6–8 weeks", desc: "to get research you can trust" },
                { stat: "₹30–50L", desc: "for a research agency, if you can afford one" },
              ].map((item) => (
                <div key={item.stat} className="flex items-baseline gap-3">
                  <span className="font-black text-red-700 text-sm flex-shrink-0 w-28">{item.stat}</span>
                  <span className="text-sm text-red-900">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* After */}
          <div className="rounded-2xl p-7 relative overflow-hidden" style={{
            background: "hsl(var(--sq-orange) / 0.05)",
            border: "1px solid hsl(var(--sq-orange) / 0.2)"
          }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "hsl(var(--sq-orange))" }} />
            <p className="font-black text-xs uppercase tracking-[0.15em] mb-6" style={{ color: "hsl(var(--sq-orange))" }}>
              With SquareUp
            </p>
            <div className="space-y-4">
              {[
                { stat: "Full audit trail", desc: "every decision tied to verbatim quotes and severity scores" },
                { stat: "Real signal", desc: "from AI-led conversations, not internal guesses" },
                { stat: "7 days", desc: "Insight Brief on your desk" },
                { stat: "₹1–3L", desc: "fraction of a traditional firm" },
              ].map((item) => (
                <div key={item.stat} className="flex items-baseline gap-3">
                  <span className="font-black text-sm flex-shrink-0 w-28" style={{ color: "hsl(var(--sq-orange))" }}>{item.stat}</span>
                  <span className="text-sm" style={{ color: "hsl(var(--sq-text))" }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* The wedge */}
        <div className={`mt-8 rounded-2xl px-7 py-5 text-center transition-all duration-500 delay-500 ${revealed ? "opacity-100" : "opacity-0"}`}
          style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
           <p className="font-black text-lg" style={{ color: "hsl(var(--sq-text))" }}>
            Every decision, traceable.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>Every team gets their brief.</span>
          </p>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--sq-muted))" }}>
            Growth gets campaign pointers. Product gets launch risks. Founders get the full picture.
          </p>
        </div>
      </div>
    </section>
  );
}
