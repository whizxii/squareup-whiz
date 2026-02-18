import { useScrollAnimation, useCountUp } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const FUNDS = [
  { pct: "50%", label: "Product", detail: "AI infrastructure depth, voice agent reliability, insight brief quality", icon: "🔧" },
  { pct: "40%", label: "GTM", detail: "Convert 3 design partners → paying case studies, Mesa network activation", icon: "📣" },
  { pct: "10%", label: "Ops", detail: "Team, tools, legal", icon: "⚙️" },
];

function AskCounter() {
  const { ref, display } = useCountUp(500000, 2000, "$", "");
  const formatted = display.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="font-black text-sq-orange text-6xl sm:text-7xl lg:text-8xl tracking-tight">
      ${formatted === "$0" ? "0" : formatted.slice(1)}K
    </div>
  );
}

export default function TheAskSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="ask"
      className={`bg-sq-dark ${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>
        <div className={`text-center mb-12 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <h2 className={`font-black text-white tracking-tight leading-tight mb-6 ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"}`}>
            Raising <span className="text-sq-orange">$500K</span> to turn pilots
            <br />into a repeatable engine.
          </h2>

          {/* Count-up */}
          <div className="flex justify-center mb-2">
            <AskCounter />
          </div>
          <p className="text-white/50 text-sm">Seed Round 2026</p>
        </div>

        {/* Use of funds */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-5 mb-10 transition-all duration-600 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {FUNDS.map((f) => (
            <div key={f.label} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="text-3xl mb-2">{f.icon}</div>
              <div className="font-black text-sq-orange text-3xl mb-1">{f.pct}</div>
              <div className="font-black text-white text-lg mb-2">{f.label}</div>
              <p className="text-white/50 text-sm leading-relaxed">{f.detail}</p>
            </div>
          ))}
        </div>

        {/* Unlock statement */}
        <p className={`text-white/60 text-center text-sm sm:text-base mb-8 max-w-2xl mx-auto transition-all duration-500 delay-300 ${revealed ? "opacity-100" : "opacity-0"}`}>
          This capital buys us revenue in 90 days and a repeatable sales motion through Mesa's founder and VC portfolio network.
        </p>

        {/* Moat callout */}
        <div className={`border border-sq-orange/40 rounded-2xl p-6 bg-sq-orange/5 transition-all duration-500 delay-400 ${revealed ? "opacity-100" : "opacity-0"}`}>
          <p className="text-sq-orange font-bold text-sm uppercase tracking-widest mb-3">Defensible Moat</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { title: "Data Flywheel", body: "Every conversation trained on SquareUp improves our models. Proprietary dataset compounds." },
              { title: "Workflow Lock-in", body: "Teams that build their research workflow on us increase switching cost with every brief delivered." },
              { title: "Mesa Distribution", body: "Unfair access across all startups in Mesa's portfolio — and by extension, their LPs' portfolio companies." },
            ].map((m) => (
              <div key={m.title}>
                <p className="font-bold text-white text-sm mb-1">{m.title}</p>
                <p className="text-white/50 text-xs leading-relaxed">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
