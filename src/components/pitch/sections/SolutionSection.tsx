import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

export default function SolutionSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="solution"
      className={`relative bg-sq-off-white overflow-hidden ${isPresenter ? "h-full flex items-center px-20" : "py-24 px-6"}`}
    >
      {/* Pulsing watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-40 h-40 rounded-2xl bg-sq-orange/10 animate-pulse-logo flex items-center justify-center">
          <span className="font-black text-sq-orange/20 text-6xl">S</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10 w-full" ref={ref}>
        <h2
          className={`font-black text-sq-text tracking-tight leading-tight text-center mb-12 ${
            isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"
          } ${revealed ? "animate-fade-up" : "opacity-0"}`}
        >
          A <span className="text-sq-orange">decision-risk reduction layer</span>
          <br />for consumer brands.
        </h2>

        {/* Without / With split */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-700 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Without */}
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="font-bold text-red-700 text-sm uppercase tracking-widest">Without SquareUp</span>
            </div>
            {["Decisions made on gut feel & internal metrics", "6–8 weeks to get research you can trust", "Insights scattered across recordings & docs", "Risk only visible after launch — when it's too late"].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <span className="text-red-400 mt-0.5 font-bold">✕</span>
                <p className="text-red-800 text-sm">{item}</p>
              </div>
            ))}
          </div>

          {/* Arrow */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="bg-sq-orange text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-lg">
              →
            </div>
          </div>

          {/* With */}
          <div className="bg-orange-50 border border-sq-orange/20 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-sq-orange" />
              <span className="font-bold text-sq-orange text-sm uppercase tracking-widest">With SquareUp</span>
            </div>
            {["Decision-grade signal from real customer conversations", "7 days from brief to boardroom-ready insights", "One system of record: calls, tickets, reviews, socials", "Risk flagged before you commit — not after"].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <span className="text-sq-orange mt-0.5 font-bold">✓</span>
                <p className="text-sq-text text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <p
          className={`text-center text-sq-muted mt-8 max-w-3xl mx-auto text-sm sm:text-base leading-relaxed transition-all duration-500 delay-500 ${revealed ? "opacity-100" : "opacity-0"}`}
        >
          SquareUp makes talking to customers friction-free — using voice agents to screen, schedule, and co-pilot interviews. Then runs AI-led campaigns to validate at scale. Then connects calls, tickets, reviews, socials, and product data into one system of record.
        </p>
      </div>
    </section>
  );
}
