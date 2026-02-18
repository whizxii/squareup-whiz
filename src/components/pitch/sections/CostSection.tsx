import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

export default function CostSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="cost"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        {/* Header */}
        <div className={`mb-12 text-center transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
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
          <div className={`${isPresenter ? "" : "md:col-span-2"} rounded-2xl overflow-hidden`} style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <div className="h-1 bg-red-400 w-full" />
            <div className="p-7">
              <p className="font-black text-xs uppercase tracking-[0.15em] mb-6 text-red-800">
                Without real signal
              </p>
              <div className="space-y-4">
                {[
                  "Gut feel commits the build",
                  "Launch fails — wrong segment, wrong timing",
                  "6 months of dev written off",
                  "Board asks hard questions without answers",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <span className="text-red-500 font-black flex-shrink-0 mt-0.5 text-sm">✕</span>
                    <p className="text-sm text-red-900">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* vs divider */}
          {!isPresenter && (
            <div className="hidden md:flex md:col-span-1 items-center justify-center flex-col gap-2">
              <div className="w-px flex-1" style={{ background: "hsl(var(--sq-subtle))" }} />
              <span className="font-black text-xs px-3 py-1.5 rounded-full" style={{
                background: "hsl(var(--sq-subtle))",
                color: "hsl(var(--sq-muted))"
              }}>vs</span>
              <div className="w-px flex-1" style={{ background: "hsl(var(--sq-subtle))" }} />
            </div>
          )}

          {/* With column */}
          <div className={`${isPresenter ? "" : "md:col-span-2"} rounded-2xl overflow-hidden`}
            style={{
              background: "hsl(var(--sq-orange) / 0.05)",
              border: "1px solid hsl(var(--sq-orange) / 0.2)"
            }}>
            <div className="h-1 w-full" style={{ background: "hsl(var(--sq-orange))" }} />
            <div className="p-7">
              <p className="font-black text-xs uppercase tracking-[0.15em] mb-6" style={{ color: "hsl(var(--sq-orange))" }}>
                With SquareUp
              </p>
              <div className="space-y-4">
                {[
                  "Risk flagged in week 1 — before you commit",
                  "Assumptions tested against real customer voice",
                  "Launch repositioned or cancelled before the burn",
                  "Team shows evidence. Board sees velocity.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <span className="font-black flex-shrink-0 mt-0.5 text-sm" style={{ color: "hsl(var(--sq-orange))" }}>✓</span>
                    <p className="text-sm" style={{ color: "hsl(var(--sq-text))" }}>{item}</p>
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
