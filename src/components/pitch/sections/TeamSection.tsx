import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";
import paramImg from "@/assets/param.png";
import kunjImg from "@/assets/kunj.png";
import mesaLogo from "@/assets/mesa-logo.png";

const TEAM = [
  {
    name: "Param Jain",
    role: "Product & Engineering",
    tags: ["EA Sports", "AI/ML"],
    bio: "Former Tech Lead at EA Sports. Built SquareUp's AI interview engine — voice to synthesis to Insight Brief.",
    linkedin: "https://www.linkedin.com/in/param-jain/",
    photo: paramImg,
  },
  {
    name: "Kunj Dhamsaniya",
    role: "GTM & AI Workflows",
    tags: ["Consumer Ops", "Automation"],
    bio: "Consumer and ops builder. Owns end-to-end workflow: screening, calling, synthesising, routing briefs.",
    linkedin: "https://linkedin.com/in/kunjdhamsaniya/",
    photo: kunjImg,
  },
];

export default function TeamSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="team"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        <div className={`grid ${isPresenter ? "grid-cols-2" : "lg:grid-cols-2"} gap-16 items-start`}>

          {/* Left — headline */}
          <div className={`transition-all duration-500 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="font-bold text-xs uppercase tracking-[0.2em] mb-5" style={{ color: "hsl(var(--sq-orange))" }}>
              The Team
            </p>
            <h2
              className={`font-black tracking-tight leading-[1.0] mb-8 ${isPresenter ? "text-5xl" : "text-[2.5rem] sm:text-[3rem]"}`}
              style={{ color: "hsl(var(--sq-text))" }}
            >
              Two founders.<br />One from EA Sports.<br />
              <span style={{ color: "hsl(var(--sq-orange))" }}>Both done guessing.</span>
            </h2>

            {/* Origin + Mesa */}
            <div className="rounded-2xl px-6 py-5 mb-6"
              style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
              <p className="text-sm font-medium leading-relaxed" style={{ color: "hsl(var(--sq-text))" }}>
                Met at Mesa. Year off to build full-time.{" "}
                <span className="font-black" style={{ color: "hsl(var(--sq-orange))" }}>MVP shipped in 15 days.</span>
                {" "}Two founders. No team. No overhead. Build and sell — until proof.
              </p>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 inline-flex"
              style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
              <img src={mesaLogo} alt="Mesa" className="h-5 w-auto object-contain" />
              <span className="text-xs font-bold" style={{ color: "hsl(var(--sq-muted))" }}>Mesa School of Business</span>
            </div>
          </div>

          {/* Right — founder cards */}
          <div className={`space-y-4 transition-all duration-600 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            {TEAM.map((member) => (
              <div key={member.name} className="rounded-2xl overflow-hidden"
                style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                <div className="flex items-center gap-5 px-6 py-5"
                  style={{ background: `linear-gradient(135deg, hsl(var(--sq-off-white)) 0%, hsl(var(--sq-subtle)) 100%)` }}>
                  <div className="w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0"
                    style={{ borderColor: "hsl(var(--sq-orange))" }}>
                    <img src={member.photo} alt={member.name} className="w-full h-full object-cover object-top" />
                  </div>
                  <div>
                    <h3 className="font-black text-base leading-tight mb-0.5" style={{ color: "hsl(var(--sq-text))" }}>{member.name}</h3>
                    <p className="font-bold text-xs uppercase tracking-wider" style={{ color: "hsl(var(--sq-orange))" }}>{member.role}</p>
                    <div className="flex gap-1.5 mt-2">
                      {member.tags.map((t) => (
                        <span key={t} className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "hsl(var(--sq-card))", color: "hsl(var(--sq-muted))", border: "1px solid hsl(var(--sq-subtle))" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4">
                  <p className="text-sm leading-relaxed mb-3" style={{ color: "hsl(var(--sq-muted))" }}>{member.bio}</p>
                  <a href={member.linkedin} target="_blank" rel="noopener noreferrer"
                    className="font-bold text-xs hover:underline"
                    style={{ color: "hsl(var(--sq-orange))" }}>
                    LinkedIn →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
