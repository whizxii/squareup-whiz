import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const STEPS = [
  { num: "1", title: "Define", body: "Set the core business decision and questions." },
  { num: "2", title: "Reach", body: "We recruit the exact target audience profile." },
  { num: "3", title: "Interview", body: "AI executes 50+ deep 1v1 interviews simultaneously." },
  { num: "4", title: "Extract", body: "Signal synthesized into themes, risks, and severity." },
  { num: "5", title: "Route", body: "Custom briefs sent to Growth, Product, and CX teams." },
  { num: "6", title: "Store", body: "All truth is archived natively for future audits." },
];

export default function HowItWorksSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter");

  return (
    <section
      id="howitworks"
      className={`${isPresenter ? "min-h-screen flex items-center px-16" : "py-32 px-8 sm:px-16"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-6xl mx-auto w-full" ref={ref}>

        {/* Header — tight */}
        <div className={`${isPresenter ? "mb-6" : "mb-14"} text-center transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            The Workflow
          </p>
          <h2 className={`font-black tracking-tight leading-[1.05] ${isPresenter ? "text-5xl" : "text-4xl sm:text-[3rem]"}`}
            style={{ color: "hsl(var(--sq-text))" }}>
            From decision question to <br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>customer understanding in just 2 days.</span>
          </h2>
        </div>

        {/* 6-step grid */}
        <div className={`grid ${isPresenter ? "grid-cols-6" : "md:grid-cols-3 lg:grid-cols-6"} gap-4`}>
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className={`relative rounded-2xl overflow-hidden flex flex-col transition-all duration-500 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
              style={{
                transitionDelay: `${i * 100}ms`,
                background: "hsl(var(--sq-card))",
                border: "1px solid hsl(var(--sq-subtle))",
                boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
              }}
            >
              <div className="h-1 w-full" style={{ background: `hsl(var(--sq-orange) / ${0.3 + i * 0.15})` }} />

              <div className={`${isPresenter ? "p-3" : "p-5"} flex-1`}>
                <div className={`inline-flex items-center justify-center ${isPresenter ? "w-6 h-6 mb-2" : "w-8 h-8 mb-4"} rounded-full font-black text-sm`}
                  style={{ background: "hsl(var(--sq-orange)/0.1)", color: "hsl(var(--sq-orange))" }}>
                  {step.num}
                </div>
                <h3 className={`font-black ${isPresenter ? "text-sm mb-1" : "text-[15px] mb-2"}`} style={{ color: "hsl(var(--sq-text))" }}>{step.title}</h3>
                <p className="text-xs leading-relaxed font-medium" style={{ color: "hsl(var(--sq-muted))" }}>{step.body}</p>
              </div>

            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
