import { useScrollAnimation } from "@/lib/useScrollAnimation";
import AvatarGrowthLead from "../avatars/AvatarGrowthLead";
import AvatarNPDManager from "../avatars/AvatarNPDManager";
import AvatarCXLead from "../avatars/AvatarCXLead";
import type { SlideMode } from "@/lib/slides";

const PERSONAS = [
  {
    Avatar: AvatarGrowthLead,
    role: "Growth / Marketing Lead",
    industry: "QSR · D2C · Consumer Platforms",
    pain: "Running campaigns blind. Which segment actually drove that lift?",
    outcome: "Know your highest-value cohort before the next campaign drops.",
    color: "from-orange-500/10 to-amber-500/5",
  },
  {
    Avatar: AvatarNPDManager,
    role: "NPD / Product Manager",
    industry: "FMCG · QSR · Consumer Tech",
    pain: "6 months of dev on the line. Real signal or intuition?",
    outcome: "Validate before you commit. Catch wrong assumptions in week 1, not month 6.",
    color: "from-orange-600/10 to-orange-400/5",
  },
  {
    Avatar: AvatarCXLead,
    role: "CX / Experience Lead",
    industry: "Platforms · Retail · QSR",
    pain: "100 tickets. One real problem. Can't find it fast enough.",
    outcome: "Surface the #1 fix your leadership needs to hear — backed by real customer voice.",
    color: "from-amber-500/10 to-orange-500/5",
  },
];

export default function WhoIsItForSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="whofor"
      className={`bg-sq-card ${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
    >
      <div className="max-w-6xl mx-auto w-full" ref={ref}>
        <div className={`text-center mb-12 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <h2 className={`font-black text-sq-text tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"}`}>
            Built for the teams where{" "}
            <span className="text-sq-orange">being wrong costs the most.</span>
          </h2>
          <p className="text-sq-muted mt-3 text-base sm:text-lg">
            Whether you're a QSR chain, a D2C brand, or a consumer platform — the problem is the same.
          </p>
        </div>

        <div className={`grid grid-cols-1 ${isPresenter ? "grid-cols-3" : "md:grid-cols-3"} gap-6`}>
          {PERSONAS.map(({ Avatar, role, industry, pain, outcome, color }, i) => (
            <div
              key={role}
              className={`group relative bg-sq-off-white rounded-3xl overflow-hidden border border-sq-subtle hover:-translate-y-1 hover:shadow-xl hover:shadow-sq-orange/10 transition-all duration-300 ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              {/* Orange gradient header */}
              <div className={`h-2 bg-gradient-to-r from-sq-orange to-sq-amber`} />

              <div className="p-6">
                {/* Avatar */}
                <div className="flex justify-center mb-4">
                  <Avatar size={isPresenter ? 140 : 160} />
                </div>

                {/* Role pill */}
                <div className="inline-flex items-center gap-1.5 bg-sq-orange/10 rounded-full px-3 py-1 mb-2">
                  <span className="text-sq-orange font-bold text-xs">{role}</span>
                </div>

                <p className="text-sq-muted text-xs mb-3 font-medium">{industry}</p>

                {/* Pain */}
                <blockquote className="text-sq-text font-bold text-sm leading-snug border-l-2 border-sq-orange pl-3 mb-4 italic">
                  "{pain}"
                </blockquote>

                {/* Outcome */}
                <div className="bg-sq-orange/8 rounded-xl p-3" style={{ background: "hsl(18,100%,60%,0.07)" }}>
                  <p className="text-xs font-bold text-sq-orange uppercase tracking-wider mb-1">SquareUp gives you</p>
                  <p className="text-sq-text text-xs leading-relaxed">{outcome}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
