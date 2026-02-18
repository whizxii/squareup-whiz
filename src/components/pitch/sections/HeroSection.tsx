import { ChevronDown } from "lucide-react";
import iconSvg from "@/assets/icon.svg";
import type { SlideMode } from "@/lib/slides";

interface HeroSectionProps { mode?: SlideMode; }

// Animated floating proof card
function ProofCard({ stat, label, delay = 0 }: { stat: string; label: string; delay?: number }) {
  return (
    <div
      className="rounded-2xl px-4 py-3 flex flex-col gap-0.5 animate-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        background: "hsl(var(--sq-card))",
        border: "1px solid hsl(var(--sq-subtle))",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
      }}
    >
      <span className="font-black text-xl leading-none" style={{ color: "hsl(var(--sq-orange))" }}>{stat}</span>
      <span className="text-xs font-medium" style={{ color: "hsl(var(--sq-muted))" }}>{label}</span>
    </div>
  );
}

// Subtle world dot-grid SVG — India glowing
function WorldDotGrid() {
  // Approximate city dot positions on a 400×220 viewBox
  const dots = [
    // India cluster (highlighted)
    { x: 262, y: 108, r: 4.5, india: true  },
    { x: 255, y: 118, r: 3,   india: true  },
    { x: 270, y: 120, r: 3,   india: true  },
    { x: 260, y: 128, r: 2.5, india: true  },
    { x: 265, y: 102, r: 2.5, india: true  },
    // SEA
    { x: 305, y: 118, r: 2.5, india: false },
    { x: 312, y: 128, r: 2,   india: false },
    { x: 318, y: 115, r: 2,   india: false },
    // MENA
    { x: 220, y: 90,  r: 2.5, india: false },
    { x: 230, y: 82,  r: 2,   india: false },
    { x: 215, y: 98,  r: 2,   india: false },
    // Europe
    { x: 178, y: 55,  r: 2,   india: false },
    { x: 188, y: 50,  r: 2,   india: false },
    { x: 168, y: 58,  r: 1.5, india: false },
    { x: 195, y: 60,  r: 1.5, india: false },
    // Americas
    { x: 78,  y: 68,  r: 2.5, india: false },
    { x: 65,  y: 75,  r: 2,   india: false },
    { x: 88,  y: 80,  r: 2,   india: false },
    { x: 72,  y: 88,  r: 1.5, india: false },
    { x: 92,  y: 62,  r: 1.5, india: false },
    // Africa
    { x: 185, y: 115, r: 2,   india: false },
    { x: 195, y: 125, r: 1.5, india: false },
    // East Asia
    { x: 330, y: 72,  r: 2.5, india: false },
    { x: 340, y: 65,  r: 2,   india: false },
    { x: 325, y: 62,  r: 1.5, india: false },
    // Australia
    { x: 330, y: 155, r: 2,   india: false },
    { x: 340, y: 162, r: 1.5, india: false },
  ];

  // Arc paths from India to other markets
  const arcs = [
    { d: "M262,108 Q285,60 305,118",  label: "SEA",  labelX: 296, labelY: 55 },
    { d: "M262,108 Q245,70 220,90",   label: "MENA", labelX: 220, labelY: 65 },
    { d: "M262,108 Q210,30 178,55",   label: "EU",   labelX: 188, labelY: 28 },
    { d: "M262,108 Q170,50 78,68",    label: "US",   labelX: 128, labelY: 35 },
  ];

  return (
    <svg viewBox="0 0 400 210" className="w-full h-full" style={{ overflow: "visible" }}>
      {/* Background continents — very subtle */}
      <ellipse cx="100" cy="100" rx="55" ry="65" fill="hsl(var(--sq-subtle))" opacity="0.35" />
      <ellipse cx="80" cy="72" rx="30" ry="20" fill="hsl(var(--sq-subtle))" opacity="0.25" />
      <ellipse cx="182" cy="90" rx="48" ry="55" fill="hsl(var(--sq-subtle))" opacity="0.35" />
      <ellipse cx="262" cy="112" rx="30" ry="40" fill="hsl(var(--sq-subtle))" opacity="0.4" />
      <ellipse cx="315" cy="118" rx="22" ry="28" fill="hsl(var(--sq-subtle))" opacity="0.3" />
      <ellipse cx="335" cy="70" rx="32" ry="25" fill="hsl(var(--sq-subtle))" opacity="0.3" />
      <ellipse cx="335" cy="158" rx="20" ry="16" fill="hsl(var(--sq-subtle))" opacity="0.3" />

      {/* Arc routes from India */}
      {arcs.map((arc) => (
        <g key={arc.label}>
          <path d={arc.d} fill="none" stroke="hsl(var(--sq-orange))" strokeWidth="0.8"
            strokeDasharray="3 4" opacity="0.35" />
          <text x={arc.labelX} y={arc.labelY} fontSize="7" fill="hsl(var(--sq-orange))"
            fontWeight="700" fontFamily="sans-serif" opacity="0.5" textAnchor="middle">
            {arc.label}
          </text>
        </g>
      ))}

      {/* City dots */}
      {dots.map((d, i) => (
        <g key={i}>
          {d.india && (
            <>
              <circle cx={d.x} cy={d.y} r={d.r * 3.5} fill="hsl(var(--sq-orange))" opacity="0.07" />
              <circle cx={d.x} cy={d.y} r={d.r * 2} fill="hsl(var(--sq-orange))" opacity="0.15" />
            </>
          )}
          <circle
            cx={d.x} cy={d.y} r={d.r}
            fill={d.india ? "hsl(var(--sq-orange))" : "hsl(var(--sq-text))"}
            opacity={d.india ? 0.9 : 0.18}
          />
        </g>
      ))}

      {/* India label */}
      <text x="262" y="148" textAnchor="middle" fontSize="8" fill="hsl(var(--sq-orange))"
        fontWeight="900" fontFamily="sans-serif">
        🇮🇳 INDIA — NOW
      </text>

      {/* "World" label */}
      <text x="200" y="196" textAnchor="middle" fontSize="7" fill="hsl(var(--sq-muted))"
        fontWeight="600" fontFamily="sans-serif" opacity="0.5">
        Built for the world's consumer brands
      </text>
    </svg>
  );
}

