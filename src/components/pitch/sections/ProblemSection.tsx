import avatarProblem from "@/assets/avatar-problem-white.png";
import type { SlideMode } from "@/lib/slides";

const frictions = [
  { icon: "📅", label: "Scheduling calls is slow." },
  { icon: "🎙️", label: "Analyzing audio is manual." },
  { icon: "💬", label: "Data is trapped in Slack or memory." },
];

export default function ProblemSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";

  return (
    <section
      id="problem"
      className="relative overflow-hidden flex flex-col justify-center"
      style={{ background: "hsl(var(--sq-card))", minHeight: "100vh" }}
    >
      {/* Subtle warm tension glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage:
          "radial-gradient(ellipse 60% 55% at 75% 80%, hsl(18 100% 60% / 0.05) 0%, transparent 70%)",
      }} />

      <div className={`relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 ${isPresenter ? "" : "pt-20 pb-0"}`}>
        <div className="grid grid-cols-[45%_55%] gap-0 items-center">

          {/* ── LEFT — compact, punchy ── */}
          <div className="flex flex-col gap-8 pr-12 py-8">

            {/* Eyebrow */}
            <p
              className="font-bold text-xs uppercase tracking-[0.22em] animate-fade-up"
              style={{ color: "hsl(var(--sq-orange))", animationDelay: "0ms" }}
            >
              The Problem
            </p>

            {/* Headline — tight, 2–3 lines */}
            <h2
              className={`font-black tracking-tight leading-[1.0] animate-fade-up ${
                isPresenter ? "text-[2.8rem]" : "text-[2.4rem] sm:text-[3rem] lg:text-[3.4rem]"
              }`}
              style={{ color: "hsl(var(--sq-text))", animationDelay: "60ms" }}
            >
              Every brand says they<br />talk to customers.{" "}
              <span
                style={{
                  color: "hsl(var(--sq-orange))",
                  textDecoration: "underline",
                  textDecorationStyle: "wavy",
                  textDecorationColor: "hsl(var(--sq-orange) / 0.35)",
                  textUnderlineOffset: "6px",
                }}
              >
                Almost none do it enough to matter.
              </span>
            </h2>

            {/* Divider */}
            <div className="h-px" style={{ background: "hsl(var(--sq-subtle))" }} />

            {/* Quote */}
            <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
              <p
                className="font-black text-lg leading-snug"
                style={{ color: "hsl(var(--sq-text))" }}
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

          {/* ── RIGHT — avatar + floating friction cards ── */}
          <div className="relative" style={{ minHeight: 640 }}>

            {/* Stat card — top right */}
            <div
              className="absolute top-8 right-0 z-30 animate-fade-up"
              style={{ animationDelay: "300ms" }}
            >
              <div
                className="rounded-2xl px-4 py-3"
                style={{
                  background: "hsl(var(--sq-card))",
                  border: "1px solid hsl(var(--sq-subtle))",
                  boxShadow: "0 8px 28px rgba(0,0,0,0.07)",
                }}
              >
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: "hsl(var(--sq-muted))" }}>Avg. research cycle</p>
                <p className="font-black text-2xl leading-none"
                  style={{ color: "hsl(var(--sq-orange))" }}>6–8 weeks</p>
                <p className="text-[10px] font-medium mt-0.5"
                  style={{ color: "hsl(var(--sq-muted))" }}>& ₹30–50L per agency</p>
              </div>
            </div>

            {/* Friction cards — stacked left of avatar */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2.5">
              {frictions.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 animate-fade-up"
                  style={{
                    animationDelay: `${360 + i * 80}ms`,
                    background: "hsl(var(--sq-card))",
                    border: "1px solid hsl(var(--sq-subtle))",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                    maxWidth: 230,
                  }}
                >
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                    style={{
                      background: "hsl(var(--sq-orange) / 0.07)",
                      border: "1px solid hsl(var(--sq-orange) / 0.15)",
                    }}
                  >
                    {item.icon}
                  </span>
                  <p className="font-semibold text-xs leading-snug" style={{ color: "hsl(var(--sq-text))" }}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Avatar — right-anchored, full height */}
            <div
              className="absolute bottom-0 right-0 z-20 animate-fade-up"
              style={{ animationDelay: "180ms" }}
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
                    maskImage: "linear-gradient(to top, transparent 0%, white 12%)",
                    WebkitMaskImage: "linear-gradient(to top, transparent 0%, white 12%)",
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
