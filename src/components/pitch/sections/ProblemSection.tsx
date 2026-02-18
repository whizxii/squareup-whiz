import avatarProblem from "@/assets/avatar-problem-white.png";
import type { SlideMode } from "@/lib/slides";

export default function ProblemSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";

  return (
    <section
      id="problem"
      className="relative overflow-hidden flex flex-col justify-center"
      style={{ background: "hsl(var(--sq-card))", minHeight: "100vh" }}
    >
      {/* Subtle warm tension glow — bottom right only */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage:
          "radial-gradient(ellipse 50% 45% at 80% 75%, hsl(20 85% 60% / 0.06) 0%, transparent 70%)",
      }} />

      <div className={`relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 ${isPresenter ? "" : "pt-20 pb-0"}`}>
        <div className="grid grid-cols-[1fr_1fr] gap-0 items-center">

          {/* LEFT */}
          <div className="flex flex-col gap-10 pr-16 py-8">

            <p className="font-bold text-xs uppercase tracking-[0.2em] animate-fade-up"
              style={{ color: "hsl(var(--sq-orange))", animationDelay: "0ms" }}>
              The Problem
            </p>

            <h2
              className={`font-black tracking-tight leading-[0.95] animate-fade-up ${
                isPresenter ? "text-5xl" : "text-[2.8rem] sm:text-[3.5rem] lg:text-[4.2rem]"
              }`}
              style={{ color: "hsl(var(--sq-text))", animationDelay: "60ms" }}
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

            {/* 3 clean bullet lines — no cards, just text */}
            <ul className="flex flex-col gap-4 animate-fade-up" style={{ animationDelay: "140ms" }}>
              {[
                { dot: "hsl(var(--sq-orange))", text: "10 customer calls = 1 week of calendar chaos. Teams give up." },
                { dot: "hsl(var(--sq-orange))", text: "Calls, tickets, reviews, socials — all disconnected silos." },
                { dot: "hsl(var(--sq-orange))", text: "No data = gut feel. Crores bet on instinct every quarter." },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.dot }} />
                  <span className={`font-medium leading-relaxed ${isPresenter ? "text-base" : "text-base"}`}
                    style={{ color: "hsl(var(--sq-muted))" }}>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* Single, punchy consequence — no box, just bold text + attribution */}
            <div className="animate-fade-up" style={{ animationDelay: "260ms" }}>
              <div className="h-px mb-6" style={{ background: "hsl(var(--sq-subtle))" }} />
              <p className={`font-black leading-tight ${isPresenter ? "text-2xl" : "text-2xl"}`}
                style={{ color: "hsl(var(--sq-text))" }}>
                "Decisions default to intuition.<br />
                <span style={{ color: "hsl(var(--sq-orange))" }}>Intuition doesn't scale."</span>
              </p>
              <p className="text-xs font-semibold mt-2" style={{ color: "hsl(var(--sq-muted))" }}>
                — 50 leaders at Zepto, Swiggy, Meesho, Titan, Rebel Foods
              </p>
            </div>
          </div>

          {/* RIGHT — avatar, no box, pure blend */}
          <div className="relative block" style={{ minHeight: 640 }}>

            {/* Single subtle stat floating top-right */}
            <div
              className="absolute top-10 right-0 animate-fade-up z-30"
              style={{ animationDelay: "350ms" }}
            >
              <div className="rounded-2xl px-4 py-3" style={{
                background: "hsl(var(--sq-card))",
                border: "1px solid hsl(var(--sq-subtle))",
                boxShadow: "0 8px 28px rgba(0,0,0,0.07)",
              }}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(var(--sq-muted))" }}>Avg. research cycle</p>
                <p className="font-black text-2xl leading-none" style={{ color: "hsl(var(--sq-orange))" }}>6–8 weeks</p>
                <p className="text-[10px] font-medium mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>& ₹30–50L per agency</p>
              </div>
            </div>

            {/* Avatar — centered, bleeds into white, no glow box */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 animate-fade-up z-20 animate-avatar-float"
              style={{ animationDelay: "180ms" }}
            >
              <img
                src={avatarProblem}
                alt="Overwhelmed brand manager"
                className="select-none"
                style={{
                  width: 380,
                  height: "auto",
                  objectFit: "contain",
                  maskImage: "linear-gradient(to top, transparent 0%, white 14%)",
                  WebkitMaskImage: "linear-gradient(to top, transparent 0%, white 14%)",
                }}
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
