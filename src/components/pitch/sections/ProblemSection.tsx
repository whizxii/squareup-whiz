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
          "radial-gradient(ellipse 60% 80% at 95% 85%, hsl(18 100% 60% / 0.06) 0%, transparent 60%)",
      }} />

      <div className={`relative z-10 w-full max-w-7xl mx-auto px-10 sm:px-16 ${isPresenter ? "py-8" : "pt-24 pb-10"}`}>

        {/* ── Full-width headline block ── */}
        <div className="mb-8">
          <p
            className="font-bold text-[10px] uppercase tracking-[0.24em] mb-3 animate-fade-up"
            style={{ color: "hsl(var(--sq-orange))", animationDelay: "0ms" }}
          >
            The Problem
          </p>

          <h2
            className="font-black tracking-tight leading-[0.92] animate-fade-up w-full"
            style={{
              color: "hsl(var(--sq-text))",
              animationDelay: "60ms",
              fontSize: isPresenter ? "3.6rem" : "clamp(2.8rem, 4.6vw, 5rem)",
            }}
          >
            Every brand says they talk to customers.<br />
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

        {/* ── Divider ── */}
        <div className="h-px mb-8 animate-fade-up" style={{ background: "hsl(var(--sq-subtle))", animationDelay: "100ms" }} />

        {/* ── Bottom: Frictions left, Avatar right ── */}
        <div className="grid grid-cols-[52%_48%] items-stretch gap-0">

          {/* LEFT — frictions + quote */}
          <div className="flex flex-col justify-between pr-14">

            {/* Friction rows */}
            <div className="flex flex-col gap-0">
              <p
                className="font-bold text-[10px] uppercase tracking-[0.22em] mb-4 animate-fade-up"
                style={{ color: "hsl(var(--sq-muted))", animationDelay: "140ms" }}
              >
                The Friction
              </p>

              {frictions.map((item, i) => (
                <div key={i}>
                  <div
                    className="flex items-center gap-4 py-4 animate-fade-up"
                    style={{ animationDelay: `${200 + i * 70}ms` }}
                  >
                    <span
                      className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{
                        background: "hsl(var(--sq-orange) / 0.07)",
                        border: "1px solid hsl(var(--sq-orange) / 0.15)",
                      }}
                    >
                      {item.icon}
                    </span>
                    <p
                      className="font-bold leading-snug"
                      style={{
                        color: "hsl(var(--sq-text))",
                        fontSize: "clamp(1rem, 1.1vw, 1.15rem)",
                      }}
                    >
                      {item.label}
                    </p>
                  </div>
                  {i < frictions.length - 1 && (
                    <div className="h-px" style={{ background: "hsl(var(--sq-subtle))" }} />
                  )}
                </div>
              ))}
            </div>

            {/* Quote block */}
            <div className="animate-fade-up mt-6" style={{ animationDelay: "440ms" }}>
              <div
                className="rounded-2xl px-5 py-4"
                style={{
                  background: "hsl(var(--sq-orange) / 0.04)",
                  border: "1px solid hsl(var(--sq-orange) / 0.12)",
                }}
              >
                <p
                  className="font-black leading-snug"
                  style={{
                    color: "hsl(var(--sq-text))",
                    fontSize: "clamp(1rem, 1.15vw, 1.2rem)",
                  }}
                >
                  "Decisions default to intuition.{" "}
                  <span style={{ color: "hsl(var(--sq-orange))" }}>
                    Intuition doesn't scale."
                  </span>
                </p>
                <p className="text-[11px] font-semibold mt-2" style={{ color: "hsl(var(--sq-muted))" }}>
                  — 50 leaders at Zepto, Swiggy, Meesho, Titan, Rebel Foods
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT — avatar stage */}
          <div className="relative" style={{ minHeight: 520 }}>

            {/* Stat card — top right, close to avatar */}
            <div
              className="absolute top-0 right-0 z-30 animate-fade-up"
              style={{ animationDelay: "280ms" }}
            >
              <div
                className="rounded-2xl px-5 py-4"
                style={{
                  background: "hsl(var(--sq-card))",
                  border: "1px solid hsl(var(--sq-subtle))",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.07)",
                }}
              >
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: "hsl(var(--sq-muted))" }}>Avg. research cycle</p>
                <p className="font-black leading-none"
                  style={{ color: "hsl(var(--sq-orange))", fontSize: "2rem" }}>6–8 weeks</p>
                <p className="text-[11px] font-semibold mt-1"
                  style={{ color: "hsl(var(--sq-muted))" }}>& ₹30–50L per agency</p>
              </div>
            </div>

            {/* "10x slower" chip — anchored mid-left, near avatar body */}
            <div
              className="absolute z-30 animate-fade-up"
              style={{ animationDelay: "480ms", bottom: "28%", left: "0%" }}
            >
              <div
                className="rounded-full px-4 py-2.5"
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
                    height: 500,
                    objectFit: "contain",
                    maskImage: "linear-gradient(to top, transparent 0%, white 6%)",
                    WebkitMaskImage: "linear-gradient(to top, transparent 0%, white 6%)",
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
