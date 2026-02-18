import { useScrollAnimation } from "@/lib/useScrollAnimation";
import AvatarOverwhelmed from "../avatars/AvatarOverwhelmed";
import type { SlideMode } from "@/lib/slides";

export default function ProblemSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="problem"
      className={`${isPresenter ? "h-full flex items-center px-20" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-6xl mx-auto w-full" ref={ref}>
        <div className={`${isPresenter ? "grid grid-cols-2 gap-20 items-center" : "grid lg:grid-cols-2 gap-20 items-center"}`}>

          {/* Left: editorial copy block */}
          <div>
            {/* Section marker */}
            <p className={`font-bold text-xs uppercase tracking-[0.2em] mb-6 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0"}`}
              style={{ color: "hsl(var(--sq-orange))" }}>
              The Problem
            </p>

            <h2
              className={`font-black tracking-tight leading-[1.0] mb-10 transition-all duration-500 ${
                isPresenter ? "text-5xl" : "text-[2.4rem] sm:text-[3rem] lg:text-[3.5rem]"
              } ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ color: "hsl(var(--sq-text))" }}
            >
              Every brand claims to{" "}
              <span style={{ color: "hsl(var(--sq-orange))" }}>talk to customers.</span>{" "}
              Almost none do it enough to matter.
            </h2>

            {/* Pull quote — real language */}
            <blockquote
              className={`border-l-4 pl-5 py-1 mb-10 transition-all duration-500 delay-200 ${revealed ? "opacity-100" : "opacity-0"}`}
              style={{ borderColor: "hsl(var(--sq-orange))" }}
            >
              <p className="font-bold text-lg leading-snug italic" style={{ color: "hsl(var(--sq-text))" }}>
                "We talked to 50+ leaders across Zepto, Meesho, Swiggy,<br />
                Titan, Rebel Foods. Same story, every time."
              </p>
              <p className="text-sm mt-2 font-medium" style={{ color: "hsl(var(--sq-muted))" }}>
                — Param & Kunj, SquareUp founders
              </p>
            </blockquote>

            {/* Three friction points — stark, no emoji fluff */}
            <div className="space-y-4">
              {[
                { n: "01", title: "Scheduling kills momentum", body: "Coordinating 10 calls takes a week. Most teams give up. Decisions proceed without data." },
                { n: "02", title: "Insight stays locked in recordings", body: "Hours of audio, never properly synthesized. The truth exists. Nobody can access it." },
                { n: "03", title: "No single source of truth", body: "Calls, tickets, reviews, socials, internal reports — all disconnected. Decisions made in the dark." },
              ].map((item, i) => (
                <div
                  key={item.n}
                  className={`flex gap-4 items-start transition-all duration-500 ${revealed ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                  style={{ transitionDelay: `${300 + i * 120}ms` }}
                >
                  <span className="font-black text-xs mt-1 flex-shrink-0" style={{ color: "hsl(var(--sq-orange))" }}>{item.n}</span>
                  <div>
                    <p className="font-bold text-sm mb-0.5" style={{ color: "hsl(var(--sq-text))" }}>{item.title}</p>
                    <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--sq-muted))" }}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Consequence — bold statement */}
            <div
              className={`mt-8 rounded-2xl px-6 py-4 transition-all duration-500 delay-700 ${revealed ? "opacity-100" : "opacity-0"}`}
              style={{ background: "hsl(var(--sq-orange) / 0.08)", border: "1px solid hsl(var(--sq-orange) / 0.2)" }}
            >
              <p className="font-black text-base leading-snug" style={{ color: "hsl(var(--sq-orange))" }}>
                So decisions default to intuition.<br />
                And intuition scales very, very poorly.
              </p>
            </div>
          </div>

          {/* Right: avatar — large, prominent */}
          <div
            className={`flex justify-center transition-all duration-700 delay-300 ${revealed ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
          >
            <AvatarOverwhelmed size={isPresenter ? 320 : 300} />
          </div>
        </div>
      </div>
    </section>
  );
}
