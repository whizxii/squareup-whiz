import avatarProblem from "@/assets/avatar-problem-white.png";
import type { SlideMode } from "@/lib/slides";

const frictions = [
  {
    icon: "📅",
    label: "Scheduling calls is slow.",
    detail: "Weeks lost just getting 10 people on a call.",
  },
  {
    icon: "🎙️",
    label: "Analyzing audio is manual.",
    detail: "Hours of listening, note-taking, and summarizing.",
  },
  {
    icon: "💬",
    label: "Data is trapped in Slack threads or memory.",
    detail: "Insights evaporate. Decisions default to gut feel.",
  },
];

export default function ProblemSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";

  return (
    <section
      id="problem"
      className="relative overflow-hidden flex flex-col justify-center"
      style={{ background: "hsl(var(--sq-card))", minHeight: "100vh" }}
    >
      {/* Subtle tension glow — bottom right */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage:
          "radial-gradient(ellipse 55% 50% at 85% 80%, hsl(18 100% 60% / 0.05) 0%, transparent 70%)",
      }} />

      <div className={`relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 ${isPresenter ? "" : "pt-20 pb-0"}`}>
        <div className="grid grid-cols-[1fr_1fr] gap-0 items-center">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col gap-10 pr-16 py-8">

            {/* Eyebrow */}
            <p
              className="font-bold text-xs uppercase tracking-[0.22em] animate-fade-up"
              style={{ color: "hsl(var(--sq-orange))", animationDelay: "0ms" }}
            >
              The Problem
            </p>

            {/* Headline */}
            <h2
              className={`font-black tracking-tight leading-[1.0] animate-fade-up ${
                isPresenter ? "text-5xl" : "text-[2.6rem] sm:text-[3.2rem] lg:text-[3.8rem]"
              }`}
              style={{ color: "hsl(var(--sq-text))", animationDelay: "60ms" }}
            >
              Every brand says they<br />
              talk to customers.<br />
              <span
                style={{
                  color: "hsl(var(--sq-orange))",
                  textDecoration: "underline",
                  textDecorationStyle: "wavy",
                  textDecorationColor: "hsl(var(--sq-orange) / 0.35)",
                  textUnderlineOffset: "6px",
                }}
              >
                Almost none do it<br />enough to matter.
              </span>
            </h2>

            {/* Divider + label */}
            <div className="animate-fade-up" style={{ animationDelay: "130ms" }}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] mb-5"
                style={{ color: "hsl(var(--sq-muted))" }}>
                The Friction
              </p>

              {/* Friction list */}
              <ul className="flex flex-col gap-5">
                {frictions.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-4 animate-fade-up"
                    style={{ animationDelay: `${160 + i * 80}ms` }}
                  >
                    {/* Icon chip */}
                    <span
                      className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base mt-0.5"
                      style={{
                        background: "hsl(var(--sq-orange) / 0.07)",
                        border: "1px solid hsl(var(--sq-orange) / 0.15)",
                      }}
                    >
                      {item.icon}
                    </span>

                    <div>
                      <p className="font-bold text-sm leading-snug" style={{ color: "hsl(var(--sq-text))" }}>
                        {item.label}
                      </p>
                      <p className="text-xs font-medium mt-0.5 leading-relaxed" style={{ color: "hsl(var(--sq-muted))" }}>
                        {item.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Consequence */}
            <div className="animate-fade-up" style={{ animationDelay: "440ms" }}>
              <div className="h-px mb-5" style={{ background: "hsl(var(--sq-subtle))" }} />
              <p
                className={`font-black leading-tight ${isPresenter ? "text-xl" : "text-xl"}`}
                style={{ color: "hsl(var(--sq-text))" }}
              >
                "Decisions default to intuition.{" "}
                <span style={{ color: "hsl(var(--sq-orange))" }}>Intuition doesn't scale."</span>
              </p>
              <p className="text-xs font-semibold mt-2" style={{ color: "hsl(var(--sq-muted))" }}>
                — 50 leaders at Zepto, Swiggy, Meesho, Titan, Rebel Foods
              </p>
            </div>
          </div>

          {/* ── RIGHT COLUMN — avatar stage ── */}
          <div className="relative" style={{ minHeight: 640 }}>

            {/* Floating stat — top right */}
            <div
              className="absolute top-10 right-0 z-30 animate-fade-up"
              style={{ animationDelay: "320ms" }}
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

            {/* Floating mini-tag — left of avatar */}
            <div
              className="absolute top-[42%] left-4 z-30 animate-fade-up"
              style={{ animationDelay: "520ms" }}
            >
              <div
                className="rounded-xl px-3 py-1.5"
                style={{
                  background: "hsl(var(--sq-orange) / 0.07)",
                  border: "1px solid hsl(var(--sq-orange) / 0.18)",
                }}
              >
                <p className="font-black text-xs" style={{ color: "hsl(var(--sq-orange))" }}>
                  10× slower than it should be
                </p>
              </div>
            </div>

            {/* Avatar — bottom-center, transparent, floating */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 animate-fade-up"
              style={{ animationDelay: "180ms" }}
            >
              <div className="animate-avatar-float">
                <img
                  src={avatarProblem}
                  alt="Overwhelmed brand manager"
                  className="select-none"
                  style={{
                    width: 400,
                    height: "auto",
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
