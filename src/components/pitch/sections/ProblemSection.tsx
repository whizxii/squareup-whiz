import avatarProblem from "@/assets/avatar-problem-white.png";
import type { SlideMode } from "@/lib/slides";

const frictions = [
  { icon: "📅", label: "Scheduling calls is slow." },
  { icon: "🎙️", label: "Analyzing audio is manual." },
  { icon: "💬", label: "Data trapped in Slack or memory." },
];

export default function ProblemSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";

  return (
    <section
      id="problem"
      className="relative overflow-hidden flex flex-col justify-center"
      style={{ background: "hsl(var(--sq-card))", minHeight: "100vh" }}
    >
      {/* Warm tension glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage:
          "radial-gradient(ellipse 55% 70% at 90% 100%, hsl(18 100% 60% / 0.07) 0%, transparent 65%)",
      }} />

      <div className={`relative z-10 w-full max-w-7xl mx-auto px-8 sm:px-14 ${isPresenter ? "py-8" : "pt-28 pb-0"}`}>

        {/* ── Full-width headline block ── */}
        <div className="mb-10">
          <p
            className="font-bold text-[11px] uppercase tracking-[0.22em] mb-4 animate-fade-up"
            style={{ color: "hsl(var(--sq-orange))", animationDelay: "0ms" }}
          >
            The Problem
          </p>

          <h2
            className="font-black tracking-tight leading-[0.93] animate-fade-up"
            style={{
              color: "hsl(var(--sq-text))",
              animationDelay: "60ms",
              fontSize: isPresenter ? "3.6rem" : "clamp(3rem, 5.2vw, 5.6rem)",
              maxWidth: "88%",
            }}
          >
            Every brand says they talk to customers.{" "}
            <span
              style={{
                color: "hsl(var(--sq-orange))",
                textDecoration: "underline",
                textDecorationStyle: "wavy",
                textDecorationColor: "hsl(var(--sq-orange) / 0.4)",
                textUnderlineOffset: "8px",
              }}
            >
              Almost none do it enough to matter.
            </span>
          </h2>
        </div>

        {/* ── Bottom: Frictions left, Avatar right ── */}
        <div className="grid grid-cols-[55%_45%] items-end">

          {/* LEFT — frictions + quote */}
          <div className="flex flex-col gap-5 pr-12 pb-16">

            <p
              className="font-bold text-[11px] uppercase tracking-[0.2em] animate-fade-up"
              style={{ color: "hsl(var(--sq-muted))", animationDelay: "140ms" }}
            >
              The Friction
            </p>

            <div className="flex flex-col gap-3">
              {frictions.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-2xl px-5 py-4 animate-fade-up"
                  style={{
                    animationDelay: `${200 + i * 70}ms`,
                    background: "hsl(var(--sq-orange) / 0.04)",
                    border: "1px solid hsl(var(--sq-orange) / 0.12)",
                  }}
                >
                  <span
                    className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                    style={{
                      background: "hsl(var(--sq-orange) / 0.08)",
                      border: "1px solid hsl(var(--sq-orange) / 0.18)",
                    }}
                  >
                    {item.icon}
                  </span>
                  <p
                    className="font-bold leading-snug"
                    style={{
                      color: "hsl(var(--sq-text))",
                      fontSize: "clamp(1rem, 1.15vw, 1.15rem)",
                    }}
                  >
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Quote */}
            <div className="animate-fade-up mt-1" style={{ animationDelay: "440ms" }}>
              <div className="h-px mb-4" style={{ background: "hsl(var(--sq-subtle))" }} />
              <p
                className="font-black leading-snug"
                style={{
                  color: "hsl(var(--sq-text))",
                  fontSize: "clamp(1.05rem, 1.25vw, 1.25rem)",
                }}
              >
                "Decisions default to intuition.{" "}
                <span style={{ color: "hsl(var(--sq-orange))" }}>
                  Intuition doesn't scale."
                </span>
              </p>
              <p className="text-xs font-semibold mt-2" style={{ color: "hsl(var(--sq-muted))" }}>
                — 50 leaders at Zepto, Swiggy, Meesho, Titan, Rebel Foods
              </p>
            </div>
          </div>

          {/* RIGHT — avatar stage, tall and dominant */}
          <div className="relative" style={{ minHeight: 580 }}>

            {/* Stat card — top right */}
            <div
              className="absolute top-0 right-0 z-30 animate-fade-up"
              style={{ animationDelay: "280ms" }}
            >
              <div
                className="rounded-2xl px-5 py-4"
                style={{
                  background: "hsl(var(--sq-card))",
                  border: "1px solid hsl(var(--sq-subtle))",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                }}
              >
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5"
                  style={{ color: "hsl(var(--sq-muted))" }}>Avg. research cycle</p>
                <p className="font-black leading-none"
                  style={{ color: "hsl(var(--sq-orange))", fontSize: "2rem" }}>6–8 weeks</p>
                <p className="text-[11px] font-semibold mt-1"
                  style={{ color: "hsl(var(--sq-muted))" }}>& ₹30–50L per agency</p>
              </div>
            </div>

            {/* Floating "10x slower" chip */}
            <div
              className="absolute z-30 animate-fade-up"
              style={{ animationDelay: "480ms", bottom: "26%", left: "2%" }}
            >
              <div
                className="rounded-full px-4 py-2"
                style={{
                  background: "hsl(var(--sq-orange) / 0.09)",
                  border: "1px solid hsl(var(--sq-orange) / 0.22)",
                }}
              >
                <p className="font-black text-sm" style={{ color: "hsl(var(--sq-orange))" }}>
                  10× slower than it should be
                </p>
              </div>
            </div>

            {/* Avatar — tall, right-anchored, bleeds to bottom */}
            <div
              className="absolute bottom-0 right-0 z-20 animate-fade-up"
              style={{ animationDelay: "160ms" }}
            >
              <div className="animate-avatar-float">
                <img
                  src={avatarProblem}
                  alt="Overwhelmed brand manager"
                  className="select-none"
                  style={{
                    width: "auto",
                    height: 580,
                    objectFit: "contain",
                    maskImage: "linear-gradient(to top, transparent 0%, white 8%)",
                    WebkitMaskImage: "linear-gradient(to top, transparent 0%, white 8%)",
                  }}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
