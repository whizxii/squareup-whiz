import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const TOOLS = [
  { name: "Dashboards & BI", desc: "Shows what happened. Not why.", verdict: "Explains the past" },
  { name: "Surveys", desc: "Low response rates. No depth. No follow-up. Opinions, not conversations.", verdict: "Collects opinions" },
  { name: "Support Tools", desc: "Reactive. Noisy. Not decision-grade. You already know customers are unhappy.", verdict: "Manages complaints" },
  { name: "Research Agencies", desc: "6–8 weeks. ₹30–50L. Findings arrive after the decision was already made.", verdict: "Too slow. Too expensive." },
];

export default function ToolsGapSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="toolsgap"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        <div className={`mb-14 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            The Gap
          </p>
          <h2
            className={`font-black tracking-tight leading-tight max-w-3xl ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            Every tool tells you what happened.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>None tell you why.</span>
          </h2>
          <p className="mt-4 text-base" style={{ color: "hsl(var(--sq-muted))" }}>
            There's no system to generate decision-grade customer signal at speed. That's the gap SquareUp fills.
          </p>
        </div>

        <div className={`rounded-2xl overflow-hidden mb-8 transition-all duration-600 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{ border: "1px solid hsl(var(--sq-subtle))" }}>

          <div className="grid grid-cols-3 px-6 py-3" style={{ background: "hsl(var(--sq-subtle))" }}>
            <span className="font-black text-xs uppercase tracking-wider" style={{ color: "hsl(var(--sq-text))" }}>Tool</span>
            <span className="font-black text-xs uppercase tracking-wider" style={{ color: "hsl(var(--sq-text))" }}>What it does</span>
            <span className="font-black text-xs uppercase tracking-wider" style={{ color: "hsl(var(--sq-text))" }}>The gap</span>
          </div>

          {TOOLS.map((t, i) => (
            <div
              key={t.name}
              className={`grid grid-cols-3 px-6 py-4 items-start gap-4 ${i < TOOLS.length - 1 ? "border-b" : ""}`}
              style={{
                background: "hsl(var(--sq-card))",
                borderColor: "hsl(var(--sq-subtle))"
              }}
            >
              <p className="font-bold text-sm" style={{ color: "hsl(var(--sq-text))" }}>{t.name}</p>
              <p className="text-sm" style={{ color: "hsl(var(--sq-muted))" }}>{t.desc}</p>
              <span className="inline-block font-bold text-xs px-3 py-1.5 rounded-full w-fit"
                style={{ background: "#FEF2F2", color: "#B91C1C" }}>
                {t.verdict}
              </span>
            </div>
          ))}

          {/* SquareUp row */}
          <div className="grid grid-cols-3 px-6 py-4 items-start gap-4"
            style={{ background: "hsl(var(--sq-orange) / 0.06)", borderTop: "2px solid hsl(var(--sq-orange) / 0.3)" }}>
            <p className="font-black text-sm" style={{ color: "hsl(var(--sq-orange))" }}>SquareUp</p>
            <p className="text-sm font-bold" style={{ color: "hsl(var(--sq-text))" }}>AI runs interviews. Generates signal on demand. Insight Brief in 7 days.</p>
            <span className="inline-block font-bold text-xs px-3 py-1.5 rounded-full w-fit text-white"
              style={{ background: "hsl(var(--sq-orange))" }}>
              Generates signal ✓
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
