import avatarProblem from "@/assets/avatar-problem-white.png";
import type { SlideMode } from "@/lib/slides";

const frictions = [
  { icon: "📅", label: "Scheduling calls is slow." },
  { icon: "🎙️", label: "Analyzing audio is manual." },
  { icon: "💬", label: "Data trapped in slack channels, email threads or in memory." },
];

export default function ProblemSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";

  return (
    <section
      id="problem"
      className="relative overflow-hidden"
      style={{
        background: "hsl(var(--sq-card))",
        paddingTop: isPresenter ? "32px" : "clamp(32px, 4vw, 56px)",
        paddingBottom: isPresenter ? "0px" : "clamp(24px, 3vw, 40px)",
      }}
    >
      {/* Subtle warm glow */}
      <div
        className="absolute bottom-0 right-0 w-[480px] h-[480px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at bottom right, hsl(var(--sq-orange) / 0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full mx-auto px-6 sm:px-10 lg:px-12" style={{ maxWidth: 1200 }}>

        {/* EYEBROW */}
        <p
          className="animate-fade-up mb-2"
          style={{
            color: "hsl(var(--sq-orange))",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            animationDelay: "0ms",
          }}
        >
          The Problem
        </p>

        {/* HEADLINE */}
        <h2
          className="animate-fade-up"
          style={{
            color: "hsl(var(--sq-text))",
            fontSize: isPresenter ? "3rem" : "clamp(2rem, 3.6vw, 3.8rem)",
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            animationDelay: "50ms",
            marginBottom: "clamp(16px, 2vw, 24px)",
          }}
        >
          Every brand says they talk to customers.{" "}
          <span
            style={{
              color: "hsl(var(--sq-orange))",
              textDecoration: "underline",
              textDecorationStyle: "wavy",
              textDecorationColor: "hsl(var(--sq-orange) / 0.35)",
              textUnderlineOffset: "5px",
              textDecorationThickness: "2px",
            }}
          >
            Almost none do it enough to matter.
          </span>
        </h2>

        {/* Divider */}
        <div
          className="animate-fade-up mb-5"
          style={{ height: 1, background: "hsl(var(--sq-subtle))", animationDelay: "90ms" }}
        />

        {/* MAIN GRID */}
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 lg:gap-0">

          {/* LEFT COLUMN (7/12) */}
          <div className="w-full lg:w-7/12 lg:pr-14 flex flex-col gap-4">

            <p
              className="animate-fade-up"
              style={{
                color: "hsl(var(--sq-muted))",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                animationDelay: "120ms",
              }}
            >
              The Friction
            </p>

            {/* Friction rows */}
            <div
              className="animate-fade-up rounded-2xl overflow-hidden"
              style={{ border: "1px solid hsl(var(--sq-subtle))", animationDelay: "150ms" }}
            >
              {frictions.map((item, i) => (
                <div key={i}>
                  <div className="flex items-center gap-4 px-5 py-4">
                    <span
                      className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-[16px]"
                      style={{
                        background: "hsl(var(--sq-orange) / 0.07)",
                        border: "1px solid hsl(var(--sq-orange) / 0.14)",
                      }}
                    >
                      {item.icon}
                    </span>
                    <p style={{ color: "hsl(var(--sq-text))", fontSize: "clamp(0.88rem, 1vw, 1rem)", fontWeight: 700, lineHeight: 1.35 }}>
                      {item.label}
                    </p>
                  </div>
                  {i < frictions.length - 1 && (
                    <div style={{ height: 1, background: "hsl(var(--sq-subtle))", marginLeft: 64 }} />
                  )}
                </div>
              ))}
            </div>

            {/* Quote card */}
            <div
              className="animate-fade-up rounded-2xl px-5 py-4"
              style={{
                background: "hsl(var(--sq-orange) / 0.04)",
                border: "1px solid hsl(var(--sq-orange) / 0.14)",
                animationDelay: "300ms",
              }}
            >
              <p style={{ color: "hsl(var(--sq-text))", fontSize: "clamp(0.88rem, 1vw, 1rem)", fontWeight: 800, lineHeight: 1.45 }}>
                "Decisions default to intuition.{" "}
                <span style={{ color: "hsl(var(--sq-orange))" }}>Intuition doesn't scale."</span>
              </p>
              <p className="mt-1.5" style={{ color: "hsl(var(--sq-muted))", fontSize: "10px", fontWeight: 600 }}>
                — 50 leaders at Zepto, Swiggy, Meesho, Titan, Comet, Minimalist, Mosaic Wellness
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN (5/12) */}
          <div className="w-full lg:w-5/12 flex flex-col items-end justify-between">

            {/* Stat card — top-right */}
            <div className="animate-fade-up self-end" style={{ animationDelay: "180ms" }}>
              <div
                className="rounded-2xl px-5 py-3"
                style={{
                  background: "hsl(var(--sq-card))",
                  border: "1px solid hsl(var(--sq-subtle))",
                  boxShadow: "0 4px 24px hsl(0 0% 0% / 0.06)",
                }}
              >
                <p style={{ color: "hsl(var(--sq-muted))", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 3 }}>
                  Avg. research cycle
                </p>
                <p style={{ color: "hsl(var(--sq-orange))", fontSize: "1.75rem", fontWeight: 900, lineHeight: 1 }}>
                  6–8 weeks
                </p>
                <p style={{ color: "hsl(var(--sq-muted))", fontSize: "11px", fontWeight: 600, marginTop: 3 }}>
                  & ₹30–50L per agency
                </p>
              </div>
            </div>

            {/* Avatar + chip — avatar stands on the chip */}
            <div className="animate-fade-up flex flex-col items-center w-full" style={{ animationDelay: "120ms" }}>
              {/* Avatar with transparent fade at bottom */}
              <div className="animate-avatar-float" style={{ marginBottom: -48 }}>
                <img
                  src={avatarProblem}
                  alt="Overwhelmed brand manager"
                  className="select-none"
                  style={{
                    width: "auto",
                    height: isPresenter ? 300 : 340,
                    objectFit: "contain",
                    objectPosition: "bottom",
                    display: "block",
                    maskImage: "linear-gradient(to top, transparent 0%, black 14%)",
                    WebkitMaskImage: "linear-gradient(to top, transparent 0%, black 14%)",
                    filter: "drop-shadow(0 16px 32px hsl(0 0% 0% / 0.08))",
                  }}
                />
              </div>
              {/* Chip pedestal */}
              <div className="animate-fade-up" style={{ animationDelay: "400ms", position: "relative", zIndex: 10 }}>
                <div
                  className="rounded-full px-5 py-2"
                  style={{
                    background: "hsl(var(--sq-orange) / 0.09)",
                    border: "1px solid hsl(var(--sq-orange) / 0.22)",
                  }}
                >
                  <p style={{ color: "hsl(var(--sq-orange))", fontSize: "13px", fontWeight: 900, whiteSpace: "nowrap" }}>
                    10× slower than it should be
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
