import { useScrollAnimation } from "@/lib/useScrollAnimation";
import AvatarGrowthLead from "../avatars/AvatarGrowthLead";
import AvatarNPDManager from "../avatars/AvatarNPDManager";
import AvatarCXLead from "../avatars/AvatarCXLead";
import type { SlideMode } from "@/lib/slides";

const PERSONAS = [
  {
    Avatar: AvatarGrowthLead,
    role: "Growth & Marketing Lead",
    industry: "D2C · QSR · Platforms",
    pain: "Running campaigns blind. Which segment drove that lift?",
    outcome: "Know your highest-value cohort before the next campaign drops.",
    tag: "CAMPAIGN DECISIONS",
  },
  {
    Avatar: AvatarNPDManager,
    role: "NPD & Product Manager",
    industry: "FMCG · QSR · Consumer Tech",
    pain: "6 months of dev on the line. Gut feel or real signal?",
    outcome: "Validate before you commit. Catch wrong assumptions in week 1.",
    tag: "LAUNCH DECISIONS",
  },
  {
    Avatar: AvatarCXLead,
    role: "CX & Experience Lead",
    industry: "Platforms · Retail · QSR",
    pain: "100 tickets. One real problem. Can't find it fast enough.",
    outcome: "Surface the #1 fix your leadership needs to hear.",
    tag: "PRIORITY DECISIONS",
  },
];

export default function WhoIsItForSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="whofor"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-6xl mx-auto w-full" ref={ref}>

        {/* Header */}
        <div className={`mb-14 text-center transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Who It's For
          </p>
          <h2 className={`font-black tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}>
            The teams where being wrong{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>costs the most.</span>
          </h2>
        </div>

        {/* Persona cards */}
        <div className={`grid grid-cols-1 ${isPresenter ? "grid-cols-3" : "md:grid-cols-3"} gap-5`}>
          {PERSONAS.map(({ Avatar, role, industry, pain, outcome, tag }, i) => (
            <div
              key={role}
              className={`group relative rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{
                transitionDelay: `${i * 130}ms`,
                background: "hsl(var(--sq-off-white))",
                border: "1px solid hsl(var(--sq-subtle))",
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
              }}
            >
              {/* Tag + industry header */}
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <span className="font-black text-xs tracking-[0.15em]" style={{ color: "hsl(var(--sq-orange))" }}>
                  {tag}
                </span>
                <span className="text-xs font-medium" style={{ color: "hsl(var(--sq-muted))" }}>{industry}</span>
              </div>

              {/* Avatar — flat white bg, no gradient, blends cleanly */}
              <div className="flex justify-center px-4 pb-2 pt-1" style={{ background: "hsl(var(--sq-card))" }}>
                <Avatar size={isPresenter ? 140 : 170} />
              </div>

              {/* Role */}
              <div className="px-5 pt-4 pb-2">
                <h3 className="font-black text-sm" style={{ color: "hsl(var(--sq-text))" }}>{role}</h3>
              </div>

              {/* Pain quote */}
              <div className="mx-5 mb-3 rounded-xl px-4 py-3"
                style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
                <p className="font-bold text-sm leading-snug italic" style={{ color: "hsl(var(--sq-text))" }}>
                  "{pain}"
                </p>
              </div>

              {/* Outcome */}
              <div className="mx-5 mb-5 rounded-xl px-4 py-3"
                style={{ background: "hsl(var(--sq-orange) / 0.07)", border: "1px solid hsl(var(--sq-orange) / 0.15)" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "hsl(var(--sq-orange))" }}>
                  With SquareUp
                </p>
                <p className="text-xs leading-relaxed font-medium" style={{ color: "hsl(var(--sq-text))" }}>{outcome}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
