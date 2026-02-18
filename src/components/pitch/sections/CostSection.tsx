import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

export default function CostSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="cost"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        {/* Header */}
        <div className={`mb-12 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            The Cost of Building Blind
          </p>
          <h2
            className={`font-black tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            One wrong launch.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>Months of runway gone.</span>
          </h2>
        </div>

        <div className={`grid ${isPresenter ? "grid-cols-2" : "md:grid-cols-5"} gap-4 transition-all duration-600 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

          {/* Without column */}
          <div className={`${isPresenter ? "" : "md:col-span-2"} rounded-2xl p-7 relative overflow-hidden bg-red-50 border border-red-100`}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-400" />
            <p className="font-black text-xs uppercase tracking-[0.15em] mb-6 text-red-800">
              Without real signal
            </p>
            <div className="space-y-4">
              {[
                "Decision made on internal metrics + gut",
                "Launch fails — wrong segment, wrong timing",
                "6 months of dev written off",
                "Board trust eroded. Team morale hit.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold flex-shrink-0 mt-0.5">✕</span>
                  <p className="text-sm text-red-900">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow — desktop only */}
          {!isPresenter && (
            <div className="hidden md:flex md:col-span-1 items-center justify-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-xl shadow-lg"
                style={{ background: "hsl(var(--sq-orange))", boxShadow: "0 8px 20px hsl(var(--sq-orange) / 0.3)" }}>
                →
              </div>
            </div>
          )}

          {/* With column */}
          <div className={`${isPresenter ? "" : "md:col-span-2"} rounded-2xl p-7 relative overflow-hidden`}
            style={{
              background: "hsl(var(--sq-orange) / 0.05)",
              border: "1px solid hsl(var(--sq-orange) / 0.2)"
            }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "hsl(var(--sq-orange))" }} />
            <p className="font-black text-xs uppercase tracking-[0.15em] mb-6" style={{ color: "hsl(var(--sq-orange))" }}>
              With SquareUp
            </p>
            <div className="space-y-4">
              {[
                "Risk flagged in week 1 — before you commit",
                "Assumptions tested against real customer voice",
                "Launch repositioned or cancelled before the burn",
                "Team learns. Board sees velocity, not wreckage.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <span className="font-bold flex-shrink-0 mt-0.5" style={{ color: "hsl(var(--sq-orange))" }}>✓</span>
                  <p className="text-sm" style={{ color: "hsl(var(--sq-text))" }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
