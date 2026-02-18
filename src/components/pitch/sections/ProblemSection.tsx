import avatarProblem from "@/assets/avatar-problem-white.png";
import type { SlideMode } from "@/lib/slides";

const PAIN_POINTS = [
  {
    icon: "📅",
    title: "Scheduling kills momentum",
    body: "10 customer calls = 1 week of coordination. Teams give up before they start.",
    tag: "Speed",
  },
  {
    icon: "🗂️",
    title: "No single source of truth",
    body: "Calls, tickets, reviews, socials — all disconnected. Decisions happen in the dark.",
    tag: "Clarity",
  },
  {
    icon: "🎲",
    title: "Gut feel fills the gap",
    body: "Without data, intuition wins. Crores bet on guesswork every quarter.",
    tag: "Risk",
  },
];

export default function ProblemSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";

  return (
    <section
      id="problem"
      className={`relative overflow-hidden flex flex-col justify-center ${
        isPresenter ? "h-full px-20 items-center" : "px-6 sm:px-12"
      }`}
      style={{ background: "hsl(var(--sq-card))", minHeight: "100vh" }}
    >
      {/* Warm red-tinted ambient glow — signals tension */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          radial-gradient(ellipse 55% 50% at 80% 55%, hsl(15 90% 60% / 0.05) 0%, transparent 70%),
          radial-gradient(ellipse 40% 40% at 15% 40%, hsl(var(--sq-amber) / 0.04) 0%, transparent 60%)
        `,
      }} />

      {/* Faint dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.018]" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--sq-text)) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      <div className={`relative z-10 w-full max-w-7xl mx-auto ${isPresenter ? "" : "pt-20 pb-0"}`}>
        <div className={`grid gap-0 items-center grid-cols-[1fr_1fr]`}>

          {/* LEFT — narrative */}
          <div className="flex flex-col gap-7 pr-12 py-8">

            {/* Label */}
            <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
              <span className="font-bold text-xs uppercase tracking-[0.2em]" style={{ color: "hsl(var(--sq-orange))" }}>
                The Problem
              </span>
            </div>

            {/* Headline */}
            <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
              <h2
                className={`font-black tracking-tight leading-[0.95] ${
                  isPresenter ? "text-5xl" : "text-[2.6rem] sm:text-[3.2rem] lg:text-[4rem]"
                }`}
                style={{ color: "hsl(var(--sq-text))" }}
              >
                Every brand says<br />
                they listen.<br />
                <span style={{
                  color: "hsl(var(--sq-orange))",
                  textDecoration: "underline",
                  textDecorationStyle: "wavy",
                  textDecorationColor: "hsl(var(--sq-orange) / 0.3)",
                  textUnderlineOffset: "6px",
                }}>None do at scale.</span>
              </h2>
            </div>

            {/* Pain point cards */}
            <div className="flex flex-col gap-2.5">
              {PAIN_POINTS.map((p, i) => (
                <div
                  key={p.title}
                  className="flex items-start gap-4 rounded-2xl px-5 py-4 animate-fade-up"
                  style={{
                    animationDelay: `${140 + i * 80}ms`,
                    background: "hsl(var(--sq-off-white))",
                    border: "1px solid hsl(var(--sq-subtle))",
                  }}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-black text-sm" style={{ color: "hsl(var(--sq-text))" }}>{p.title}</p>
                      <span
                        className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: "hsl(var(--sq-orange) / 0.1)",
                          color: "hsl(var(--sq-orange))",
                        }}
                      >{p.tag}</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--sq-muted))" }}>{p.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Consequence banner */}
            <div
              className="rounded-2xl px-6 py-5 animate-fade-up"
              style={{
                animationDelay: "420ms",
                background: "hsl(var(--sq-orange))",
                boxShadow: "0 12px 40px hsl(var(--sq-orange) / 0.25)",
              }}
            >
              <p className="font-black text-base leading-snug text-white">
                Decisions default to intuition.<br />Intuition doesn't scale.
              </p>
              <p className="text-white/70 text-xs mt-1.5 font-semibold">
                — 50 leaders at Zepto, Swiggy, Meesho, Titan, Rebel Foods
              </p>
            </div>
          </div>

          {/* RIGHT — avatar stage */}
          <div className="relative block" style={{ minHeight: 640 }}>

            {/* Warm glow behind avatar */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: "radial-gradient(ellipse 65% 55% at 50% 85%, hsl(15 90% 60% / 0.07) 0%, transparent 70%)",
            }} />

            {/* Stressed avatar */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 animate-fade-up animate-avatar-float z-20"
              style={{ animationDelay: "200ms" }}
            >
              <img
                src={avatarProblem}
                alt="Overwhelmed brand manager"
                className="select-none"
                style={{
                  width: 340,
                  height: "auto",
                  objectFit: "contain",
                  maskImage: "linear-gradient(to top, transparent 0%, white 12%)",
                  WebkitMaskImage: "linear-gradient(to top, transparent 0%, white 12%)",
                }}
              />
            </div>

            {/* Floating chaos cards */}
            <div
              className="absolute top-12 right-0 animate-fade-up"
              style={{ animationDelay: "350ms" }}
            >
              <div
                className="rounded-2xl px-4 py-3"
                style={{
                  background: "hsl(var(--sq-card))",
                  border: "1px solid hsl(var(--sq-subtle))",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                }}
              >
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "hsl(var(--sq-muted))" }}>
                  Time lost
                </p>
                <p className="font-black text-lg leading-none" style={{ color: "hsl(var(--sq-orange))" }}>6–8 weeks</p>
                <p className="text-[10px] font-medium mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>to get research you can trust</p>
              </div>
            </div>

            <div
              className="absolute top-40 left-0 animate-fade-up"
              style={{ animationDelay: "470ms" }}
            >
              <div
                className="rounded-2xl px-4 py-3"
                style={{
                  background: "hsl(var(--sq-card))",
                  border: "1px solid hsl(var(--sq-subtle))",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                }}
              >
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "hsl(var(--sq-muted))" }}>
                  Cost of guessing
                </p>
                <p className="font-black text-lg leading-none" style={{ color: "hsl(var(--sq-orange))" }}>₹30–50L</p>
                <p className="text-[10px] font-medium mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>per research agency cycle</p>
              </div>
            </div>

            <div
              className="absolute bottom-20 right-0 animate-fade-up"
              style={{ animationDelay: "560ms" }}
            >
              <div
                className="rounded-2xl px-4 py-3"
                style={{
                  background: "hsl(var(--sq-card))",
                  border: "1px solid hsl(var(--sq-subtle))",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "hsl(15 90% 55%)" }} />
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--sq-muted))" }}>No trail</p>
                </div>
                <p className="font-black text-xs" style={{ color: "hsl(var(--sq-text))" }}>Decisions made on gut</p>
                <p className="text-[10px] font-medium" style={{ color: "hsl(var(--sq-muted))" }}>no record of why</p>
              </div>
            </div>

            {/* Data sources chaos tag */}
            <div
              className="absolute top-[52%] right-2 animate-fade-up"
              style={{ animationDelay: "640ms" }}
            >
              <div
                className="rounded-xl px-3 py-1.5"
                style={{
                  background: "hsl(15 90% 55% / 0.08)",
                  border: "1px solid hsl(15 90% 55% / 0.2)",
                }}
              >
                <p className="font-bold text-xs" style={{ color: "hsl(15 90% 45%)" }}>
                  Calls · Tickets · Socials · Reviews
                </p>
                <p className="text-[9px] font-medium" style={{ color: "hsl(var(--sq-muted))" }}>all disconnected</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
