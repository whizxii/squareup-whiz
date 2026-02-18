import { useScrollAnimation } from "@/lib/useScrollAnimation";
import AvatarOverwhelmed from "../avatars/AvatarOverwhelmed";
import type { SlideMode } from "@/lib/slides";

export default function ProblemSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="problem"
      className={`${isPresenter ? "h-full flex items-center px-20" : "py-28 px-6"} overflow-hidden`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-6xl mx-auto w-full" ref={ref}>
        <div className={`grid ${isPresenter ? "grid-cols-2" : "lg:grid-cols-2"} gap-16 items-center`}>

          {/* Left: copy */}
          <div>
            <p className={`font-bold text-xs uppercase tracking-[0.2em] mb-6 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0"}`}
              style={{ color: "hsl(var(--sq-orange))" }}>
              The Problem
            </p>

            <h2
              className={`font-black tracking-tight leading-[1.05] mb-10 transition-all duration-500 ${
                isPresenter ? "text-5xl" : "text-[2.2rem] sm:text-[2.8rem] lg:text-[3rem]"
              } ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ color: "hsl(var(--sq-text))" }}
            >
              Every brand says they<br />
              talk to customers.<br />
              <span style={{ color: "hsl(var(--sq-orange))" }}>Almost none do it at scale.</span>
            </h2>

            {/* 2 root causes — clean cards */}
            <div className="space-y-3 mb-8">
              {[
                { n: "01", title: "Scheduling kills it", body: "Coordinating 10 customer calls takes a week. Teams give up." },
                { n: "02", title: "No single source of truth", body: "Calls, tickets, reviews, socials — all disconnected. Decisions happen in the dark." },
              ].map((item, i) => (
                <div
                  key={item.n}
                  className={`flex gap-4 items-start rounded-2xl px-5 py-4 transition-all duration-500 ${revealed ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                  style={{
                    transitionDelay: `${300 + i * 120}ms`,
                    background: "hsl(var(--sq-card))",
                    border: "1px solid hsl(var(--sq-subtle))"
                  }}
                >
                  <span className="font-black text-xs mt-0.5 flex-shrink-0 w-6 pt-0.5" style={{ color: "hsl(var(--sq-orange))" }}>{item.n}</span>
                  <div>
                    <p className="font-black text-sm mb-0.5" style={{ color: "hsl(var(--sq-text))" }}>{item.title}</p>
                    <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--sq-muted))" }}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Consequence — strong orange */}
            <div
              className={`rounded-2xl px-6 py-5 transition-all duration-500 delay-700 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ background: "hsl(var(--sq-orange))", boxShadow: "0 12px 32px hsl(var(--sq-orange) / 0.25)" }}
            >
              <p className="font-black text-base leading-snug text-white">
                So decisions default to intuition.<br />
                And intuition scales very, very poorly.
              </p>
              <p className="text-white/70 text-xs mt-2 font-medium">
                — 50+ leaders at Zepto, Swiggy, Meesho, Titan, Rebel Foods
              </p>
            </div>
          </div>

          {/* Right: avatar — large, blending */}
          <div className={`flex justify-center items-end transition-all duration-700 delay-200 ${revealed ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-6"}`}>
            <div className="relative">
              {/* Soft glow behind avatar */}
              <div className="absolute inset-0 rounded-full" style={{
                background: "radial-gradient(circle, hsl(var(--sq-orange) / 0.08) 0%, transparent 70%)",
                transform: "scale(1.3)"
              }} />
              <AvatarOverwhelmed size={isPresenter ? 340 : 380} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
