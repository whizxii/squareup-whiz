import { ChevronDown } from "lucide-react";
import avatarAnalyst from "@/assets/avatar-hero-analyst-white.png";
import type { SlideMode } from "@/lib/slides";

interface HeroSectionProps { mode?: SlideMode; }

function ProofCard({ stat, label, delay = 0 }: { stat: string; label: string; delay?: number }) {
  return (
    <div
      className="rounded-2xl px-4 py-3 flex flex-col gap-0.5 animate-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        background: "hsl(var(--sq-card))",
        border: "1px solid hsl(var(--sq-subtle))",
        boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
      }}
    >
      <span className="font-black text-xl leading-none" style={{ color: "hsl(var(--sq-orange))" }}>{stat}</span>
      <span className="text-xs font-medium" style={{ color: "hsl(var(--sq-muted))" }}>{label}</span>
    </div>
  );
}

function FloatingInsightCard({ icon, title, sub, delay = 0 }: { icon: string; title: string; sub: string; delay?: number }) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3 animate-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        background: "hsl(var(--sq-card))",
        border: "1px solid hsl(var(--sq-subtle))",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      <span className="text-xl">{icon}</span>
      <div>
        <p className="font-black text-xs leading-tight" style={{ color: "hsl(var(--sq-text))" }}>{title}</p>
        <p className="text-[10px] mt-0.5 font-medium" style={{ color: "hsl(var(--sq-muted))" }}>{sub}</p>
      </div>
    </div>
  );
}

