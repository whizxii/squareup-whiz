import { useScrollAnimation, useCountUp } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const FUNDS = [
  { pct: "50%", label: "Build", detail: "Deepen the AI core. Voice agent reliability, insight brief quality, model fine-tuning." },
  { pct: "40%", label: "Sell", detail: "Convert 3 LOIs → paying customers → case studies. Founder-led sales, Mesa network." },
  { pct: "10%", label: "Ops", detail: "Tools, infra, legal. Team stays lean." },
];

const MILESTONES = [
  { label: "First Revenue", desc: "3 LOI partners → paid in 90 days" },
  { label: "Proof on Paper", desc: "Published case studies with real brand names" },
  { label: "Series A Ready", desc: "10 paying brands, clear unit economics" },
];

function AskCounter() {
  const { ref, display } = useCountUp(500, 2000, "$", "K");
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="font-black tracking-tight leading-none"
      style={{ fontSize: "clamp(4rem, 12vw, 7rem)", color: "hsl(var(--sq-orange))" }}>
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

          {/* Left — amount + use of funds */}
          <div>
            <div className="mb-8">
              <AskCounter />
              <p className="text-sm mt-2" style={{ color: "hsl(var(--sq-muted))" }}>
                Two founders. No overhead. Revenue in 90 days.
              </p>
            </div>

            {/* Use of funds bars */}
            <div className="space-y-4">
              {FUNDS.map((f) => (
                <div key={f.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm" style={{ color: "hsl(var(--sq-text))" }}>{f.label}</span>
                    <span className="font-black text-sm" style={{ color: "hsl(var(--sq-orange))" }}>{f.pct}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "hsl(var(--sq-subtle))" }}>
                    <div className="h-full rounded-full" style={{
                      width: f.pct,
                      background: "hsl(var(--sq-orange))",
                      boxShadow: "0 0 8px hsl(var(--sq-orange) / 0.3)"
                    }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: "hsl(var(--sq-muted))" }}>{f.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — milestones + moat */}
          <div className="space-y-5">
            <div className="rounded-2xl p-6" style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
              <p className="font-black text-sm uppercase tracking-wider mb-4" style={{ color: "hsl(var(--sq-text))" }}>18-month targets</p>
              <div className="space-y-3">
                {MILESTONES.map((m) => (
                  <div key={m.label} className="flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0" style={{ color: "hsl(var(--sq-orange))" }}>→</span>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "hsl(var(--sq-text))" }}>{m.label}</p>
                      <p className="text-xs" style={{ color: "hsl(var(--sq-muted))" }}>{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Moat */}
            <div className="rounded-2xl p-6" style={{
              border: "1px solid hsl(var(--sq-orange) / 0.3)",
              background: "hsl(var(--sq-orange) / 0.04)"
            }}>
              <p className="font-black text-sm uppercase tracking-wider mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
                Why we win long-term
              </p>
              <div className="space-y-3">
                {[
                  { title: "Data flywheel", body: "Every conversation trains our models. Nobody can buy this dataset." },
                  { title: "Workflow lock-in", body: "Switching cost grows with every brief a team runs on SquareUp." },
                  { title: "Mesa distribution", body: "Warm access across Mesa's portfolio, cohort, and LP companies." },
                ].map((m) => (
                  <div key={m.title}>
                    <p className="font-bold text-xs mb-0.5" style={{ color: "hsl(var(--sq-text))" }}>{m.title}</p>
                    <p className="text-xs" style={{ color: "hsl(var(--sq-muted))" }}>{m.body}</p>
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
