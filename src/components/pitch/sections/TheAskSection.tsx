import { useScrollAnimation, useCountUp } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

function AskCounter({ forceStart = false }: { forceStart?: boolean }) {
  const { ref, display } = useCountUp(500, 2000, "$", "K", forceStart);
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="sq-stat-hero sq-glow-text"
      style={{ color: "hsl(var(--sq-orange))" }}>
      {display}
    </div>
  );
}

export default function TheAskSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter");

  return (
    <section
      id="ask"
      className={`relative overflow-hidden ${isPresenter ? "min-h-screen flex items-center px-16" : "py-32 px-6 sm:px-16"}`}
      style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a12 100%)" }}
    >
      {/* Ambient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full sq-orb pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--sq-orange) / 0.05) 0%, transparent 70%)" }} />
      <div className="absolute bottom-1/4 right-1/3 w-[350px] h-[350px] rounded-full sq-orb pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--sq-amber) / 0.04) 0%, transparent 70%)", animationDelay: "7s" }} />

      <div className="max-w-6xl mx-auto w-full relative z-10" ref={ref}>

        <div className={`grid ${isPresenter ? "grid-cols-2" : "lg:grid-cols-2"} ${isPresenter ? "gap-8" : "gap-16"} items-center`}>

          {/* Left — amount + allocation */}
          <div className={`transition-all duration-500 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="font-bold text-xs uppercase tracking-[0.2em] mb-5" style={{ color: "hsl(var(--sq-orange))" }}>
              The Ask
            </p>
            <AskCounter forceStart={mode === "presenter"} />
            <p className={`font-black ${isPresenter ? "text-lg" : "text-xl"} mb-2 mt-1 text-white`}>Seed Round 2026</p>
            <p className={`text-sm ${isPresenter ? "mb-6" : "mb-10"} text-white/50`}>
              Two founders. Full-time. Revenue in 90 days.
            </p>

            {/* Allocation — glass pill row */}
            <div className="space-y-2.5">
              {[
                { pct: "50%", label: "Product", detail: "AI core, voice reliability, brief quality" },
                { pct: "40%", label: "GTM", detail: "Convert pilots → paying → case studies" },
                { pct: "10%", label: "Ops", detail: "Tools, infra, legal. Stays lean." },
              ].map((f) => (
                <div key={f.label} className={`sq-glass flex items-center gap-4 rounded-xl ${isPresenter ? "px-4 py-2" : "px-5 py-3"}`}>
                  <span className={`font-black ${isPresenter ? "text-lg" : "text-xl"} w-14 flex-shrink-0 sq-glow-text`} style={{ color: "hsl(var(--sq-orange))" }}>{f.pct}</span>
                  <div>
                    <span className="font-black text-sm text-white">{f.label}</span>
                    <span className="text-xs ml-2 text-white/40">{f.detail}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* FOMO urgency card — hidden in presenter */}
            {!isPresenter && (
              <div className="sq-glass rounded-2xl p-6 mt-8">
                <p className="font-black text-sm mb-3" style={{ color: "hsl(var(--sq-orange))" }}>
                  Why this window is narrow
                </p>
                <div className="space-y-2">
                  {[
                    "6 brands engaged — 2 in pilots, 4 in active tests. Revenue starts with or without this round.",
                    "Conveo.ai just raised $5.3M (YC S24) for the global market. India is uncontested — but not for long.",
                    "AI costs dropping 10x/year — first team to build the data flywheel wins. Every conversation compounds.",
                    "Small round by design — we stay lean until the motion is undeniably proven.",
                  ].map((line) => (
                    <div key={line} className="flex items-start gap-2">
                      <span className="text-xs mt-1 flex-shrink-0" style={{ color: "hsl(var(--sq-orange))" }}>→</span>
                      <p className="text-xs text-white/60">{line}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — 18-month proof points */}
          <div className={`transition-all duration-500 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className={`sq-glass rounded-3xl ${isPresenter ? "p-6" : "p-8"}`}>
              <p className={`font-black text-xs uppercase tracking-wider ${isPresenter ? "mb-5" : "mb-8"} text-white/40`}>
                18-month milestones
              </p>
              <div className={isPresenter ? "space-y-5" : "space-y-8"}>
                {[
                  { label: "First Revenue", desc: "Pilot partners convert to paid. First ₹10L+ in revenue.", tag: "Month 3" },
                  { label: "Proof on Paper", desc: "5+ paying brands. Published case studies. Repeatable motion.", tag: "Month 9" },
                  { label: "Series A Ready", desc: "10+ brands, ₹2Cr+ ARR run-rate, clear unit economics.", tag: "Month 18" },
                ].map((m, i) => (
                  <div key={m.label} className={`flex items-start ${isPresenter ? "gap-3" : "gap-5"}`}>
                    <div className={`flex-shrink-0 ${isPresenter ? "w-7 h-7" : "w-8 h-8"} rounded-full flex items-center justify-center font-black text-white text-xs`}
                      style={{ background: "hsl(var(--sq-orange))" }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className={`font-black ${isPresenter ? "text-sm" : "text-base"} text-white`}>{m.label}</p>
                      <p className={`${isPresenter ? "text-xs" : "text-sm"} text-white/50`}>{m.desc}</p>
                      <span className="inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "hsl(var(--sq-orange) / 0.15)", color: "hsl(var(--sq-orange))", border: "1px solid hsl(var(--sq-orange) / 0.3)" }}>
                        {m.tag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Moat */}
            <div className={`mt-4 rounded-2xl px-6 ${isPresenter ? "py-3" : "py-4"}`}
              style={{ background: "hsl(var(--sq-orange) / 0.08)", border: "1px solid hsl(var(--sq-orange) / 0.2)" }}>
              <p className={`font-black ${isPresenter ? "text-xs" : "text-sm"} mb-2`} style={{ color: "hsl(var(--sq-orange))" }}>Why we win long-term</p>
              <div className="space-y-1">
                {[
                  "Proprietary dataset of customer conversations — compounds with every interview",
                  "System-of-record lock-in across product, growth, and CX teams",
                  "Early distribution via Mesa network + pilot brand referrals",
                ].map((m) => (
                  <div key={m} className="flex items-start gap-2">
                    <span className="flex-shrink-0 font-bold text-xs mt-0.5" style={{ color: "hsl(var(--sq-orange))" }}>→</span>
                    <p className="text-xs text-white/60">{m}</p>
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
