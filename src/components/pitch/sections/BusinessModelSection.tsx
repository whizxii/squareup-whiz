import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

export default function BusinessModelSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="businessmodel"
      className={`bg-sq-card ${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
    >
      <div className="max-w-4xl mx-auto w-full" ref={ref}>
        <h2
          className={`font-black text-sq-text tracking-tight leading-tight text-center mb-12 ${
            isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"
          } ${revealed ? "animate-fade-up" : "opacity-0"}`}
        >
          Simple pricing. <span className="text-sq-orange">Immediate ROI.</span>
        </h2>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-600 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Card 1 */}
          <div className="bg-sq-off-white rounded-3xl p-8 border border-sq-subtle">
            <p className="text-sq-muted text-xs uppercase tracking-widest font-bold mb-2">Per Study</p>
            <h3 className="font-black text-sq-text text-2xl mb-1">Deep Dive Studies</h3>
            <p className="font-black text-sq-orange text-3xl mb-4">₹1L – ₹3L</p>
            <ul className="space-y-2 text-sq-muted text-sm">
              {["Focused validation for specific decisions", "Full AI-led interview campaign", "Executive Insight Brief within 7 days", "Severity scoring + validated risks"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-sq-orange font-bold">→</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Card 2 — recommended */}
          <div className="bg-sq-off-white rounded-3xl p-8 border-2 border-sq-orange relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-sq-orange text-white text-xs font-black px-3 py-1 rounded-full">Recommended</div>
            <p className="text-sq-muted text-xs uppercase tracking-widest font-bold mb-2">Per Month</p>
            <h3 className="font-black text-sq-text text-2xl mb-1">Continuous Intelligence</h3>
            <p className="font-black text-sq-orange text-3xl mb-4">₹75K – ₹1.5L<span className="text-base font-bold text-sq-muted">/mo</span></p>
            <ul className="space-y-2 text-sq-muted text-sm">
              {["Always-on customer intelligence layer", "Calls, tickets, reviews, socials — unified", "Monthly executive debrief", "Workflow integration + team access", "Data flywheel compounds over time"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-sq-orange font-bold">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-center text-sq-muted text-sm mt-8">
          A small fraction of your monthly ad spend — to avoid expensive mistakes.
        </p>
      </div>
    </section>
  );
}
