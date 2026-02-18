import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

export default function TeamSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  const team = [
    {
      name: "Param Jain",
      role: "Co-founder · Product & Engineering",
      bio: "Tech Lead at EA Sports. Ships products at scale. Most painful failure: building 6 months ahead of customer truth — without ever talking to the people who were supposed to care.",
      linkedin: "https://www.linkedin.com/in/param-jain/",
      initials: "P",
    },
    {
      name: "Kunj Dhamsaniya",
      role: "Co-founder · GTM & AI Workflows",
      bio: "Builds in consumer and ops-heavy environments. Architects the automation layer that makes SquareUp run end-to-end — from voice agent to insight brief.",
      linkedin: "https://linkedin.com/in/kunjdhamsaniya/",
      initials: "K",
    },
  ];

  return (
    <section
      id="team"
      className={`bg-sq-off-white ${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>
        <h2
          className={`font-black text-sq-text tracking-tight leading-tight text-center mb-14 ${
            isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"
          } ${revealed ? "animate-fade-up" : "opacity-0"}`}
        >
          Built by people who've been{" "}
          <span className="text-sq-orange">burned by this problem.</span>
        </h2>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 transition-all duration-600 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {team.map((member) => (
            <div key={member.name} className="bg-sq-card rounded-3xl p-8 border border-sq-subtle flex gap-6">
              {/* Avatar circle */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-full border-4 border-sq-orange flex items-center justify-center bg-sq-orange/10 shadow-md shadow-sq-orange/15">
                  <span className="font-black text-sq-orange text-3xl">{member.initials}</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-black text-sq-text text-lg leading-tight">{member.name}</h3>
                <p className="text-sq-orange font-bold text-xs uppercase tracking-wider mt-0.5 mb-3">{member.role}</p>
                <p className="text-sq-muted text-sm leading-relaxed mb-4">{member.bio}</p>
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sq-orange font-bold text-xs hover:underline"
                >
                  LinkedIn →
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Origin story */}
        <div className={`text-center transition-all duration-500 delay-400 ${revealed ? "opacity-100" : "opacity-0"}`}>
          <div className="inline-block bg-sq-card rounded-2xl border border-sq-subtle px-8 py-5 max-w-2xl">
            <p className="text-sq-text font-medium leading-relaxed text-sm sm:text-base">
              We met at <span className="font-bold text-sq-orange">Mesa School of Business</span> — where we both took a year off to build a startup full-time.{" "}
              <span className="font-bold">7 months in. Full-time since December.</span>
            </p>
          </div>

          {/* Badges */}
          <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
            <div className="bg-sq-subtle rounded-full px-4 py-2 flex items-center gap-2">
              <span className="font-black text-sq-text text-sm">Mesa</span>
              <span className="text-sq-muted text-xs">School of Business</span>
            </div>
            <div className="bg-sq-subtle rounded-full px-4 py-2 flex items-center gap-2">
              <span className="font-black text-sq-text text-sm">Elevation Capital</span>
              <span className="text-sq-muted text-xs">Partner program</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
