import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const TOOLS = [
  { name: "Dashboards & BI", verdict: "Explains what happened — not why.", icon: "✕" },
  { name: "Surveys", verdict: "Opinions. No depth. No follow-up.", icon: "✕" },
  { name: "Support Tools", verdict: "Reactive noise. Not decision-grade.", icon: "✕" },
  { name: "Research Agencies", verdict: "6–8 weeks. ₹30–50L. Already too late.", icon: "✕" },
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
      <div className="max-w-4xl mx-auto w-full" ref={ref}>

        <div className={`mb-14 text-center transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            The Gap
          </p>
          <h2
            className={`font-black tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            Every tool tells you what happened.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>None tell you why.</span>
          </h2>
        </div>

        {/* Clean 2-col table */}
        <div className={`rounded-2xl overflow-hidden transition-all duration-600 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{ border: "1px solid hsl(var(--sq-subtle))", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>

          {/* Header row */}
          <div className="grid grid-cols-2 px-6 py-3.5" style={{ background: "hsl(var(--sq-subtle))" }}>
            <span className="font-black text-xs uppercase tracking-[0.15em]" style={{ color: "hsl(var(--sq-text))" }}>Tool</span>
            <span className="font-black text-xs uppercase tracking-[0.15em]" style={{ color: "hsl(var(--sq-text))" }}>The Gap</span>
          </div>

          {/* Tool rows */}
          {TOOLS.map((t, i) => (
            <div
              key={t.name}
              className={`grid grid-cols-2 px-6 py-4 items-center ${i < TOOLS.length - 1 ? "border-b" : ""}`}
              style={{
                background: "hsl(var(--sq-card))",
                borderColor: "hsl(var(--sq-subtle))"
              }}
            >
              <div className="flex items-center gap-3">
                <span className="font-black text-xs flex-shrink-0" style={{ color: "#DC2626" }}>{t.icon}</span>
                <p className="font-bold text-sm" style={{ color: "hsl(var(--sq-text))" }}>{t.name}</p>
              </div>
              <p className="text-sm" style={{ color: "hsl(var(--sq-muted))" }}>{t.verdict}</p>
            </div>
          ))}

          {/* SquareUp highlight row */}
          <div className="grid grid-cols-2 px-6 py-5 items-center"
            style={{
              background: "hsl(var(--sq-orange))",
              borderTop: "none"
            }}>
            <div className="flex items-center gap-3">
              <span className="font-black text-xs text-white flex-shrink-0">✓</span>
              <p className="font-black text-sm text-white">SquareUp</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white/90">AI runs interviews. Signal on demand. Brief in 7 days.</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
