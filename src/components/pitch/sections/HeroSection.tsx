import { ChevronDown } from "lucide-react";
import iconSvg from "@/assets/icon.svg";
import type { SlideMode } from "@/lib/slides";

interface HeroSectionProps { mode?: SlideMode; }

export default function HeroSection({ mode = "detailed" }: HeroSectionProps) {
  const isPresenter = mode === "presenter";

  return (
    <section
      id="hero"
      className={`relative overflow-hidden bg-sq-dark flex flex-col items-center justify-center text-center ${
        isPresenter ? "h-full px-24" : "min-h-screen px-6"
      }`}
    >
      {!isPresenter && (
        <>
          <div className="animate-blob-1 absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(var(--sq-orange)) 0%, transparent 70%)", opacity: 0.07 }} />
          <div className="animate-blob-2 absolute bottom-1/3 right-1/4 w-[450px] h-[450px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(var(--sq-amber)) 0%, transparent 70%)", opacity: 0.05 }} />
        </>
      )}

      <div className={`relative z-10 max-w-5xl mx-auto ${isPresenter ? "space-y-10" : "space-y-7"}`}>
        {/* Wordmark */}
        <div className="flex justify-center mb-2">
          <div className="flex items-center justify-center gap-2.5">
            <img src={iconSvg} alt="SquareUp" className="h-8 w-auto" />
            <span className="text-white font-black text-2xl tracking-tight">
              Square<span style={{ color: "hsl(var(--sq-orange))" }}>Up</span>
            </span>
          </div>
        </div>

        {/* Status pill */}
        <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 border" style={{
          background: "hsl(var(--sq-orange) / 0.08)",
          borderColor: "hsl(var(--sq-orange) / 0.25)"
        }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--sq-orange))" }} />
          <span className="font-bold text-sm tracking-wide" style={{ color: "hsl(var(--sq-orange))" }}>
            India-first · Seed Round 2026
          </span>
        </div>

        {/* H1 — what it is, who it's for, why it matters */}
        <h1
          className={`font-black text-white tracking-tight leading-[0.97] ${
            isPresenter ? "text-8xl" : "text-[3.5rem] sm:text-[4.5rem] lg:text-[6rem]"
          }`}
        >
          Consumer brands are<br />
          making <span style={{ color: "hsl(var(--sq-orange))" }}>₹10Cr decisions</span><br />
          on gut feel.
        </h1>

        {/* One-liner — product in one breath */}
        <p className={`text-white/50 leading-relaxed max-w-2xl mx-auto ${isPresenter ? "text-2xl" : "text-lg sm:text-xl"}`}>
          SquareUp runs AI-led customer interviews and turns them into{" "}
          <span className="text-white font-bold">a decision-ready Insight Brief — in 7 days, not 7 weeks.</span>
          <br className="hidden sm:block" />
          
        </p>

        {/* Stat chips */}
        {!isPresenter && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {["<90 days — Idea to LOI", "50+ Leaders Interviewed", "MVP Live"].map((chip) => (
              <span key={chip} className="rounded-full px-3 py-1 font-bold text-xs"
                style={{
                  background: "hsl(var(--sq-orange) / 0.08)",
                  border: "1px solid hsl(var(--sq-orange) / 0.2)",
                  color: "hsl(var(--sq-orange))"
                }}>
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* CTAs */}
        {!isPresenter && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://almost.joinsquareup.com"
              target="_blank"
              rel="noopener noreferrer"
              className="border text-white font-bold px-7 py-3.5 rounded-full transition-all hover:bg-white/5 text-sm"
              style={{ borderColor: "hsl(var(--sq-orange) / 0.4)", color: "hsl(var(--sq-orange))" }}
            >
              See Live Demo →
            </a>
            <a
              href="mailto:hello@joinsquareup.com"
              className="text-white font-bold px-7 py-3.5 rounded-full transition-colors text-sm shadow-lg"
              style={{
                background: "hsl(var(--sq-orange))",
                boxShadow: "0 8px 24px hsl(var(--sq-orange) / 0.35)"
              }}
            >
              Book 20 Minutes
            </a>
          </div>
        )}

      </div>

      {!isPresenter && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-chevron">
          <ChevronDown className="text-white/20" size={24} />
        </div>
      )}
    </section>
  );
}
