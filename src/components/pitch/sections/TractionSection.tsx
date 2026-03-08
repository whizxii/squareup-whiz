import { useScrollAnimation, useCountUp } from "@/lib/useScrollAnimation";
import mesaLogo from "@/assets/mesa-logo.png";
import type { SlideMode } from "@/lib/slides";

const LOGOS = ["Zepto", "Meesho", "Swiggy", "Titan", "Rebel Foods", "Swish"];

function Counter({ target, prefix = "", suffix = "", label, sublabel, mode }: {
  target: number; prefix?: string; suffix?: string; label: string; sublabel?: string; mode?: SlideMode;
}) {
  const { ref, display } = useCountUp(target, 1800, prefix, suffix, mode === "presenter");
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="text-center">
      <div className="sq-glow-text font-black leading-none tracking-tight mb-1"
        style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)", color: "hsl(var(--sq-orange))" }}>
        {display}
      </div>
      <div className="font-bold text-xs" style={{ color: "hsl(var(--sq-text))" }}>{label}</div>
      {sublabel && <div className="text-xs mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>{sublabel}</div>}
    </div>
  );
}

export default function TractionSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter");

  return (
    <section
      id="traction"
      className={`${isPresenter ? "min-h-screen flex items-center px-16" : "py-32 px-8 sm:px-16"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        {/* Header */}
        <div className={`${isPresenter ? "mb-6" : "mb-12"} text-center transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            The Velocity
          </p>
          <h2 className={`font-black tracking-tight leading-[1.05] ${isPresenter ? "text-5xl" : "text-4xl sm:text-[3rem]"}`}
            style={{ color: "hsl(var(--sq-text))" }}>
            Idea to LOI in under 90 days.<br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>In India.</span>
          </h2>
        </div>

        {/* 2-col: stats + LOI highlight */}
        <div className={`grid ${isPresenter ? "grid-cols-2" : "lg:grid-cols-2"} gap-6 ${isPresenter ? "mb-4" : "mb-8"}`}>

          {/* Counter grid */}
          <div className={`grid grid-cols-2 gap-4 transition-all duration-500 delay-150 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            {[
              { target: 90, prefix: "<", label: "days", sublabel: "idea → signed LOI" },
              { target: 50, suffix: "+", label: "leaders interviewed", sublabel: "Zepto, Swiggy, Meesho…" },
              { target: 15, label: "days to MVP", sublabel: "shipped v1" },
              { target: 1, label: "paid pilot started", sublabel: "design partners" },
            ].map((c, i) => (
              <div key={i} className={`rounded-2xl ${isPresenter ? "p-3" : "p-5"} flex flex-col items-center justify-center`}
                style={{ background: "hsl(var(--sq-off-white))", border: "1px solid hsl(var(--sq-subtle))" }}>
                <Counter {...c} mode={mode} />
              </div>
            ))}
          </div>

          {/* LOI banner */}
          <div className={`sq-glow-pulse rounded-3xl flex flex-col justify-center ${isPresenter ? "px-6 py-5" : "px-8 py-8"} transition-all duration-500 delay-300 ${revealed ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
            style={{ background: "hsl(var(--sq-orange))", boxShadow: "0 16px 48px hsl(var(--sq-orange) / 0.2)" }}>
            <div className="font-black text-white" style={{ fontSize: isPresenter ? "3rem" : "clamp(3rem, 8vw, 5rem)", lineHeight: 1 }}>3</div>
            <div className={`font-black text-white ${isPresenter ? "text-base" : "text-xl"} mt-1 mb-2`}>Letters of Intent. Signed.</div>
            <p className={`text-white/70 ${isPresenter ? "text-xs" : "text-sm"} font-medium`}>Design partners committed to paid pilots — not just interest, signed commitment.</p>
            <div className="mt-4 flex flex-col gap-1.5">
              {[
                "Dec '25 — Founded, began discovery",
                "Jan '26 — MVP shipped in 15 days",
                "Feb '26 — 3 LOIs signed, first pilot scoped",
              ].map((m) => (
                <span key={m} className="text-xs font-bold text-white/50 tracking-wide">{m}</span>
              ))}
            </div>
            {!isPresenter && (
              <div className="mt-4 pt-3 border-t border-white/15">
                <p className="text-xs font-bold text-white/60">Target: ₹2–5L per study · 3–4 studies/brand/quarter</p>
              </div>
            )}
          </div>
        </div>

        {/* Brand logos */}
        <div className={`transition-all duration-500 delay-400 ${revealed ? "opacity-100" : "opacity-0"}`}>
          {!isPresenter && (
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2.5 rounded-xl px-5 py-2.5"
                style={{ background: "hsl(var(--sq-off-white))", border: "1px solid hsl(var(--sq-subtle))" }}>
                <img src={mesaLogo} alt="Mesa" className="h-6 w-auto object-contain" />
                <span className="text-sm font-bold" style={{ color: "hsl(var(--sq-text))" }}>Mesa School of Business</span>
              </div>
            </div>
          )}
          <p className="text-center font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-muted))" }}>
            Discovery conversations with leaders at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {LOGOS.map((logo) => (
              <span key={logo} className="font-black text-sm tracking-tight"
                style={{ color: "hsl(var(--sq-text) / 0.4)" }}>
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
