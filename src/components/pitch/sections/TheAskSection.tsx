import { useScrollAnimation, useCountUp } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

function AskCounter() {
  const { ref, display } = useCountUp(500, 2000, "$", "K");
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="font-black tracking-tight leading-none"
      style={{ fontSize: "clamp(4rem, 10vw, 7rem)", color: "hsl(var(--sq-orange))" }}>
      {display}
    </div>
  );
}

export default function TheAskSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="ask"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        <div className={`grid ${isPresenter ? "grid-cols-2" : "lg:grid-cols-2"} gap-16 items-center`}>

          {/* Left — amount + allocation */}
          <div className={`transition-all duration-500 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="font-bold text-xs uppercase tracking-[0.2em] mb-5" style={{ color: "hsl(var(--sq-orange))" }}>
              The Ask
            </p>
            <AskCounter />
            <p className="font-black text-xl mb-2 mt-1" style={{ color: "hsl(var(--sq-text))" }}>Seed Round 2026</p>
            <p className="text-sm mb-10" style={{ color: "hsl(var(--sq-muted))" }}>
              Two founders. No overhead. Revenue in 90 days.
            </p>

            {/* Allocation — clean pill row */}
            <div className="space-y-2.5">
              {[
                { pct: "50%", label: "Product", detail: "AI core, voice reliability, brief quality" },
                { pct: "40%", label: "GTM", detail: "Convert 3 LOIs → paying → case studies" },
                { pct: "10%", label: "Ops", detail: "Tools, infra, legal. Stays lean." },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-4 rounded-xl px-5 py-3"
                  style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
                  <span className="font-black text-xl w-14 flex-shrink-0" style={{ color: "hsl(var(--sq-orange))" }}>{f.pct}</span>
                  <div>
                    <span className="font-black text-sm" style={{ color: "hsl(var(--sq-text))" }}>{f.label}</span>
                    <span className="text-xs ml-2" style={{ color: "hsl(var(--sq-muted))" }}>{f.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — 18-month proof points */}
          <div className={`transition-all duration-500 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="rounded-3xl p-8" style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
              <p className="font-black text-xs uppercase tracking-wider mb-8" style={{ color: "hsl(var(--sq-muted))" }}>
                18-month milestones
              </p>
              <div className="space-y-8">
                {[
                  { label: "First Revenue", desc: "3 LOI partners → paid in 90 days", tag: "Month 3" },
                  { label: "Proof on Paper", desc: "Case studies with real brand names", tag: "Month 9" },
                  { label: "Series A Ready", desc: "10 paying brands, clear unit economics", tag: "Month 18" },
                ].map((m, i) => (
                  <div key={m.label} className="flex items-start gap-5">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs"
                      style={{ background: "hsl(var(--sq-orange))" }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-black text-base" style={{ color: "hsl(var(--sq-text))" }}>{m.label}</p>
                      <p className="text-sm" style={{ color: "hsl(var(--sq-muted))" }}>{m.desc}</p>
                      <span className="inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "hsl(var(--sq-off-white))", color: "hsl(var(--sq-orange))", border: "1px solid hsl(var(--sq-orange) / 0.2)" }}>
                        {m.tag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Moat */}
            <div className="mt-4 rounded-2xl px-6 py-4"
              style={{ background: "hsl(var(--sq-orange) / 0.06)", border: "1px solid hsl(var(--sq-orange) / 0.18)" }}>
              <p className="font-black text-sm mb-2" style={{ color: "hsl(var(--sq-orange))" }}>Why we win long-term</p>
              <div className="space-y-1">
                {[
                  "Data flywheel — every call trains our models",
                  "Workflow lock-in — switching cost compounds",
                  "Mesa distribution — warm portfolio access",
                ].map((m) => (
                  <div key={m} className="flex items-start gap-2">
                    <span className="flex-shrink-0 font-bold text-xs mt-0.5" style={{ color: "hsl(var(--sq-orange))" }}>→</span>
                    <p className="text-xs" style={{ color: "hsl(var(--sq-text))" }}>{m}</p>
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
