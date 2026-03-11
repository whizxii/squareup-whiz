import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const GTM_PHASES = [
  {
    phase: "Phase 1",
    title: "Founder-Led Sales",
    tag: "Now → Month 3",
    desc: "Kunj's D2C network + Mesa School network. Convert pilot partners (Skinn, Big Basket) to paid. Close 3-5 paying brands.",
    icon: "→",
  },
  {
    phase: "Phase 2",
    title: "Case Study Flywheel",
    tag: "Month 3–9",
    desc: "Published results from pilot brands. Referrals from design partners. Outbound to similar-profile consumer brands. Target: 10+ paying brands.",
    icon: "↗",
  },
  {
    phase: "Phase 3",
    title: "Channel + Content",
    tag: "Month 9–18",
    desc: "Thought leadership & founder content. Agency partnership channel. Inbound from published case studies. Target: 20+ brands → Series A.",
    icon: "⟶",
  },
];

export default function BusinessModelSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter" || mode === "download");

  return (
    <section
      id="businessmodel"
      className={`${isPresenter ? "min-h-screen flex items-center px-16" : "py-32 px-8 sm:px-16"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-6xl mx-auto w-full" ref={ref}>

        <div className={`grid ${isPresenter ? "grid-cols-2" : "lg:grid-cols-2"} ${isPresenter ? "gap-8" : "gap-16"} items-center`}>

          {/* Left — headline */}
          <div className={`transition-all duration-500 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="font-bold text-xs uppercase tracking-[0.2em] mb-5" style={{ color: "hsl(var(--sq-orange))" }}>
              Revenue Model & GTM
            </p>
            <h2 className={`font-black tracking-tight leading-[1.05] mb-6 ${isPresenter ? "text-4xl" : "text-4xl sm:text-[3rem]"}`}
              style={{ color: "hsl(var(--sq-text))" }}>
              Start with one decision.<br />
              <span style={{ color: "hsl(var(--sq-orange))" }}>Become the customer truth system of record.</span>
            </h2>
            <p className={`${isPresenter ? "text-xs" : "text-sm"} leading-relaxed`} style={{ color: "hsl(var(--sq-muted))" }}>
              Agency charges ₹30–50L and takes 8 weeks.<br />We charge ₹1–3L and deliver in 2 days.<br />The ROI case writes itself.
            </p>

            {/* Unit economics */}
            <div className={`${isPresenter ? "mt-5" : "mt-8"} space-y-2`}>
              {[
                { label: "Cost per AI interview", val: "~₹800" },
                { label: "vs human researcher", val: "₹15,000+" },
                { label: "Gross margin target", val: "~70%" },
              ].map((r) => (
                <div key={r.label} className={`flex items-center justify-between rounded-xl px-4 ${isPresenter ? "py-1.5" : "py-2.5"}`}
                  style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
                  <span className={`${isPresenter ? "text-xs" : "text-sm"}`} style={{ color: "hsl(var(--sq-muted))" }}>{r.label}</span>
                  <span className={`font-black ${isPresenter ? "text-sm" : "text-base"}`} style={{ color: "hsl(var(--sq-orange))" }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — tier cards */}
          <div className={`space-y-4 transition-all duration-600 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

            {/* Per study */}
            <div className={`rounded-2xl ${isPresenter ? "p-5" : "p-7"}`}
              style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-black text-xs uppercase tracking-widest mb-1" style={{ color: "hsl(var(--sq-muted))" }}>Per Study</p>
                  <h3 className={`font-black ${isPresenter ? "text-base" : "text-lg"}`} style={{ color: "hsl(var(--sq-text))" }}>Deep Dive</h3>
                </div>
                <span className={`font-black ${isPresenter ? "text-2xl" : "text-3xl"} sq-glow-text`} style={{ color: "hsl(var(--sq-orange))" }}>₹1–3L</span>
              </div>
              <div className="space-y-1.5">
                {[
                  "One focused decision. Full AI interview campaign.",
                  "Executive Insight Brief in 2 days",
                  "Severity scoring + risks + verbatim quotes",
                ].map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: "hsl(var(--sq-orange))" }}>→</span>
                    <p className="text-xs" style={{ color: "hsl(var(--sq-muted))" }}>{f}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscription — highlighted */}
            <div className={`rounded-2xl ${isPresenter ? "p-5" : "p-7"} relative overflow-hidden`}
              style={{ background: "hsl(var(--sq-off-white))", border: "2px solid hsl(var(--sq-orange) / 0.5)" }}>
              <div className={`absolute ${isPresenter ? "top-3 right-3" : "top-4 right-4"}`}>
                <span className="text-white text-xs font-black px-3 py-1 rounded-full"
                  style={{ background: "hsl(var(--sq-orange))" }}>Moat</span>
              </div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-black text-xs uppercase tracking-widest mb-1" style={{ color: "hsl(var(--sq-muted))" }}>Per Month</p>
                  <h3 className={`font-black ${isPresenter ? "text-base" : "text-lg"}`} style={{ color: "hsl(var(--sq-text))" }}>Always-On Intelligence</h3>
                </div>
                <div className="text-right">
                  <span className={`font-black ${isPresenter ? "text-xl" : "text-2xl"} sq-glow-text`} style={{ color: "hsl(var(--sq-orange))" }}>₹75K–1.5L</span>
                  <p className="text-xs" style={{ color: "hsl(var(--sq-muted))" }}>/month</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {[
                  "Ongoing signal across campaigns, launches, CX",
                  "Monthly executive debrief — routed to each team",
                  "Proprietary customer truth dataset grows with every conversation",
                ].map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: "hsl(var(--sq-orange))" }}>✓</span>
                    <p className="text-xs" style={{ color: "hsl(var(--sq-text))" }}>{f}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Land & expand 1-liner */}
            <div className="rounded-xl px-4 py-3"
              style={{ background: "hsl(var(--sq-orange) / 0.06)", border: "1px solid hsl(var(--sq-orange) / 0.2)" }}>
              <p className="text-xs font-bold" style={{ color: "hsl(var(--sq-orange))" }}>Land & expand</p>
              <p className="text-xs mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>
                Start with one ₹1-3L study → prove value on one decision → expand to ₹75K-1.5L/month subscription
              </p>
            </div>
          </div>
        </div>

        {/* Expansion Timeline + GTM (hidden in presenter) */}
        {!isPresenter && (
          <>
            {/* Path to Platform */}
            <div className={`mt-12 transition-all duration-500 delay-300 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <p className="font-bold text-xs uppercase tracking-widest mb-5" style={{ color: "hsl(var(--sq-muted))" }}>
                Path to Platform
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { phase: "Phase 1", title: "Decision Studies", desc: "Per-study revenue. Prove value on one decision at a time.", tag: "Now" },
                  { phase: "Phase 2", title: "Always-On Signal", desc: "Monthly subscription. Lock in as the ongoing customer truth layer.", tag: "Month 6+" },
                  { phase: "Phase 3", title: "Customer Truth System of Record", desc: "Platform revenue. Proprietary data moat. Improving decision-quality models built on real brand workflows.", tag: "Month 12+" },
                ].map((p) => (
                  <div key={p.phase} className="rounded-xl px-5 py-4"
                    style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--sq-orange))" }}>{p.phase}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "hsl(var(--sq-orange) / 0.1)", color: "hsl(var(--sq-orange))" }}>{p.tag}</span>
                    </div>
                    <p className="font-black text-sm mb-1" style={{ color: "hsl(var(--sq-text))" }}>{p.title}</p>
                    <p className="text-xs" style={{ color: "hsl(var(--sq-muted))" }}>{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* GTM Strategy */}
            <div className={`mt-10 transition-all duration-500 delay-400 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <p className="font-bold text-xs uppercase tracking-widest mb-5" style={{ color: "hsl(var(--sq-orange))" }}>
                Go-To-Market Strategy
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                {GTM_PHASES.map((g) => (
                  <div key={g.phase} className="rounded-xl px-5 py-5"
                    style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--sq-orange))" }}>{g.phase}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "hsl(var(--sq-orange) / 0.1)", color: "hsl(var(--sq-orange))" }}>{g.tag}</span>
                    </div>
                    <p className="font-black text-sm mb-2" style={{ color: "hsl(var(--sq-text))" }}>{g.title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--sq-muted))" }}>{g.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
