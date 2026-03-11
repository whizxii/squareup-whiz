import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

export default function InsightBriefSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter" || mode === "download");

  return (
    <section
      id="insightbrief"
      className={`${isPresenter ? "min-h-screen flex items-center px-16" : "py-32 px-8 sm:px-16"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        <div className={`text-center ${isPresenter ? "mb-8" : "mb-14"} transition-all duration-700 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            The Output
          </p>
          <h2
            className={`font-black tracking-tight leading-[1.05] ${isPresenter ? "text-4xl" : "text-4xl sm:text-5xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            What You Get
          </h2>
          {!isPresenter && (
            <p className="mt-4 text-base font-medium max-w-2xl mx-auto" style={{ color: "hsl(var(--sq-muted))" }}>
              Not a dashboard. Not a slide deck. A boardroom-grade brief where every recommendation traces back to real customer evidence.
            </p>
          )}
        </div>

        {/* Label above card */}
        <div className={`text-center ${isPresenter ? "mb-3" : "mb-5"} transition-all duration-700 delay-150 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className={`${isPresenter ? "text-xs" : "text-sm"} font-semibold`} style={{ color: "hsl(var(--sq-muted))" }}>
            Every study ends with an executive-ready brief like this one — built from real conversations, not assumptions.
          </p>
        </div>

        {/* The Brief Card */}
        <div
          className={`rounded-3xl overflow-hidden transition-all duration-700 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{ background: "hsl(var(--sq-off-white))", border: "1px solid hsl(var(--sq-subtle))", boxShadow: "0 12px 48px rgba(0,0,0,0.06)" }}
        >
          {/* Top Strip — Decision + Confidence */}
          <div className={`${isPresenter ? "px-6 py-4" : "px-8 py-5"} flex items-center justify-between flex-wrap gap-3`}
            style={{ background: "hsl(var(--sq-orange) / 0.06)", borderBottom: "1px solid hsl(var(--sq-orange) / 0.15)" }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(var(--sq-orange))" }}>Decision</p>
              <p className={`font-black ${isPresenter ? "text-base" : "text-lg"}`} style={{ color: "hsl(var(--sq-text))" }}>
                Test ₹399 / 50ml entry SKU before full launch
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--sq-muted))" }}>Confidence</p>
                <p className="font-black text-sm" style={{ color: "hsl(var(--sq-orange))" }}>High</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--sq-muted))" }}>Based on</p>
                <p className="font-black text-sm" style={{ color: "hsl(var(--sq-text))" }}>47 interviews</p>
              </div>
            </div>
          </div>

          {/* Body — two columns */}
          <div className={`grid ${isPresenter ? "grid-cols-2 gap-5 p-6" : "md:grid-cols-[1.4fr_1fr] gap-8 p-8"}`}>

            {/* Left — Evidence */}
            <div className="space-y-5">
              {/* Quote */}
              <div className={`rounded-2xl ${isPresenter ? "p-4" : "p-5"}`}
                style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(var(--sq-muted))" }}>Customer Quote</p>
                <p className={`${isPresenter ? "text-sm" : "text-base"} font-semibold italic leading-relaxed`} style={{ color: "hsl(var(--sq-text))" }}>
                  "₹1200 is too much for an unproven scent. ₹399 for a mini would fly."
                </p>
              </div>

              {/* Theme + Severity */}
              <div className={`rounded-2xl ${isPresenter ? "p-4" : "p-5"}`}
                style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(var(--sq-muted))" }}>Theme</p>
                    <p className={`font-black ${isPresenter ? "text-sm" : "text-base"}`} style={{ color: "hsl(var(--sq-text))" }}>Price-Pack Mismatch</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(var(--sq-muted))" }}>Severity</p>
                    <p className="font-black text-lg" style={{ color: "hsl(var(--sq-orange))" }}>9.2<span className="text-xs font-bold text-[hsl(var(--sq-muted))]">/10</span></p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "hsl(var(--sq-orange) / 0.1)", color: "hsl(var(--sq-orange))" }}>
                    Critical
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "hsl(var(--sq-subtle))", color: "hsl(var(--sq-muted))" }}>
                    First-time buyers
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "hsl(var(--sq-subtle))", color: "hsl(var(--sq-muted))" }}>
                    Urban, 22-28
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "hsl(var(--sq-subtle))", color: "hsl(var(--sq-muted))" }}>
                    74% of respondents
                  </span>
                </div>
              </div>

              {/* Evidence Trail */}
              <div className={`rounded-xl ${isPresenter ? "px-4 py-3" : "px-5 py-3"}`}
                style={{ background: "hsl(var(--sq-orange) / 0.04)", border: "1px solid hsl(var(--sq-orange) / 0.12)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(var(--sq-orange))" }}>Evidence Trail</p>
                <p className="text-xs font-medium" style={{ color: "hsl(var(--sq-muted))" }}>
                  47 conversations · 35 surfaced unprompted · 12 contradictions flagged
                </p>
              </div>
            </div>

            {/* Right — Action */}
            <div className="space-y-5">
              {/* Recommendation */}
              <div className={`rounded-2xl ${isPresenter ? "p-4" : "p-5"}`}
                style={{ background: "hsl(var(--sq-orange) / 0.06)", border: "1px solid hsl(var(--sq-orange) / 0.2)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(var(--sq-orange))" }}>Recommendation</p>
                <p className={`font-black ${isPresenter ? "text-sm" : "text-base"} leading-snug`} style={{ color: "hsl(var(--sq-text))" }}>
                  Launch ₹399 / 50ml entry SKU before full launch
                </p>
              </div>

              {/* Route To */}
              <div className={`rounded-2xl ${isPresenter ? "p-4" : "p-5"}`}
                style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(var(--sq-muted))" }}>Route To</p>
                <div className="space-y-2">
                  {[
                    { team: "Product", action: "Pack architecture decision" },
                    { team: "Growth", action: "Entry price positioning" },
                    { team: "Leadership", action: "Launch risk flag" },
                  ].map((r) => (
                    <div key={r.team} className="flex items-center gap-2">
                      <span className="font-bold text-xs flex-shrink-0" style={{ color: "hsl(var(--sq-orange))" }}>→</span>
                      <span className="font-black text-xs" style={{ color: "hsl(var(--sq-text))" }}>{r.team}:</span>
                      <span className="text-xs" style={{ color: "hsl(var(--sq-muted))" }}>{r.action}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Owner */}
              <div className={`rounded-xl ${isPresenter ? "px-4 py-3" : "px-5 py-3"}`}
                style={{ background: "hsl(var(--sq-subtle))" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(var(--sq-muted))" }}>Decision Owner</p>
                <p className="font-black text-sm" style={{ color: "hsl(var(--sq-text))" }}>Product Lead</p>
              </div>
            </div>
          </div>

          {/* Footer — auditability */}
          <div className={`${isPresenter ? "px-6 py-3" : "px-8 py-4"}`}
            style={{ borderTop: "1px solid hsl(var(--sq-subtle))", background: "hsl(var(--sq-card))" }}>
            <p className="text-[10px] font-medium text-center" style={{ color: "hsl(var(--sq-muted) / 0.6)" }}>
              Every recommendation is traceable back to raw customer evidence.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
