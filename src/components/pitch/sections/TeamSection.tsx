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
      bio: "Former Tech Lead at EA Sports. Shipped products at scale. Built SquareUp's AI interview engine — voice to synthesis to Insight Brief.",
      linkedin: "https://www.linkedin.com/in/param-jain/",
      photo: paramImg,
    },
    {
      name: "Kunj Dhamsaniya",
      role: "Co-founder — GTM & AI Workflows",
      bio: "Consumer and ops environment builder. Owns end-to-end workflow: screening, calling, synthesising, routing briefs to the right teams.",
      linkedin: "https://linkedin.com/in/kunjdhamsaniya/",
      photo: kunjImg,
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
        <div className={`mb-14 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Team
          </p>
          <h2
            className={`font-black tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            Built by people who've been{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>burned by this problem.</span>
          </h2>
        </div>

        {/* Team cards */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 transition-all duration-600 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {team.map((member) => (
            <div key={member.name} className="rounded-3xl p-8 flex gap-6" style={{
              background: "hsl(var(--sq-card))",
              border: "1px solid hsl(var(--sq-subtle))"
            }}>
              {/* Photo */}
              <div className="flex-shrink-0">
                <div
                  className="w-24 h-24 rounded-full border-[3px] overflow-hidden"
                  style={{ borderColor: "hsl(var(--sq-orange))" }}
                >
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-black text-lg leading-tight mb-0.5" style={{ color: "hsl(var(--sq-text))" }}>{member.name}</h3>
                <p className="font-bold text-xs uppercase tracking-wider mb-3" style={{ color: "hsl(var(--sq-orange))" }}>{member.role}</p>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "hsl(var(--sq-muted))" }}>{member.bio}</p>
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

        {/* Origin + Mesa badge */}
        <div className={`transition-all duration-500 delay-400 ${revealed ? "opacity-100" : "opacity-0"}`}>
          <div className="rounded-2xl px-8 py-6 max-w-2xl mx-auto text-center" style={{
            background: "hsl(var(--sq-card))",
            border: "1px solid hsl(var(--sq-subtle))"
          }}>
            <p className="font-medium leading-relaxed text-sm sm:text-base" style={{ color: "hsl(var(--sq-text))" }}>
              Two founders. No team. No overhead.{" "}
              <span className="font-bold" style={{ color: "hsl(var(--sq-orange))" }}>Build and sell — that's the entire playbook until we have proof.</span>
              {" "}We met at Mesa, took a year off to build full-time, and shipped an MVP in 15 days.
            </p>
          </div>

          <div className="flex items-center justify-center mt-6">
            <div className="rounded-2xl px-6 py-3 flex items-center gap-3" style={{
              background: "hsl(var(--sq-card))",
              border: "1px solid hsl(var(--sq-subtle))"
            }}>
              <img
                src={mesaLogo}
                alt="Mesa School of Business"
                className="h-8 w-auto object-contain"
              />
              <span className="text-sm font-bold" style={{ color: "hsl(var(--sq-text))" }}>Mesa School of Business</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
