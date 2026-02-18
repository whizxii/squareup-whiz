import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

export default function TeamSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  const team = [
    {
      name: "Param Jain",
      role: "Co-founder — Product & Engineering",
      bio: "Former Tech Lead at EA Sports. Shipped products at scale. Most painful failure: 6 months of build, no customer truth. That's why SquareUp exists.",
      linkedin: "https://www.linkedin.com/in/param-jain/",
      initials: "P",
    },
    {
      name: "Kunj Dhamsaniya",
      role: "Co-founder — GTM & AI Workflows",
      bio: "Builds in consumer and ops-heavy environments. Architects the automation layer that takes SquareUp from voice agent to Insight Brief — end-to-end.",
      linkedin: "https://linkedin.com/in/kunjdhamsaniya/",
      initials: "K",
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
              {/* Avatar ring */}
              <div className="flex-shrink-0">
                <div
                  className="w-20 h-20 rounded-full border-[3px] flex items-center justify-center font-black text-3xl"
                  style={{
                    borderColor: "hsl(var(--sq-orange))",
                    background: "hsl(var(--sq-orange) / 0.08)",
                    color: "hsl(var(--sq-orange))"
                  }}
                >
                  {member.initials}
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

        {/* Origin + badges */}
        <div className={`transition-all duration-500 delay-400 ${revealed ? "opacity-100" : "opacity-0"}`}>
          <div className="rounded-2xl px-8 py-6 max-w-2xl mx-auto text-center" style={{
            background: "hsl(var(--sq-card))",
            border: "1px solid hsl(var(--sq-subtle))"
          }}>
            <p className="font-medium leading-relaxed text-sm sm:text-base" style={{ color: "hsl(var(--sq-text))" }}>
              We met at{" "}
              <span className="font-bold" style={{ color: "hsl(var(--sq-orange))" }}>Mesa School of Business</span>
              {" "}— where we both took a year off to build full-time.{" "}
              <span className="font-bold">7 months in. Full-time since December.</span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
            {["Mesa School of Business", "Elevation Capital · Partner Network"].map((badge) => (
              <div key={badge} className="rounded-full px-4 py-2 text-sm font-bold" style={{
                background: "hsl(var(--sq-subtle))",
                color: "hsl(var(--sq-text))"
              }}>
                {badge}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
