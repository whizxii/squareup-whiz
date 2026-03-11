import { useScrollAnimation, useCountUp } from "@/lib/useScrollAnimation";
import mesaLogo from "@/assets/mesa-logo.png";
import type { SlideMode } from "@/lib/slides";

const BRAND_BADGES = [
  { name: "Skinn (Titan)", bg: "#1A1A2E", color: "#C8A96E" },
  { name: "Big Basket", bg: "#84C225", color: "#fff" },
  { name: "Bloc", bg: "#000", color: "#fff" },
  { name: "V BOG", bg: "#2D2D2D", color: "#E8C547" },
  { name: "MPC", bg: "#1B3A5C", color: "#fff" },
  { name: "Super Sheldon", bg: "#FF4444", color: "#fff" },
  { name: "Zepto", bg: "#6C2BD9", color: "#fff" },
  { name: "Meesho", bg: "#E91E63", color: "#fff" },
  { name: "Swiggy", bg: "#FC8019", color: "#fff" },
  { name: "Titan", bg: "#1A1A2E", color: "#C8A96E" },
  { name: "Rebel Foods", bg: "#E53935", color: "#fff" },
];

function Counter({ target, prefix = "", suffix = "", label, sublabel, mode }: {
  target: number; prefix?: string; suffix?: string; label: string; sublabel?: string; mode?: SlideMode;
}) {
  const { ref, display } = useCountUp(target, 1800, prefix, suffix, mode === "presenter" || mode === "download");
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
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter" || mode === "download");

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
            Founded 3 months ago.<br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>6 brands already engaged.</span>
          </h2>
        </div>

        {/* 2-col: stats + engagement highlight */}
        <div className={`grid ${isPresenter ? "grid-cols-2" : "lg:grid-cols-2"} gap-6 ${isPresenter ? "mb-4" : "mb-8"}`}>

          {/* Counter grid */}
          <div className={`grid grid-cols-2 gap-4 transition-all duration-500 delay-150 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            {[
              { target: 6, label: "brands engaged", sublabel: "pilots + active tests" },
              { target: 50, suffix: "+", label: "leaders interviewed", sublabel: "Zepto, Swiggy, Meesho…" },
              { target: 15, label: "days to MVP", sublabel: "shipped v1" },
              { target: 2, label: "pilots running", sublabel: "Skinn · Big Basket" },
            ].map((c, i) => (
              <div key={i} className={`rounded-2xl ${isPresenter ? "p-3" : "p-5"} flex flex-col items-center justify-center`}
                style={{ background: "hsl(var(--sq-off-white))", border: "1px solid hsl(var(--sq-subtle))" }}>
                <Counter {...c} mode={mode} />
              </div>
            ))}
          </div>

          {/* Engagement banner */}
          <div className={`sq-glow-pulse rounded-3xl flex flex-col justify-center ${isPresenter ? "px-6 py-5" : "px-8 py-8"} transition-all duration-500 delay-300 ${revealed ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
            style={{ background: "hsl(var(--sq-orange))", boxShadow: "0 16px 48px hsl(var(--sq-orange) / 0.2)" }}>
            <div className="font-black text-white" style={{ fontSize: isPresenter ? "3rem" : "clamp(3rem, 8vw, 5rem)", lineHeight: 1 }}>6</div>
            <div className={`font-black text-white ${isPresenter ? "text-base" : "text-xl"} mt-1 mb-3`}>Brands Engaged</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white/90 bg-white/20 px-2.5 py-1 rounded-full">2 Pilots</span>
                <span className="text-xs font-bold text-white/60">Skinn (Titan) · Big Basket</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white/90 bg-white/20 px-2.5 py-1 rounded-full">4 Testing</span>
                <span className="text-xs font-bold text-white/60">Bloc · V BOG · MPC · Super Sheldon</span>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              {[
                "Dec '25 — Founded, began discovery",
                "Jan '26 — MVP shipped in 15 days",
                "Feb '26 — 3 LOIs signed",
                "Mar '26 — 2 pilots running, 4 more testing",
              ].map((m) => (
                <span key={m} className="text-xs font-bold text-white/50 tracking-wide">{m}</span>
              ))}
            </div>
            {!isPresenter && (
              <div className="mt-4 pt-3 border-t border-white/15">
                <p className="text-xs font-bold text-white/60">Target: ₹1–3L per study · 3–4 studies/brand/quarter</p>
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
            Engaged brands & discovery conversations
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {BRAND_BADGES.map((brand) => (
              <span key={brand.name} className="font-black text-[11px] tracking-tight px-3 py-1.5 rounded-lg"
                style={{ background: brand.bg, color: brand.color }}>
                {brand.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