export default function HeroSection({ mode = "detailed" }: HeroSectionProps) {
  const isPresenter = mode === "presenter";

  return (
    <section
      id="hero"
      className={`relative overflow-hidden flex flex-col justify-center ${
        isPresenter ? "h-full px-20 items-center" : "px-6 sm:px-12"
      }`}
      style={{ background: "hsl(var(--sq-card))", minHeight: "100vh" }}
    >
      {/* Warm ambient glow blobs */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          radial-gradient(ellipse 60% 50% at 80% 50%, hsl(var(--sq-orange) / 0.06) 0%, transparent 70%),
          radial-gradient(ellipse 40% 40% at 15% 60%, hsl(var(--sq-amber) / 0.05) 0%, transparent 60%),
          radial-gradient(ellipse 30% 30% at 50% 10%, hsl(var(--sq-orange) / 0.03) 0%, transparent 50%)
        `,
      }} />

      {/* Very faint dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.018]" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--sq-text)) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      <div className={`relative z-10 w-full max-w-7xl mx-auto ${isPresenter ? "" : "pt-20 pb-0"}`}>
        <div className={`grid gap-0 items-center ${isPresenter ? "grid-cols-2" : "grid-cols-[1fr_1fr]"}`}>

          {/* LEFT — copy */}
          <div className="flex flex-col justify-center gap-7 pr-0 lg:pr-12 py-8">

            {/* Status pill */}
            <div className="flex items-center gap-2.5 animate-fade-up" style={{ animationDelay: "0ms" }}>
              <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5"
                style={{
                  background: "hsl(var(--sq-orange) / 0.08)",
                  border: "1px solid hsl(var(--sq-orange) / 0.22)"
                }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--sq-orange))" }} />
                <span className="font-bold text-[11px] tracking-[0.18em] uppercase" style={{ color: "hsl(var(--sq-orange))" }}>
                  Seed Round · 2026
                </span>
              </div>
              <span className="text-[11px] font-semibold tracking-wide" style={{ color: "hsl(var(--sq-muted))" }}>
                India-first · Built for the world
              </span>
            </div>

            {/* Headline */}
            <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
              <h1
                className={`font-black tracking-tight leading-[0.95] ${
                  isPresenter ? "text-6xl" : "text-[2.8rem] sm:text-[3.8rem] lg:text-[4.8rem]"
                }`}
                style={{ color: "hsl(var(--sq-text))" }}
              >
                Consumer brands<br />
                bet crores on<br />
                <span style={{
                  color: "hsl(var(--sq-orange))",
                  textDecoration: "underline",
                  textDecorationStyle: "wavy",
                  textDecorationColor: "hsl(var(--sq-orange) / 0.35)",
                  textUnderlineOffset: "6px"
                }}>gut feel.</span>
              </h1>
            </div>

            {/* Sub */}
            <p
              className={`font-medium leading-relaxed max-w-md animate-fade-up ${isPresenter ? "text-lg" : "text-base sm:text-lg"}`}
              style={{ color: "hsl(var(--sq-muted))", animationDelay: "160ms" }}
            >
              SquareUp runs AI-led customer interviews and turns them into a{" "}
              <span className="font-bold" style={{ color: "hsl(var(--sq-text))" }}>
                decision-ready brief in 7 days.
              </span>
            </p>

            {/* Proof cards */}
            {!isPresenter && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-md sm:max-w-none">
                <ProofCard stat="3" label="LOIs signed" delay={200} />
                <ProofCard stat="50" label="leaders interviewed" delay={280} />
                <ProofCard stat="<45d" label="idea to LOI" delay={360} />
                <ProofCard stat="MVP" label="live now" delay={440} />
              </div>
            )}

            {/* CTAs */}
            {!isPresenter && (
              <div className="flex flex-wrap gap-3 items-center animate-fade-up" style={{ animationDelay: "500ms" }}>
                <a
                  href="mailto:hello@joinsquareup.com"
                  className="font-bold px-7 py-3 rounded-full text-sm text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                  style={{
                    background: "hsl(var(--sq-orange))",
                    boxShadow: "0 4px 24px hsl(var(--sq-orange) / 0.35)"
                  }}
                >
                  Get in touch
                </a>
                <a
                  href="https://almost.joinsquareup.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sm transition-all hover:opacity-60"
                  style={{ color: "hsl(var(--sq-muted))" }}
                >
                  See live demo →
                </a>
              </div>
            )}
          </div>

          {/* RIGHT — Avatar stage */}
          <div
            className={`relative ${isPresenter ? "" : "block"}`}
            style={{ minHeight: 640 }}
          >
            {/* Warm glow behind avatar */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: "radial-gradient(ellipse 70% 60% at 55% 90%, hsl(var(--sq-orange) / 0.08) 0%, transparent 70%)",
            }} />

            {/* Single primary avatar — female analyst, floating */}
            <div
              className="absolute bottom-0 right-4 animate-fade-up z-20"
              style={{ animationDelay: "160ms" }}
            >
              <div className="animate-avatar-float">
                <img
                  src={avatarAnalyst}
                  alt="Consumer insights analyst"
                  className="select-none"
                  style={{
                    width: 360,
                    height: "auto",
                    objectFit: "contain",
                    maskImage: "linear-gradient(to top, transparent 0%, white 10%)",
                    WebkitMaskImage: "linear-gradient(to top, transparent 0%, white 10%)",
                  }}
                />
              </div>
            </div>
          

            {/* Floating insight cards */}
            <div className="absolute top-10 right-2 z-30">
              <FloatingInsightCard
                icon="🇮🇳"
                title="India — Proving Now"
                sub="3 LOIs · ₹ market live"
                delay={400}
              />
            </div>

            <div className="absolute top-32 right-2 z-30">
              <FloatingInsightCard
                icon="🌏"
                title="SEA · MENA · EU"
                sub="Expansion from Year 2"
                delay={520}
              />
            </div>

            <div className="absolute bottom-16 right-0 z-30">
              <div
                className="flex items-center gap-2.5 rounded-2xl px-4 py-3 animate-fade-up"
                style={{
                  animationDelay: "640ms",
                  background: "hsl(var(--sq-card))",
                  border: "1px solid hsl(var(--sq-subtle))",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                }}
              >
                <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: "hsl(var(--sq-orange))" }} />
                <div>
                  <p className="font-black text-xs" style={{ color: "hsl(var(--sq-text))" }}>Brief ready in 7 days</p>
                  <p className="text-[10px] font-medium" style={{ color: "hsl(var(--sq-muted))" }}>3 risk flags · 12 insights</p>
                </div>
              </div>
            </div>

            {/* Validated-with card — top left of avatar area */}
            <div className="absolute top-14 left-0 z-30">
              <div
                className="rounded-2xl px-4 py-3 animate-fade-up"
                style={{
                  animationDelay: "700ms",
                  background: "hsl(var(--sq-card))",
                  border: "1px solid hsl(var(--sq-subtle))",
                  boxShadow: "0 8px 28px rgba(0,0,0,0.07)",
                }}
              >
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "hsl(var(--sq-muted))" }}>
                  Validated with
                </p>
                <div className="flex gap-2.5">
                  {["Zepto", "Swiggy", "Meesho"].map((b) => (
                    <span key={b} className="font-black text-[10px]" style={{ color: "hsl(var(--sq-text) / 0.45)" }}>{b}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* $20B label */}
            <div className="absolute top-[52%] left-8 z-30">
              <div
                className="rounded-xl px-3 py-1.5 animate-fade-up"
                style={{
                  animationDelay: "780ms",
                  background: "hsl(var(--sq-orange) / 0.08)",
                  border: "1px solid hsl(var(--sq-orange) / 0.2)",
                }}
              >
                <p className="font-black text-xs" style={{ color: "hsl(var(--sq-orange))" }}>$20B+ opportunity</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isPresenter && (
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 animate-bounce-chevron">
          <ChevronDown size={18} style={{ color: "hsl(var(--sq-muted) / 0.3)" }} />
        </div>
      )}
    </section>
  );
}
