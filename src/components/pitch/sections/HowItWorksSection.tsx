import { useScrollAnimation } from "@/lib/useScrollAnimation";
import AvatarAIAgent from "../avatars/AvatarAIAgent";
import AvatarGrowthLead from "../avatars/AvatarGrowthLead";
import type { SlideMode } from "@/lib/slides";

const STEPS = [
  {
    num: "01",
    title: "Brief",
    sub: "You define the decision",
    body: "Tell us what you're trying to decide — segment to target, product to launch, CX gap to fix. We screen and recruit the right respondents. Zero coordination on your end.",
    avatar: null,
    icon: "🗺️",
  },
  {
    num: "02",
    title: "Interview",
    sub: "AI runs every conversation",
    body: "Our AI interviews respondents — probing naturally, following threads, adapting in real time. No moderator. No scheduling. Depth that surveys never reach, at cents per interview.",
    avatar: "ai",
    icon: "🤖",
  },
  {
    num: "03",
    title: "Synthesise",
    sub: "Signal, not transcripts",
    body: "Every conversation is processed automatically. Severity scores, risk flags, verbatim quotes, validated patterns. No manual analysis. No research homework for your team.",
    avatar: null,
    icon: "⚡",
  },
  {
    num: "04",
    title: "Route",
    sub: "Right brief, right team",
    body: "Growth gets their campaign pointers. Product gets their launch risks. Founders get the full picture. Each team gets what's relevant — nothing more, nothing less.",
    avatar: "growth",
    icon: "📬",
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
            Brief → AI Interviews → Routed Insights.<br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>Each team gets their brief. No coordination. No noise.</span>
          </h2>
        </div>

        {/* 4-step grid */}
        <div className={`${isPresenter ? "grid grid-cols-4 gap-6" : "grid grid-cols-2 lg:grid-cols-4 gap-5"}`}>
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className={`relative transition-all duration-600 ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              {/* Connector line desktop */}
              {i < 3 && (
                <div
                  className="hidden lg:block absolute top-8 z-0"
                  style={{
                    left: "calc(100% - 8px)",
                    width: "calc(100% - 32px)",
                    height: "2px",
                    background: `linear-gradient(90deg, hsl(var(--sq-orange) / 0.4), hsl(var(--sq-orange) / 0.1))`
                  }}
                />
              )}

              <div className="rounded-2xl p-5 h-full relative z-10 flex flex-col" style={{
                background: "hsl(var(--sq-off-white))",
                border: "1px solid hsl(var(--sq-subtle))"
              }}>
                {/* Number pill */}
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-full font-black text-lg text-white mb-4 shadow-md flex-shrink-0"
                  style={{ background: "hsl(var(--sq-orange))", boxShadow: "0 6px 18px hsl(var(--sq-orange) / 0.3)" }}
                >
                  {step.num}
                </div>

                <h3 className="font-black text-lg mb-1" style={{ color: "hsl(var(--sq-text))" }}>{step.title}</h3>
                <p className="font-bold text-xs uppercase tracking-wider mb-3" style={{ color: "hsl(var(--sq-orange))" }}>{step.sub}</p>
                <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: "hsl(var(--sq-muted))" }}>{step.body}</p>

                {step.avatar === "ai" && (
                  <div className="flex justify-center mt-auto">
                    <AvatarAIAgent size={isPresenter ? 100 : 90} />
                  </div>
                )}
                {step.avatar === "growth" && (
                  <div className="flex justify-center mt-auto">
                    <AvatarGrowthLead size={isPresenter ? 100 : 90} />
                  </div>
                )}
                {!step.avatar && (
                  <div className="text-4xl text-center mt-auto">{step.icon}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Platform Vision callout strip */}
        <div
          className={`mt-10 rounded-2xl px-8 py-6 transition-all duration-500 delay-700 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          style={{
            background: "hsl(var(--sq-off-white))",
            borderLeft: "4px solid hsl(var(--sq-orange))",
            border: "1px solid hsl(var(--sq-subtle))",
            borderLeftWidth: "4px",
            borderLeftColor: "hsl(var(--sq-orange))",
          }}
        >
          <div className="flex items-start gap-4">
            <span className="text-2xl flex-shrink-0 mt-0.5">🧱</span>
            <div>
              <p className="font-black text-base mb-1" style={{ color: "hsl(var(--sq-text))" }}>
                Built to grow with you.{" "}
                <span style={{ color: "hsl(var(--sq-orange))" }}>Platform as Lego blocks.</span>
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--sq-muted))" }}>
                Each new block makes your customer intelligence stronger and easier to act on — AI Copilot for your own interviews, automatic call processing, always-on synthesis across every customer conversation. One platform. Every signal. Routed to whoever needs to act.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
