import { useScrollAnimation } from "@/lib/useScrollAnimation";
import AvatarAIAgent from "../avatars/AvatarAIAgent";
import AvatarGrowthLead from "../avatars/AvatarGrowthLead";
import AvatarNPDManager from "../avatars/AvatarNPDManager";
import AvatarCXLead from "../avatars/AvatarCXLead";
import type { SlideMode } from "@/lib/slides";

const STEPS = [
  {
    num: "01",
    title: "Brief",
    sub: "You define the decision",
    body: "Tell us what to decide. We recruit the right respondents.",
    AvatarComponent: AvatarCXLead,
  },
  {
    num: "02",
    title: "Interview",
    sub: "AI runs every conversation",
    body: "No moderator. No scheduling. Depth surveys never reach.",
    AvatarComponent: AvatarAIAgent,
  },
  {
    num: "03",
    title: "Synthesise",
    sub: "Signal, not transcripts",
    body: "Severity scores. Risk flags. Verbatim quotes. No homework.",
    AvatarComponent: AvatarNPDManager,
  },
  {
    num: "04",
    title: "Route",
    sub: "Right brief, right team",
    body: "Growth gets campaign pointers. Product gets launch risks.",
    AvatarComponent: AvatarGrowthLead,
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
        <div className={`mb-16 text-center transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            How It Works
          </p>
          <h2
            className={`font-black tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            Brief → Interviews → Synthesis → Routed Briefs.<br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>No coordination. No noise.</span>
          </h2>
        </div>

        {/* 4-step grid */}
        <div className={`${isPresenter ? "grid grid-cols-4 gap-5" : "grid grid-cols-2 lg:grid-cols-4 gap-5"}`}>
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className={`relative transition-all duration-600 ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: `${i * 130}ms` }}
            >
              {/* Connector arrow between steps */}
              {i < 3 && (
                <div
                  className="hidden lg:flex absolute top-10 z-20 items-center justify-center"
                  style={{ left: "calc(100% - 10px)", width: "20px" }}
                >
                  <span className="font-black text-xs" style={{ color: "hsl(var(--sq-orange) / 0.5)" }}>→</span>
                </div>
              )}

              <div className="rounded-3xl overflow-hidden h-full flex flex-col relative" style={{
                background: "hsl(var(--sq-off-white))",
                border: "1px solid hsl(var(--sq-subtle))",
                boxShadow: "0 2px 16px rgba(0,0,0,0.04)"
              }}>
                {/* Orange top strip */}
                <div className="h-1 w-full" style={{ background: "hsl(var(--sq-orange))", opacity: 0.6 }} />

                {/* Top content */}
                <div className="px-5 pt-5 pb-2 flex-1">
                  {/* Step pill */}
                  <div
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full font-black text-sm text-white mb-4"
                    style={{ background: "hsl(var(--sq-orange))", boxShadow: "0 4px 14px hsl(var(--sq-orange) / 0.35)" }}
                  >
                    {step.num}
                  </div>

                  <h3 className="font-black text-xl mb-1" style={{ color: "hsl(var(--sq-text))" }}>{step.title}</h3>
                  <p className="font-bold text-xs uppercase tracking-wider mb-3" style={{ color: "hsl(var(--sq-orange))" }}>{step.sub}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--sq-muted))" }}>{step.body}</p>
                </div>

                {/* Avatar — blends into card bg */}
                <div className="flex justify-center pb-2 pt-3" style={{
                  background: `linear-gradient(to bottom, transparent, hsl(var(--sq-subtle) / 0.5))`
                }}>
                  <step.AvatarComponent size={isPresenter ? 110 : 120} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Simple bottom callout — tight */}
        <div
          className={`mt-10 text-center transition-all duration-500 delay-700 ${revealed ? "opacity-100" : "opacity-0"}`}
        >
          <p className="font-black text-base" style={{ color: "hsl(var(--sq-text))" }}>
            One platform. Every signal.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>Routed to whoever needs to act.</span>
          </p>
        </div>

      </div>
    </section>
  );
}
