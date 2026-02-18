import { useScrollAnimation, useCountUp } from "@/lib/useScrollAnimation";
import mesaLogo from "@/assets/mesa-logo.png";
import type { SlideMode } from "@/lib/slides";

const LOGOS = ["Zepto", "Meesho", "Swiggy", "Titan", "Rebel Foods", "Swish"];

function Counter({ target, prefix = "", suffix = "", label, sublabel }: {
  target: number; prefix?: string; suffix?: string; label: string; sublabel?: string;
}) {
  const { ref, display } = useCountUp(target, 1800, prefix, suffix);
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="text-center">
      <div className="font-black leading-none tracking-tight mb-1" style={{
        fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)",
        color: "hsl(var(--sq-orange))"
      }}>
        {display}
      </div>
      <div className="font-bold text-sm" style={{ color: "hsl(var(--sq-text))" }}>{label}</div>
      {sublabel && <div className="text-xs mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>{sublabel}</div>}
    </div>
  );
}

export default function TractionSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="traction"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        {/* Header */}
        <div className={`mb-16 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Traction
          </p>
          <h2 className={`font-black tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}>
            Validated in India.{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>Idea to LOI in under 90 days.</span>
          </h2>
          <p className="mt-3 text-sm" style={{ color: "hsl(var(--sq-muted))" }}>
            50+ leaders at India's fastest consumer brands. The problem is real, urgent, and everywhere.
          </p>
        </div>

        {/* Counters — 4-up bold grid */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10 p-8 rounded-3xl transition-all duration-500 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
          <Counter target={90} prefix="<" label="days" sublabel="idea to signed LOI" />
          <Counter target={50} suffix="+" label="leaders interviewed" sublabel="Zepto, Swiggy, Meesho..." />
          <Counter target={15} label="days to MVP" sublabel="shipped v1" />
          <Counter target={3} label="LOIs signed" sublabel="design partners" />
        </div>

        {/* LOI highlight banner */}
        <div className={`rounded-2xl px-8 py-7 mb-10 flex items-center gap-6 transition-all duration-500 delay-300 ${revealed ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
          style={{
            background: "hsl(var(--sq-orange))",
            boxShadow: "0 16px 48px hsl(var(--sq-orange) / 0.3)"
          }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.18)" }}>
            <span className="text-white font-black text-2xl">3</span>
          </div>
          <div>
            <p className="text-white font-black text-xl leading-tight">3 Letters of Intent. Signed.</p>
            <p className="text-white/70 text-sm font-medium mt-0.5">Design partners committed — not piloting, not interested.</p>
          </div>
          <div className="ml-auto hidden sm:flex gap-1 flex-col items-end">
            {["Dec '25 Founded", "Jan '26 MVP", "Feb '26 LOIs"].map((m) => (
              <span key={m} className="text-xs font-bold text-white/60 tracking-wide">{m}</span>
            ))}
          </div>
        </div>

        {/* Trust + logos */}
        <div className={`transition-all duration-500 delay-400 ${revealed ? "opacity-100" : "opacity-0"}`}>

          {/* Mesa badge */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3 rounded-2xl px-6 py-3" style={{
              background: "hsl(var(--sq-card))",
              border: "1px solid hsl(var(--sq-subtle))",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
            }}>
              <img src={mesaLogo} alt="Mesa School of Business" className="h-7 w-auto object-contain" />
              <span className="text-sm font-bold" style={{ color: "hsl(var(--sq-text))" }}>Mesa School of Business</span>
            </div>
          </div>

          {/* Brand logos */}
          <p className="text-center font-bold text-xs uppercase tracking-[0.2em] mb-5" style={{ color: "hsl(var(--sq-muted))" }}>
            Discovery conversations with leaders at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {LOGOS.map((logo) => (
              <span key={logo} className="font-black text-sm sm:text-base tracking-tight cursor-default transition-all"
                style={{ color: "hsl(var(--sq-text) / 0.25)" }}>
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
