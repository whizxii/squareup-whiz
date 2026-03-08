import type { SlideMode } from "@/lib/slides";
import iconSvg from "@/assets/icon.svg";
import avatarHero from "@/assets/avatar-hero-strategist.png";

export default function CTASection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";

  return (
    <section
      id="cta"
      className={`relative overflow-hidden ${isPresenter ? "h-full flex items-center justify-center" : "py-32 px-6"}`}
      style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a12 100%)" }}
    >
      {/* Ambient orbs */}
      <div className="sq-orb absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--sq-orange) / 0.05) 0%, transparent 70%)" }} />
      <div className="sq-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--sq-amber) / 0.04) 0%, transparent 70%)", animationDelay: "5s" }} />

      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <div className={`grid ${isPresenter ? "" : "lg:grid-cols-[1fr_auto]"} gap-12 items-center`}>

          {/* Left — CTA content */}
          <div className={`${isPresenter ? "text-center" : ""}`}>
            {/* Logo mark */}
            <div className={`mb-10 flex items-center gap-2 ${isPresenter ? "justify-center" : ""}`}>
              <img src={iconSvg} alt="SquareUp" className="h-7 w-auto" />
              <span className="font-black text-xl tracking-tight text-white">
                Square<span style={{ color: "hsl(var(--sq-orange))" }}>Up</span>
              </span>
            </div>

            <h2
              className={`font-black tracking-tight leading-tight mb-5 ${isPresenter ? "text-6xl" : "text-4xl sm:text-5xl"}`}
              style={{ color: "white" }}
            >
              See how one conversation<br />
              <span className="sq-gradient-text">can change a million-rupee decision.</span>
            </h2>

            <p className={`mb-10 font-medium ${isPresenter ? "text-xl" : "text-base sm:text-lg"} text-white/50`}>
              Customer truth infrastructure — live, with real data from our design partner sessions.
            </p>

            <div className={`flex flex-col sm:flex-row gap-3 mb-14 ${isPresenter ? "justify-center" : ""}`}>
              <a
                href="mailto:hello@joinsquareup.com"
                className="sq-glow-pulse font-bold px-10 py-4 rounded-full text-white transition-all hover:opacity-90"
                style={{
                  background: "hsl(var(--sq-orange))",
                  boxShadow: "0 12px 36px hsl(var(--sq-orange) / 0.28)"
                }}
              >
                Book 20 Minutes →
              </a>
              <a
                href="https://almost.joinsquareup.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold px-10 py-4 rounded-full transition-all hover:opacity-70 text-white"
                style={{ border: "1.5px solid rgba(255,255,255,0.12)" }}
              >
                See Live Demo
              </a>
            </div>

            {/* Stats recap */}
            <div className={`flex items-center gap-10 flex-wrap mb-10 ${isPresenter ? "justify-center" : ""}`}>
              {[
                { val: "3", label: "LOIs signed" },
                { val: "50+", label: "leaders interviewed" },
                { val: "<90 days", label: "idea to here" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="font-black text-2xl sq-glow-text" style={{ color: "hsl(var(--sq-orange))" }}>{s.val}</div>
                  <div className="text-xs font-semibold mt-0.5 text-white/30">{s.label}</div>
                </div>
              ))}
            </div>

            <p className="text-xs font-medium text-white/20">
              joinsquareup.com · hello@joinsquareup.com · © 2026 SquareUp
            </p>
          </div>

          {/* Right — Hero avatar (hidden on presenter + mobile) */}
          {!isPresenter && (
            <div className="hidden lg:block relative" style={{ width: 320, height: 480 }}>
              <div className="absolute bottom-0 right-0 animate-avatar-float">
                <img
                  src={avatarHero}
                  alt="SquareUp"
                  className="select-none"
                  loading="lazy"
                  style={{
                    width: 220,
                    height: "auto",
                    objectFit: "contain",
                    maskImage: "linear-gradient(to top, transparent 0%, white 10%)",
                    WebkitMaskImage: "linear-gradient(to top, transparent 0%, white 10%)",
                  }}
                />
              </div>
              {/* Glow behind avatar */}
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: "radial-gradient(ellipse 70% 60% at 50% 80%, hsl(var(--sq-orange) / 0.1) 0%, transparent 70%)",
              }} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
