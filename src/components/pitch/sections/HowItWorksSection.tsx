import { useScrollAnimation } from "@/lib/useScrollAnimation";
import AvatarAIAgent from "../avatars/AvatarAIAgent";
import AvatarGrowthLead from "../avatars/AvatarGrowthLead";
import AvatarNPDManager from "../avatars/AvatarNPDManager";
import AvatarCXLead from "../avatars/AvatarCXLead";
import type { SlideMode } from "@/lib/slides";

const STEPS = [
  { num: "01", title: "Brief", body: "Define the decision. We recruit the right respondents.", AvatarComponent: AvatarCXLead },
  { num: "02", title: "Interview", body: "AI runs every conversation. No scheduling. No moderator.", AvatarComponent: AvatarAIAgent },
  { num: "03", title: "Synthesise", body: "Severity scores, risk flags, verbatim quotes. No homework.", AvatarComponent: AvatarNPDManager },
  { num: "04", title: "Route", body: "Growth gets campaign pointers. Product gets launch risks.", AvatarComponent: AvatarGrowthLead },
];

export default function HowItWorksSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="howitworks"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-6xl mx-auto w-full" ref={ref}>

        {/* Header — tight */}
        <div className={`mb-14 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            How It Works
          </p>
          <h2 className={`font-black tracking-tight leading-[1.0] ${isPresenter ? "text-5xl" : "text-[2.5rem] sm:text-[3rem]"}`}
            style={{ color: "hsl(var(--sq-text))" }}>
            Brief → Interview → Synthesis → Routed Briefs.<br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>7 days, no coordination.</span>
          </h2>
        </div>

        {/* 4-step grid */}
        <div className={`grid ${isPresenter ? "grid-cols-4" : "grid-cols-2 lg:grid-cols-4"} gap-4`}>
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className={`relative rounded-3xl overflow-hidden flex flex-col transition-all duration-500 ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{
                transitionDelay: `${i * 120}ms`,
                background: "hsl(var(--sq-card))",
                border: "1px solid hsl(var(--sq-subtle))",
                boxShadow: "0 2px 16px rgba(0,0,0,0.04)"
              }}
            >
              {/* Top accent */}
              <div className="h-0.5 w-full" style={{ background: `hsl(var(--sq-orange) / ${0.4 + i * 0.2})` }} />

              <div className="px-5 pt-5 pb-3 flex-1">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-full font-black text-xs text-white mb-4"
                  style={{ background: "hsl(var(--sq-orange))", boxShadow: "0 4px 12px hsl(var(--sq-orange) / 0.3)" }}>
                  {step.num}
                </div>
                <h3 className="font-black text-lg mb-2" style={{ color: "hsl(var(--sq-text))" }}>{step.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--sq-muted))" }}>{step.body}</p>
              </div>

              {/* Avatar — blends into off-white */}
              <div className="flex justify-center pb-3 pt-2"
                style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--sq-off-white) / 0.6))" }}>
                <step.AvatarComponent size={isPresenter ? 100 : 115} />
              </div>

              {/* Connector */}
              {i < 3 && (
                <div className="hidden lg:flex absolute right-0 top-1/3 translate-x-full items-center justify-center w-4 z-10">
                  <span className="font-black text-xs" style={{ color: "hsl(var(--sq-orange) / 0.4)" }}>›</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
