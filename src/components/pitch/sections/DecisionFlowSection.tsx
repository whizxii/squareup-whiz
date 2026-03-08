import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const SIGNALS_IN = [
  "Customer Conversations",
  "Support Tickets",
  "Survey Fragments",
  "Field Observations",
];

const SQUAREUP_LAYERS = [
  { step: "Interview", desc: "AI-led, multilingual" },
  { step: "Synthesis", desc: "Themes, severity, quotes" },
  { step: "Repository", desc: "Searchable truth memory" },
  { step: "Routing", desc: "Right team, right signal" },
];

const DECISIONS_OUT = [
  { team: "Product", action: "Pack architecture" },
  { team: "Growth", action: "Campaign targeting" },
  { team: "CX", action: "Top complaint fix" },
  { team: "Leadership", action: "Category expansion" },
];

export default function DecisionFlowSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter");

  return (
    <section
      id="decisionflow"
      className={`${isPresenter ? "min-h-screen flex items-center px-16" : "py-32 px-8 sm:px-16"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-6xl mx-auto w-full" ref={ref}>

        <div className={`text-center ${isPresenter ? "mb-8" : "mb-14"} transition-all duration-700 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            The Flow
          </p>
          <h2
            className={`font-black tracking-tight leading-[1.05] ${isPresenter ? "text-4xl" : "text-4xl sm:text-5xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            How Customer Truth{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>Becomes Action</span>
          </h2>
        </div>

        {/* 3-column flow */}
        <div
          className={`grid ${isPresenter ? "grid-cols-[1fr_1.4fr_1fr]" : "md:grid-cols-[1fr_1.4fr_1fr]"} ${isPresenter ? "gap-4" : "gap-6"} items-stretch transition-all duration-700 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          {/* Left — Signal In */}
          <div className={`rounded-2xl ${isPresenter ? "p-4" : "p-6"} flex flex-col`}
            style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: "hsl(var(--sq-muted))" }}>
              Signal In
            </p>
            <div className="space-y-2 flex-1">
              {SIGNALS_IN.map((s) => (
                <div key={s} className={`rounded-xl ${isPresenter ? "px-3 py-2" : "px-4 py-3"}`}
                  style={{ background: "hsl(var(--sq-off-white))", border: "1px solid hsl(var(--sq-subtle))" }}>
                  <p className={`font-bold ${isPresenter ? "text-xs" : "text-sm"}`} style={{ color: "hsl(var(--sq-text))" }}>{s}</p>
                </div>
              ))}
            </div>
            <div className={`flex justify-center ${isPresenter ? "mt-3" : "mt-5"}`}>
              <span className="font-black text-lg" style={{ color: "hsl(var(--sq-muted) / 0.3)" }}>→</span>
            </div>
          </div>

          {/* Center — SquareUp */}
          <div className={`rounded-2xl ${isPresenter ? "p-4" : "p-6"} flex flex-col`}
            style={{ background: "hsl(var(--sq-card))", border: "2px solid hsl(var(--sq-orange) / 0.4)" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--sq-orange))" }} />
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--sq-orange))" }}>
                SquareUp
              </p>
            </div>
            <div className="space-y-2 flex-1">
              {SQUAREUP_LAYERS.map((l, i) => (
                <div key={l.step}>
                  <div className={`rounded-xl ${isPresenter ? "px-3 py-2.5" : "px-4 py-3"}`}
                    style={{ background: "hsl(var(--sq-orange) / 0.06)", border: "1px solid hsl(var(--sq-orange) / 0.15)" }}>
                    <div className="flex items-center gap-2">
                      <span className={`font-black ${isPresenter ? "text-xs" : "text-sm"} flex-shrink-0`} style={{ color: "hsl(var(--sq-orange))" }}>
                        {i + 1}.
                      </span>
                      <div>
                        <p className={`font-black ${isPresenter ? "text-xs" : "text-sm"}`} style={{ color: "hsl(var(--sq-text))" }}>{l.step}</p>
                        <p className="text-[10px]" style={{ color: "hsl(var(--sq-muted))" }}>{l.desc}</p>
                      </div>
                    </div>
                  </div>
                  {i < SQUAREUP_LAYERS.length - 1 && (
                    <div className="flex justify-center py-0.5">
                      <span className="text-xs font-bold" style={{ color: "hsl(var(--sq-orange) / 0.3)" }}>↓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right — Decisions Out */}
          <div className={`rounded-2xl ${isPresenter ? "p-4" : "p-6"} flex flex-col`}
            style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="font-black text-lg" style={{ color: "hsl(var(--sq-muted) / 0.3)" }}>→</span>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--sq-muted))" }}>
                Decisions Out
              </p>
            </div>
            <div className="space-y-2 flex-1">
              {DECISIONS_OUT.map((d) => (
                <div key={d.team} className={`rounded-xl ${isPresenter ? "px-3 py-2" : "px-4 py-3"}`}
                  style={{ background: "hsl(var(--sq-off-white))", border: "1px solid hsl(var(--sq-subtle))" }}>
                  <p className={`font-black ${isPresenter ? "text-xs" : "text-sm"}`} style={{ color: "hsl(var(--sq-text))" }}>{d.team}</p>
                  <p className="text-[10px]" style={{ color: "hsl(var(--sq-muted))" }}>{d.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
