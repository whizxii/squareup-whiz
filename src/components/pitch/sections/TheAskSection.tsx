import { useScrollAnimation, useCountUp } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const FUNDS = [
  { pct: "50%", label: "Product", detail: "AI core depth — voice reliability, brief quality, fine-tuning.", width: "50%" },
  { pct: "40%", label: "GTM", detail: "Convert 3 LOIs → paying customers → case studies.", width: "40%" },
  { pct: "10%", label: "Ops", detail: "Tools, infra, legal. Stays lean.", width: "10%" },
];

const MILESTONES = [
  { label: "First Revenue", desc: "3 LOI partners → paid in 90 days", icon: "💰" },
  { label: "Proof on Paper", desc: "Case studies with real brand names published", icon: "📄" },
  { label: "Series A Ready", desc: "10 paying brands, clear unit economics", icon: "🚀" },
];

function AskCounter() {
  const { ref, display } = useCountUp(500, 2000, "$", "K");
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="font-black tracking-tight leading-none"
      style={{ fontSize: "clamp(4.5rem, 12vw, 8rem)", color: "hsl(var(--sq-orange))" }}>
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
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        {/* Header */}
        <div className={`mb-14 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            The Ask
          </p>
          <h2 className={`font-black tracking-tight leading-tight mb-2 ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}>
            $500K. Two founders.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>One job: build and sell.</span>
          </h2>
          <p className="text-sm" style={{ color: "hsl(var(--sq-muted))" }}>
            Seed Round 2026 · No team buildout until the motion is proven
          </p>
        </div>

        <div className={`grid ${isPresenter ? "grid-cols-2" : "lg:grid-cols-2"} gap-10 transition-all duration-600 delay-200 ${revealed ? "opacity-100" : "opacity-0 translate-y-8"}`}>

          {/* Left — amount + fund chips */}
          <div>
            <div className="mb-10">
              <AskCounter />
              <p className="text-sm mt-2" style={{ color: "hsl(var(--sq-muted))" }}>
                Two founders. No overhead. Revenue in 90 days.
              </p>
            </div>

            {/* Fund allocation — stat chips */}
            <div className="flex flex-wrap gap-3 mb-8">
              {FUNDS.map((f) => (
                <div key={f.label} className="rounded-2xl px-5 py-3" style={{
                  background: "hsl(var(--sq-card))",
                  border: "1px solid hsl(var(--sq-subtle))"
                }}>
                  <div className="font-black text-xl mb-0.5" style={{ color: "hsl(var(--sq-orange))" }}>{f.pct}</div>
                  <div className="font-bold text-xs" style={{ color: "hsl(var(--sq-text))" }}>{f.label}</div>
                  <div className="text-xs mt-0.5 max-w-[100px]" style={{ color: "hsl(var(--sq-muted))" }}>{f.detail}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — 18-month milestones */}
          <div>
            <div className="rounded-2xl p-6 mb-5" style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
              <p className="font-black text-xs uppercase tracking-wider mb-5" style={{ color: "hsl(var(--sq-text))" }}>18-month proof points</p>
              <div className="space-y-4">
                {MILESTONES.map((m, i) => (
                  <div key={m.label} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{
                      background: "hsl(var(--sq-off-white))",
                      border: "1px solid hsl(var(--sq-subtle))"
                    }}>{m.icon}</div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "hsl(var(--sq-text))" }}>{m.label}</p>
                      <p className="text-xs" style={{ color: "hsl(var(--sq-muted))" }}>{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Data flywheel moat — condensed */}
            <div className="rounded-2xl p-5" style={{
              background: "hsl(var(--sq-orange) / 0.06)",
              border: "1px solid hsl(var(--sq-orange) / 0.2)"
            }}>
              <p className="font-black text-xs uppercase tracking-wider mb-3" style={{ color: "hsl(var(--sq-orange))" }}>
                Why we win long-term
              </p>
              <div className="space-y-2">
                {[
                  "Data flywheel — every call trains our models",
                  "Workflow lock-in — switching cost compounds",
                  "Mesa distribution — warm portfolio access",
                ].map((m) => (
                  <div key={m} className="flex items-start gap-2">
                    <span className="flex-shrink-0 mt-0.5 font-bold" style={{ color: "hsl(var(--sq-orange))" }}>→</span>
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
