import { useScrollAnimation } from "@/lib/useScrollAnimation";
import AvatarAIAgent from "../avatars/AvatarAIAgent";
import AvatarGrowthLead from "../avatars/AvatarGrowthLead";
import type { SlideMode } from "@/lib/slides";

const STEPS = [
  {
    num: "01",
    title: "Brief",
    sub: "You define the decision",
    body: "Tell us the decision you're trying to make. We screen and schedule the right respondents. Zero coordination overhead on your side.",
    avatar: null,
    icon: "🗺️",
  },
  {
    num: "02",
    title: "Interview",
    sub: "AI runs the conversations",
    body: "Our AI interviews respondents autonomously — probing naturally, following threads, adapting in real-time. Depth that surveys never get. At cents per interview.",
    avatar: "ai",
    icon: "🤖",
  },
  {
    num: "03",
    title: "Decide",
    sub: "Insight Brief in 7 days",
    body: "You get an executive-ready brief with severity scoring, validated risks, verbatim quotes, and a recommended next step. Commit or course-correct — before you burn runway.",
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
      className={`${isPresenter ? "h-full flex items-center px-20" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-6xl mx-auto w-full" ref={ref}>

        {/* Header */}
        <div className={`mb-16 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            How It Works
          </p>
          <h2
            className={`font-black tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            Brief → AI interviews → Insight Brief.<br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>7 days. No agency. No coordination overhead.</span>
          </h2>
        </div>

        <div className={`${isPresenter ? "grid grid-cols-3 gap-8" : "grid md:grid-cols-3 gap-6"}`}>
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className={`relative transition-all duration-600 ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: `${i * 180}ms` }}
            >
              {/* Connector line desktop */}
              {i < 2 && (
                <div
                  className="hidden md:block absolute top-8 z-0"
                  style={{
                    left: "calc(100% - 8px)",
                    width: "calc(100% - 40px)",
                    height: "2px",
                    background: `linear-gradient(90deg, hsl(var(--sq-orange) / 0.4), hsl(var(--sq-orange) / 0.1))`
                  }}
                />
              )}

              <div className="rounded-2xl p-6 h-full relative z-10" style={{
                background: "hsl(var(--sq-off-white))",
                border: "1px solid hsl(var(--sq-subtle))"
              }}>
                {/* Number pill */}
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full font-black text-xl text-white mb-5 shadow-md"
                  style={{ background: "hsl(var(--sq-orange))", boxShadow: "0 6px 18px hsl(var(--sq-orange) / 0.3)" }}
                >
                  {step.num}
                </div>

                <h3 className="font-black text-xl mb-1" style={{ color: "hsl(var(--sq-text))" }}>{step.title}</h3>
                <p className="font-bold text-xs uppercase tracking-wider mb-3" style={{ color: "hsl(var(--sq-orange))" }}>{step.sub}</p>
                <p className="text-sm leading-relaxed mb-5" style={{ color: "hsl(var(--sq-muted))" }}>{step.body}</p>

                {step.avatar === "ai" && (
                  <div className="flex justify-center">
                    <AvatarAIAgent size={isPresenter ? 120 : 110} />
                  </div>
                )}
                {step.avatar === "growth" && (
                  <div className="flex justify-center">
                    <AvatarGrowthLead size={isPresenter ? 120 : 110} />
                  </div>
                )}
                {!step.avatar && (
                  <div className="text-4xl text-center">{step.icon}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
