import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";
import paramImg from "@/assets/param.png";
import kunjImg from "@/assets/kunj.png";
import mesaLogo from "@/assets/mesa-logo.png";

export default function TeamSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  const team = [
    {
      name: "Param Jain",
      role: "Co-founder — Product & Engineering",
      bio: "Former Tech Lead at EA Sports. Built SquareUp's AI interview engine — voice to synthesis to Insight Brief.",
      linkedin: "https://www.linkedin.com/in/param-jain/",
      photo: paramImg,
      tags: ["EA Sports", "AI/ML", "Product"],
    },
    {
      name: "Kunj Dhamsaniya",
      role: "Co-founder — GTM & AI Workflows",
      bio: "Consumer and ops environment builder. Owns end-to-end workflow: screening, calling, synthesising, routing briefs to the right teams.",
      linkedin: "https://linkedin.com/in/kunjdhamsaniya/",
      photo: kunjImg,
      tags: ["GTM", "Consumer Ops", "Automation"],
    },
  ];

  return (
    <section
      id="team"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        {/* Header */}
        <div className={`mb-4 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Team
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-10">
            <h2
              className={`font-black tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"}`}
              style={{ color: "hsl(var(--sq-text))" }}
            >
              Two founders. One from EA Sports.<br />
              <span style={{ color: "hsl(var(--sq-orange))" }}>Both done guessing.</span>
            </h2>
            {/* Mesa badge inline */}
            <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 flex-shrink-0 self-start" style={{
              background: "hsl(var(--sq-card))",
              border: "1px solid hsl(var(--sq-subtle))"
            }}>
              <img src={mesaLogo} alt="Mesa School of Business" className="h-6 w-auto object-contain" />
              <span className="text-xs font-bold" style={{ color: "hsl(var(--sq-text))" }}>Mesa</span>
            </div>
          </div>
        </div>

        {/* Team cards */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 transition-all duration-600 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {team.map((member) => (
            <div key={member.name} className="rounded-3xl overflow-hidden" style={{
              background: "hsl(var(--sq-card))",
              border: "1px solid hsl(var(--sq-subtle))",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
            }}>
              {/* Photo header — full width warm bg */}
              <div className="flex items-end gap-5 px-7 pt-7 pb-0" style={{
                background: `linear-gradient(135deg, hsl(var(--sq-off-white)) 0%, hsl(var(--sq-subtle)) 100%)`
              }}>
                <div
                  className="w-20 h-20 rounded-2xl border-[3px] overflow-hidden flex-shrink-0"
                  style={{ borderColor: "hsl(var(--sq-orange))" }}
                >
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="pb-5">
                  <h3 className="font-black text-lg leading-tight mb-0.5" style={{ color: "hsl(var(--sq-text))" }}>{member.name}</h3>
                  <p className="font-bold text-xs uppercase tracking-wider" style={{ color: "hsl(var(--sq-orange))" }}>{member.role}</p>
                </div>
              </div>

              {/* Bio + tags + link */}
              <div className="px-7 py-5">
                <p className="text-sm leading-relaxed mb-4" style={{ color: "hsl(var(--sq-muted))" }}>{member.bio}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {member.tags.map((tag) => (
                    <span key={tag} className="text-xs font-bold px-2.5 py-1 rounded-full" style={{
                      background: "hsl(var(--sq-subtle))",
                      color: "hsl(var(--sq-text))"
                    }}>{tag}</span>
                  ))}
                </div>
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold text-xs hover:underline"
                  style={{ color: "hsl(var(--sq-orange))" }}
                >
                  LinkedIn →
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Origin story — tight */}
        <div className={`transition-all duration-500 delay-400 ${revealed ? "opacity-100" : "opacity-0"}`}>
          <div className="rounded-2xl px-8 py-5 flex items-center gap-6" style={{
            background: "hsl(var(--sq-card))",
            border: "1px solid hsl(var(--sq-subtle))"
          }}>
            <div className="flex gap-4 flex-shrink-0 hidden sm:flex">
              {["⏱", "🏗", "✅"].map((e, i) => (
                <div key={i} className="w-10 h-10 rounded-full flex items-center justify-center text-base flex-shrink-0" style={{
                  background: "hsl(var(--sq-off-white))",
                  border: "1px solid hsl(var(--sq-subtle))"
                }}>{e}</div>
              ))}
            </div>
            <p className="text-sm font-medium leading-relaxed" style={{ color: "hsl(var(--sq-text))" }}>
              Met at Mesa. Year off to build full-time.{" "}
              <span className="font-black" style={{ color: "hsl(var(--sq-orange))" }}>MVP shipped in 15 days.</span>
              {" "}Two founders. No team. No overhead. Build and sell — until proof.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
