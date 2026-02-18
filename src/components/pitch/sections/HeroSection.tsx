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
            className="animate-blob-1 absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(var(--sq-orange)) 0%, transparent 70%)", opacity: 0.07 }}
          />
          <div
            className="animate-blob-2 absolute bottom-1/3 right-1/4 w-[450px] h-[450px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, hsl(var(--sq-amber)) 0%, transparent 70%)", opacity: 0.05 }}
          />
        </>
      )}

      <div className={`relative z-10 max-w-5xl mx-auto ${isPresenter ? "space-y-10" : "space-y-7"}`}>
        {/* Wordmark */}
        <div className="flex justify-center mb-2">
          <div className="text-white font-black text-2xl tracking-tight">
            Square<span style={{ color: "hsl(var(--sq-orange))" }}>Up</span>
          </div>
        </div>

        {/* Status pill */}
        <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 border" style={{
          background: "hsl(var(--sq-orange) / 0.08)",
          borderColor: "hsl(var(--sq-orange) / 0.25)"
        }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--sq-orange))" }} />
          <span className="font-bold text-sm tracking-wide" style={{ color: "hsl(var(--sq-orange))" }}>
            AI Customer Intelligence · Seed Round 2026
          </span>
        </div>

        {/* H1 — editorial, not AI */}
        <h1
          className={`font-black text-white tracking-tight leading-[0.97] ${
            isPresenter ? "text-8xl" : "text-[3.5rem] sm:text-[4.5rem] lg:text-[6rem]"
          }`}
        >
          Consumer brands<br />
          are making <span style={{ color: "hsl(var(--sq-orange))" }}>₹10Cr</span><br />
          decisions with <span className="italic text-white/50">₹0</span> of<br />
          real customer signal.
        </h1>

        {/* One-liner */}
        <p
          className={`text-white/50 leading-relaxed max-w-xl mx-auto ${
            isPresenter ? "text-2xl" : "text-lg sm:text-xl"
          }`}
        >
          SquareUp fixes that. Customer conversations →<br />
          <span className="text-white font-bold">decision-grade insight in 7 days.</span>
        </p>

        {/* CTAs */}
        {!isPresenter && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
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

        {/* Scroll proof */}
        {!isPresenter && (
          <p className="text-white/20 text-xs font-medium pt-4">
            3 LOIs · 50+ leaders interviewed · MVP shipped in 15 days
          </p>
        )}
      </div>

      {/* Scroll indicator */}
      {!isPresenter && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-chevron">
          <ChevronDown className="text-white/20" size={24} />
        </div>
      )}
    </section>
  );
}
