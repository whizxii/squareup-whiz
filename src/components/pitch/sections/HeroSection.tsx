import { ChevronDown } from "lucide-react";
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
      {/* Animated blobs */}
      {!isPresenter && (
        <>
          <div
            className="animate-blob-1 absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(18,100%,60%) 0%, transparent 70%)", opacity: 0.08 }}
          />
          <div
            className="animate-blob-2 absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(35,100%,65%) 0%, transparent 70%)", opacity: 0.07 }}
          />
        </>
      )}

      <div className={`relative z-10 max-w-4xl mx-auto ${isPresenter ? "space-y-8" : "space-y-6"}`}>
        {/* Logo placeholder (gif would load from assets) */}
        <div className="flex justify-center mb-2">
          <div className="w-16 h-16 rounded-2xl bg-sq-orange flex items-center justify-center shadow-lg shadow-sq-orange/30">
            <span className="text-white font-black text-2xl">S</span>
          </div>
        </div>

        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 bg-sq-orange/15 border border-sq-orange/30 rounded-full px-4 py-1.5">
          <span className="w-2 h-2 rounded-full bg-sq-orange animate-pulse" />
          <span className="text-sq-orange font-bold text-sm tracking-wide">
            AI Customer Intelligence · Seed Round 2026
          </span>
        </div>

        {/* H1 */}
        <h1
          className={`font-black text-white tracking-tight leading-[1.02] ${
            isPresenter ? "text-8xl" : "text-5xl sm:text-6xl lg:text-7xl"
          }`}
        >
          Stop Building on<br />
          <span className="text-sq-orange">Intuition.</span>
        </h1>

        {/* Sub */}
        <p
          className={`text-white/60 leading-relaxed max-w-2xl mx-auto ${
            isPresenter ? "text-2xl" : "text-lg sm:text-xl"
          }`}
        >
          SquareUp turns customer conversations into decision-grade intelligence —
          in <span className="text-white font-bold">7 days</span>, not 7 weeks.
        </p>

        {/* CTAs */}
        {!isPresenter && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a
              href="https://almost.joinsquareup.com"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/30 hover:border-white/60 text-white font-bold px-6 py-3 rounded-full transition-all hover:bg-white/5"
            >
              Watch Demo →
            </a>
            <a
              href="mailto:hello@joinsquareup.com"
              className="bg-sq-orange hover:bg-sq-amber text-white font-bold px-6 py-3 rounded-full transition-colors shadow-lg shadow-sq-orange/25"
            >
              Book a Meeting
            </a>
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      {!isPresenter && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-chevron">
          <ChevronDown className="text-white/30" size={28} />
        </div>
      )}
    </section>
  );
}