export default function HeroSection({ mode = "detailed" }: HeroSectionProps) {
  const isPresenter = mode === "presenter";

  return (
    <section
      id="hero"
      className={`relative overflow-hidden flex flex-col justify-center ${
        isPresenter ? "h-full px-20 items-center" : "min-h-screen px-6 sm:px-12"
      }`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      {/* Background texture — ultra-subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 70% 40%, hsl(var(--sq-orange) / 0.05) 0%, transparent 55%),
            radial-gradient(circle at 20% 70%, hsl(var(--sq-amber) / 0.04) 0%, transparent 45%)
          `,
        }}
      />

      {/* Dot pattern overlay — very faint */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--sq-text)) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className={`relative z-10 w-full max-w-6xl mx-auto ${isPresenter ? "" : "pt-28 pb-16"}`}>
        <div className={`grid gap-12 items-center ${isPresenter ? "grid-cols-2" : "grid-cols-1 lg:grid-cols-2"}`}>

          {/* LEFT — copy */}
          <div className="flex flex-col gap-7">

            {/* Status pill */}
            <div className="flex items-center gap-2.5">
              <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5"
                style={{
                  background: "hsl(var(--sq-orange) / 0.08)",
                  border: "1px solid hsl(var(--sq-orange) / 0.2)"
                }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--sq-orange))" }} />
                <span className="font-bold text-[11px] tracking-[0.18em] uppercase" style={{ color: "hsl(var(--sq-orange))" }}>
                  Seed 2026
                </span>
              </div>
              <span className="text-[11px] font-semibold tracking-wide" style={{ color: "hsl(var(--sq-muted))" }}>
                India-first · Built for the world
              </span>
            </div>

            {/* Headline */}
            <div>
              <h1
                className={`font-black tracking-tight leading-[0.95] ${
                  isPresenter
                    ? "text-6xl"
                    : "text-[2.8rem] sm:text-[3.8rem] lg:text-[4.5rem]"
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
            <p className={`font-medium leading-relaxed max-w-md ${isPresenter ? "text-lg" : "text-base sm:text-lg"}`}
              style={{ color: "hsl(var(--sq-muted))" }}>
              SquareUp runs AI-led customer interviews and turns them into a{" "}
              <span className="font-bold" style={{ color: "hsl(var(--sq-text))" }}>
                decision-ready brief in 7 days.
              </span>
            </p>

            {/* Proof cards — 2×2 grid */}
            {!isPresenter && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-md sm:max-w-none">
                <ProofCard stat="3" label="LOIs signed" delay={100} />
                <ProofCard stat="50+" label="leaders interviewed" delay={200} />
                <ProofCard stat="< 90d" label="idea to LOI" delay={300} />
                <ProofCard stat="MVP" label="live now" delay={400} />
              </div>
            )}

            {/* CTAs */}
            {!isPresenter && (
              <div className="flex flex-wrap gap-3 items-center">
                <a
                  href="mailto:hello@joinsquareup.com"
                  className="font-bold px-7 py-3 rounded-full text-sm text-white transition-all hover:opacity-90"
                  style={{
                    background: "hsl(var(--sq-orange))",
                    boxShadow: "0 4px 20px hsl(var(--sq-orange) / 0.32)"
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

          {/* RIGHT — world map visual */}
          <div className={`relative flex flex-col mt-4 lg:mt-0 ${isPresenter ? "" : "hidden lg:flex"}`}>

            {/* Map container */}
            <div
              className="relative rounded-3xl overflow-hidden p-6"
              style={{
                background: "hsl(var(--sq-off-white))",
                border: "1px solid hsl(var(--sq-subtle))",
                boxShadow: "0 8px 40px rgba(0,0,0,0.06)"
              }}
            >
              {/* Label inside card */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-black text-xs uppercase tracking-[0.15em]" style={{ color: "hsl(var(--sq-orange))" }}>
                  Market Map
                </span>
                <span className="text-xs font-medium" style={{ color: "hsl(var(--sq-muted))" }}>
                  $20B+ global opportunity
                </span>
              </div>

              <WorldDotGrid />

              {/* Market callouts */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { market: "🇮🇳 India", status: "Proving now", active: true },
                  { market: "🌏 SEA",    status: "Year 2–3",    active: false },
                  { market: "🌍 MENA",   status: "Year 3–4",    active: false },
                ].map((m) => (
                  <div key={m.market} className="rounded-xl px-3 py-2 text-center"
                    style={{
                      background: m.active ? "hsl(var(--sq-orange) / 0.08)" : "hsl(var(--sq-card))",
                      border: `1px solid ${m.active ? "hsl(var(--sq-orange) / 0.25)" : "hsl(var(--sq-subtle))"}`,
                    }}>
                    <p className="font-bold text-xs" style={{ color: m.active ? "hsl(var(--sq-orange))" : "hsl(var(--sq-text))" }}>
                      {m.market}
                    </p>
                    <p className="text-[10px] mt-0.5 font-medium" style={{ color: "hsl(var(--sq-muted))" }}>
                      {m.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating insight card */}
            <div
              className="absolute -bottom-5 -left-6 rounded-2xl px-4 py-3 animate-fade-up"
              style={{
                animationDelay: "600ms",
                background: "hsl(var(--sq-card))",
                border: "1px solid hsl(var(--sq-subtle))",
                boxShadow: "0 8px 28px rgba(0,0,0,0.10)"
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(var(--sq-orange))" }} />
                <div>
                  <p className="font-black text-xs" style={{ color: "hsl(var(--sq-text))" }}>Brief ready</p>
                  <p className="text-[10px]" style={{ color: "hsl(var(--sq-muted))" }}>7 days · 3 risk flags</p>
                </div>
              </div>
            </div>

            {/* Floating brand logos card */}
            <div
              className="absolute -top-4 -right-4 rounded-2xl px-4 py-3 animate-fade-up"
              style={{
                animationDelay: "800ms",
                background: "hsl(var(--sq-card))",
                border: "1px solid hsl(var(--sq-subtle))",
                boxShadow: "0 8px 28px rgba(0,0,0,0.08)"
              }}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "hsl(var(--sq-muted))" }}>
                Validated with
              </p>
              <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                {["Zepto", "Swiggy", "Meesho"].map((b) => (
                  <span key={b} className="font-black text-[10px]" style={{ color: "hsl(var(--sq-text) / 0.3)" }}>{b}</span>
                ))}
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
