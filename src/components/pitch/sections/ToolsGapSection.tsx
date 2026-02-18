import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const TOOLS = [
  { name: "Dashboards", desc: "Shows what happened. Not why.", icon: "📊" },
  { name: "Surveys", desc: "Low response. No depth. No follow-up.", icon: "📋" },
  { name: "Support Tools", desc: "Reactive. Noisy. Not decision-grade.", icon: "🎫" },
  { name: "Research Firms", desc: "6–8 weeks. $50K+. Too late.", icon: "🔬" },
];

export default function ToolsGapSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="toolsgap"
      className={`bg-sq-off-white ${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>
        <h2
          className={`font-black text-sq-text tracking-tight leading-tight text-center mb-12 ${
            isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"
          } ${revealed ? "animate-fade-up" : "opacity-0"}`}
        >
          There is no system to turn conversations into{" "}
          <span className="text-sq-orange">decision-grade data at scale.</span>
        </h2>

        <div className={`grid grid-cols-2 gap-5 mb-8 transition-all duration-600 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {TOOLS.map((t, i) => (
            <div
              key={t.name}
              className="bg-sq-card rounded-2xl p-6 border border-sq-subtle flex items-start gap-4"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <span className="text-3xl">{t.icon}</span>
              <div>
                <h3 className="font-bold text-sq-text mb-1">{t.name}</h3>
                <p className="text-sq-muted text-sm">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Decision void → SquareUp */}
        <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-500 delay-500 ${revealed ? "opacity-100" : "opacity-0"}`}>
          <div className="bg-sq-subtle rounded-2xl p-5 text-center border-2 border-dashed border-sq-muted/30">
            <p className="font-black text-sq-muted/50 text-xl uppercase tracking-widest">Decision Void</p>
            <p className="text-sq-muted text-xs mt-1">No unified system. Decisions made blind.</p>
          </div>

          <div className="text-sq-orange font-black text-3xl hidden sm:block">→</div>

          <div className="bg-sq-orange rounded-2xl p-5 text-center shadow-lg shadow-sq-orange/20 border-2 border-sq-orange animate-pulse-logo" style={{ animation: "none" }}>
            <p className="font-black text-white text-xl">SquareUp</p>
            <p className="text-white/80 text-xs mt-1">The missing system.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
