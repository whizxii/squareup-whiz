import { useScrollAnimation } from "@/lib/useScrollAnimation";
import AvatarAIAgent from "../avatars/AvatarAIAgent";
import AvatarGrowthLead from "../avatars/AvatarGrowthLead";
import type { SlideMode } from "@/lib/slides";

const STEPS = [
  {
    num: "01",
    title: "Map",
    sub: "Brief → Screened respondents",
    body: "Voice agent screens, schedules, and briefs respondents. Zero coordination overhead. Your team sets the research brief — SquareUp handles everything else.",
    avatar: null,
    icon: "🗺️",
  },
  {
    num: "02",
    title: "Conversate",
    sub: "AI-led interviews at scale",
    body: "Our AI conducts human-quality interviews autonomously or co-pilots your team's calls. Probes naturally, adapts in real-time, captures depth you can't get from surveys.",
    avatar: "ai",
    icon: "🤖",
  },
  {
    num: "03",
    title: "Decide",
    sub: "Insight Brief, ready in 7 days",
    body: "Executive-ready Insight Brief with severity scoring, key quotes, validated risks, and recommended actions. Your leadership gets the clarity to commit — or course-correct.",
    avatar: "growth",
    icon: "📊",
  },
];

export default function HowItWorksSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="howitworks"
      className={`bg-sq-card ${isPresenter ? "h-full flex items-center px-20" : "py-24 px-6"}`}
    >
      <div className="max-w-6xl mx-auto w-full" ref={ref}>
        <h2
          className={`font-black text-sq-text tracking-tight leading-tight text-center mb-4 ${
            isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"
          } ${revealed ? "animate-fade-up" : "opacity-0"}`}
        >
          From raw conversation to{" "}
          <span className="text-sq-orange">boardroom-ready insight</span>
          {" "}— in 7 days.
        </h2>
        <p className="text-center text-sq-muted mb-14">Three steps. Fully AI-powered. Zero research agency needed.</p>

        <div className={`${isPresenter ? "grid grid-cols-3 gap-8" : "grid md:grid-cols-3 gap-8"}`}>
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className={`relative transition-all duration-600 ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 200}ms` }}
            >
              {/* Connector line */}
              {i < 2 && !isPresenter && (
                <div className="hidden md:block absolute top-10 left-full w-full h-[2px] bg-sq-orange/20 z-0" style={{ width: "calc(100% - 80px)", left: "calc(100% - 20px)" }} />
              )}

              <div className="bg-sq-off-white rounded-2xl p-6 h-full relative z-10">
                {/* Number pill */}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sq-orange text-white font-black text-lg mb-4 shadow-md shadow-sq-orange/20">
                  {step.num}
                </div>

                <h3 className="font-black text-sq-text text-xl mb-1">{step.title}</h3>
                <p className="text-sq-orange font-bold text-xs uppercase tracking-wider mb-3">{step.sub}</p>
                <p className="text-sq-muted text-sm leading-relaxed">{step.body}</p>

                {/* Avatar */}
                {step.avatar === "ai" && (
                  <div className="mt-4 flex justify-center">
                    <AvatarAIAgent size={isPresenter ? 130 : 110} />
                  </div>
                )}
                {step.avatar === "growth" && (
                  <div className="mt-4 flex justify-center">
                    <AvatarGrowthLead size={isPresenter ? 130 : 110} />
                  </div>
                )}
                {!step.avatar && (
                  <div className="mt-4 text-4xl text-center">{step.icon}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
