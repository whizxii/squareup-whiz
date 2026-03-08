import { useScrollAnimation } from "@/lib/useScrollAnimation";
import AvatarGrowthLead from "../avatars/AvatarGrowthLead";
import AvatarNPDManager from "../avatars/AvatarNPDManager";
import AvatarCXLead from "../avatars/AvatarCXLead";
import type { SlideMode } from "@/lib/slides";

const PERSONAS = [
  {
    Avatar: AvatarGrowthLead,
    role: "Growth & Marketing Lead",
    tag: "CAMPAIGN DECISIONS",
    decision: "Which cohort do we double down on this quarter?",
    without: [
      "Runs campaign. Sees 2.1x ROAS on 'Urban Women 25-34'",
      "Doubles budget on that segment",
      "ROAS drops to 0.8x — the cohort was exhausted, not loyal",
    ],
    withSQ: [
      "AI interviews surface that repeat buyers are actually 'gifters' — not self-purchasers",
      "Growth repositions campaign as a gifting play",
      "ROAS holds at 1.9x across 3 cycles",
    ],
    industries: "D2C · QSR · Platforms",
  },
  {
    Avatar: AvatarNPDManager,
    role: "NPD & Product Manager",
    tag: "LAUNCH DECISIONS",
    decision: "Is this pack-price architecture right before we commit inventory?",
    without: [
      "Internal alignment says ₹1200 for 200ml is fine",
      "₹2-3Cr committed to inventory",
      "Post-launch study reveals customers wanted a ₹399 trial size",
    ],
    withSQ: [
      "47 AI interviews catch price-pack mismatch in week 1",
      "Team launches ₹399 / 50ml entry SKU alongside hero SKU",
      "Entry SKU drives 3x trial-to-repeat conversion",
    ],
    industries: "FMCG · QSR · Consumer Tech",
  },
  {
    Avatar: AvatarCXLead,
    role: "CX & Experience Lead",
    tag: "PRIORITY DECISIONS",
    decision: "Which customer complaint should leadership fix first?",
    without: [
      "500 tickets/month. NPS declining. Team drowns in anecdotes",
      "Escalates 'delivery speed' because it has most mentions",
      "Real issue was packaging damage — fewer tickets, higher churn",
    ],
    withSQ: [
      "SquareUp synthesizes conversations and scores severity",
      "Packaging damage: 9.4/10 severity, directly linked to churn",
      "Fix deployed in 3 weeks. NPS recovers within one quarter",
    ],
    industries: "Platforms · Retail · QSR",
  },
];

export default function WhoIsItForSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter");

  return (
    <section
      id="whofor"
      className={`${isPresenter ? "min-h-screen flex items-center px-16 py-8" : "py-32 px-8 sm:px-16"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-6xl mx-auto w-full" ref={ref}>

        {/* Header */}
        <div className={`${isPresenter ? "mb-6" : "mb-14"} text-center transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Who It's For
          </p>
          <h2 className={`font-black tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}>
            The teams where being wrong{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>costs the most.</span>
          </h2>
          {!isPresenter && (
            <p className="mt-4 text-base font-medium max-w-2xl mx-auto" style={{ color: "hsl(var(--sq-muted))" }}>
              Three roles. Three real decisions. Same pattern: the signal existed — it just wasn't surfaced in time.
            </p>
          )}
        </div>

        {/* Persona cards */}
        <div className={`space-y-${isPresenter ? "4" : "8"}`}>
          {PERSONAS.map(({ Avatar, role, tag, decision, without, withSQ, industries }, i) => (
            <div
              key={role}
              className={`rounded-3xl overflow-hidden transition-all duration-500 ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{
                transitionDelay: `${i * 150}ms`,
                background: "hsl(var(--sq-card))",
                border: "1px solid hsl(var(--sq-subtle))",
                boxShadow: "0 4px 24px rgba(0,0,0,0.04)"
              }}
            >
              {/* Top bar */}
              <div className={`${isPresenter ? "px-5 py-3" : "px-6 py-4"} flex items-center justify-between flex-wrap gap-3`}
                style={{ borderBottom: "1px solid hsl(var(--sq-subtle))" }}>
                <div className="flex items-center gap-3">
                  <Avatar size={isPresenter ? 36 : 44} />
                  <div>
                    <h3 className={`font-black ${isPresenter ? "text-sm" : "text-base"}`} style={{ color: "hsl(var(--sq-text))" }}>{role}</h3>
                    <p className="text-[10px] font-medium" style={{ color: "hsl(var(--sq-muted))" }}>{industries}</p>
                  </div>
                </div>
                <span className="font-black text-[10px] tracking-[0.15em] px-3 py-1.5 rounded-full"
                  style={{ background: "hsl(var(--sq-orange) / 0.08)", color: "hsl(var(--sq-orange))" }}>
                  {tag}
                </span>
              </div>

              {/* Decision question */}
              <div className={`${isPresenter ? "px-5 py-3" : "px-6 py-4"}`}
                style={{ background: "hsl(var(--sq-off-white))" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(var(--sq-muted))" }}>The Decision</p>
                <p className={`font-black ${isPresenter ? "text-sm" : "text-base"} italic`} style={{ color: "hsl(var(--sq-text))" }}>
                  "{decision}"
                </p>
              </div>

              {/* Two-column: Without vs With */}
              <div className={`grid ${isPresenter ? "grid-cols-2" : "md:grid-cols-2"}`}>
                {/* Without */}
                <div className={`${isPresenter ? "p-4" : "p-6"}`}
                  style={{ borderRight: "1px solid hsl(var(--sq-subtle))" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "hsl(0, 72%, 51%)" }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(0, 72%, 51%)" }}>Without SquareUp</p>
                  </div>
                  <div className="space-y-2">
                    {without.map((line, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <span className={`text-xs font-bold flex-shrink-0 mt-0.5 ${j === without.length - 1 ? "text-red-500" : ""}`}
                          style={{ color: j === without.length - 1 ? undefined : "hsl(var(--sq-muted) / 0.4)" }}>
                          {j + 1}.
                        </span>
                        <p className={`text-xs leading-relaxed font-medium ${j === without.length - 1 ? "font-bold text-red-500/80" : ""}`}
                          style={{ color: j === without.length - 1 ? undefined : "hsl(var(--sq-muted))" }}>
                          {line}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* With */}
                <div className={`${isPresenter ? "p-4" : "p-6"}`}
                  style={{ background: "hsl(var(--sq-orange) / 0.02)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "hsl(var(--sq-orange))" }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--sq-orange))" }}>With SquareUp</p>
                  </div>
                  <div className="space-y-2">
                    {withSQ.map((line, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: "hsl(var(--sq-orange) / 0.5)" }}>
                          {j + 1}.
                        </span>
                        <p className={`text-xs leading-relaxed font-medium ${j === withSQ.length - 1 ? "font-bold" : ""}`}
                          style={{ color: j === withSQ.length - 1 ? "hsl(var(--sq-orange))" : "hsl(var(--sq-text))" }}>
                          {line}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
