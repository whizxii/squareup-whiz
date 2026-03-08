import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";
import { AlertTriangle, Clock, Activity } from "lucide-react";
import avatarProblem from "@/assets/avatar-problem-white.png";

export default function CostSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation(0.15, mode === "presenter");

  return (
    <section
      id="cost"
      className={`relative overflow-hidden ${isPresenter ? "min-h-screen flex items-center px-16 py-12" : "py-32 px-8 sm:px-16"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      <div className="max-w-6xl mx-auto w-full" ref={ref}>

        {/* Character — hero-quality, prominent */}
        <div className="absolute right-6 bottom-0 hidden lg:block pointer-events-none animate-avatar-float z-0" style={{ animationDelay: "2s" }}>
          <img
            src={avatarProblem}
            alt=""
            loading="lazy"
            style={{
              width: 240,
              height: "auto",
              objectFit: "contain",
              maskImage: "linear-gradient(to top, transparent 0%, white 12%)",
              WebkitMaskImage: "linear-gradient(to top, transparent 0%, white 12%)",
            }}
          />
        </div>

        {/* Header */}
        <div className={`${isPresenter ? "mb-8" : "mb-16"} text-center transition-all duration-700 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className={`inline-flex items-center justify-center ${isPresenter ? "w-10 h-10 mb-4" : "w-12 h-12 mb-6"} rounded-full bg-red-500/10`}>
            <AlertTriangle className="text-red-500" size={isPresenter ? 20 : 24} />
          </div>
          <h2
            className={`font-black tracking-tight leading-tight mb-4 ${isPresenter ? "text-4xl" : "text-4xl sm:text-5xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}
          >
            One wrong decision can cost <br />
            <span style={{ color: "hsl(var(--sq-orange))" }}>months, crores, and trust.</span>
          </h2>
          {!isPresenter && (
            <p className="text-lg font-medium max-w-2xl mx-auto" style={{ color: "hsl(var(--sq-muted))" }}>
              A real life example from a beauty & personal care brand.
            </p>
          )}
        </div>

        {/* Split UI */}
        <div className={`grid md:grid-cols-2 ${isPresenter ? "gap-6" : "gap-8 lg:gap-16"} transition-all duration-700 delay-200 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>

          {/* Timeline Block (What happened) */}
          <div className={isPresenter ? "space-y-3" : "space-y-6"}>
            <h3 className={`${isPresenter ? "text-base" : "text-xl"} font-bold uppercase tracking-widest flex items-center gap-3`} style={{ color: "hsl(var(--sq-text))" }}>
              <Clock size={isPresenter ? 16 : 20} className="text-red-400" />
              What Happened
            </h3>
            <p className="text-[10px] font-medium italic" style={{ color: "hsl(var(--sq-muted) / 0.6)" }}>
              Real life scenario based on operator interviews
            </p>

            <div className="relative pl-6 border-l-2" style={{ borderColor: "hsl(var(--sq-subtle))" }}>
              {[
                { time: "Q1", title: "The 'Right' Upfront Steps", desc: "Customer conversations, field work, and reports were completed. The green light was given." },
                { time: "Launch", title: "Product Hits Market", desc: "₹2–3Cr committed to inventory. ₹50L–1Cr in launch marketing. Multi-channel rollout initiated.", highlight: true },
                { time: "Q3", title: "Product Underperforms", desc: "CAC spikes materially. Repeat purchase lags projections. Channel partners start pushing back." },
                { time: "Post-Mortem", title: "The Real Issue Exposed", desc: "A late study reveals the price-pack architecture was flawed. A smaller pack at a lower entry price was required.", isRed: true }
              ].map((item, idx) => (
                <div key={idx} className={`${isPresenter ? "mb-4" : "mb-8"} relative`}>
                  <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-4 ${item.isRed ? "bg-red-500 border-red-200" : "bg-[hsl(var(--sq-text))] border-[hsl(var(--sq-card))]"}`} style={{ boxShadow: item.isRed ? "0 0 16px rgba(239,68,68,0.4)" : undefined }} />
                  <span className="text-xs font-bold px-2 py-1 rounded bg-[hsl(var(--sq-subtle))] text-[hsl(var(--sq-muted))] mb-2 inline-block">
                    {item.time}
                  </span>
                  <h4 className={`${isPresenter ? "text-sm" : "text-lg"} font-bold mb-1 ${item.isRed ? "text-red-500" : ""}`} style={{ color: item.isRed ? "" : "hsl(var(--sq-text))" }}>{item.title}</h4>
                  <p className={`${isPresenter ? "text-xs" : "text-sm"} leading-relaxed ${(item as any).highlight ? "font-black" : "font-medium"}`}
                    style={{ color: (item as any).highlight ? "hsl(var(--sq-text))" : "hsl(var(--sq-muted))" }}>
                    {item.desc}
                  </p>
                  {(item as any).highlight && (
                    <p className={`${isPresenter ? "text-[10px] mt-1" : "text-xs mt-1.5"} font-bold italic`}
                      style={{ color: "hsl(var(--sq-orange))" }}>
                      The decision is now largely irreversible.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown Block (What this exposed) */}
          <div className={`rounded-3xl ${isPresenter ? "p-5" : "p-8 sm:p-10"} flex flex-col justify-center`} style={{ background: "hsl(var(--sq-orange) / 0.05)", border: "1px solid hsl(var(--sq-orange) / 0.15)" }}>
            <h3 className={`${isPresenter ? "text-base mb-4" : "text-xl mb-8"} font-bold uppercase tracking-widest flex items-center gap-3`} style={{ color: "hsl(var(--sq-text))" }}>
              <Activity size={isPresenter ? 16 : 20} className="text-[hsl(var(--sq-orange))]" />
              What This Exposed
            </h3>

            <div className={isPresenter ? "space-y-3" : "space-y-6"}>
              {[
                "No single repository to audit the original evidence.",
                "No clean trail from insight to the final launch decision.",
                "No fast way to re-interview the right audience at scale.",
                "No fast way to route the right insight to the right team before launch.",
              ].map((point, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="mt-1 w-6 h-6 rounded-full flex items-center justify-center bg-[hsl(var(--sq-orange)/0.2)] text-[hsl(var(--sq-orange))] flex-shrink-0 font-bold text-sm">✕</div>
                  <p className={`${isPresenter ? "text-sm" : "text-base"} font-semibold leading-relaxed`} style={{ color: "hsl(var(--sq-text))" }}>{point}</p>
                </div>
              ))}
            </div>

            <div className={`${isPresenter ? "mt-6 pt-4" : "mt-12 pt-8"} border-t`} style={{ borderColor: "hsl(var(--sq-orange) / 0.2)" }}>
              <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(var(--sq-orange))" }}>The Bottom Line</p>
              <p className={`${isPresenter ? "text-xl" : "text-2xl"} font-black leading-snug`} style={{ color: "hsl(var(--sq-text))" }}>
                Bad launch. Budget wasted. Trust broken. <br />
                <span style={{ color: "hsl(var(--sq-orange))" }}>A huge price paid for customer understanding.</span>
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
