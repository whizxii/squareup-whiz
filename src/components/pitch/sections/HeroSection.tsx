import { ChevronDown } from "lucide-react";
import iconSvg from "@/assets/icon.svg";
import type { SlideMode } from "@/lib/slides";

interface HeroSectionProps { mode?: SlideMode; }

export default function HeroSection({ mode = "detailed" }: HeroSectionProps) {
  const isPresenter = mode === "presenter";

  return (
    <section
      id="hero"
      className={`relative overflow-hidden flex flex-col items-center justify-center text-center ${
        isPresenter ? "h-full px-24" : "min-h-screen px-6"
      }`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      {/* Subtle warm blobs — light mode */}
      <div className="animate-blob-1 absolute top-1/4 left-1/4 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--sq-orange)) 0%, transparent 70%)", opacity: 0.06 }} />
      <div className="animate-blob-2 absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--sq-amber)) 0%, transparent 70%)", opacity: 0.04 }} />

      <div className={`relative z-10 max-w-4xl mx-auto ${isPresenter ? "space-y-10" : "space-y-8"}`}>

        {/* Status pill */}
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
          style={{
            background: "hsl(var(--sq-orange) / 0.08)",
            border: "1px solid hsl(var(--sq-orange) / 0.2)"
          }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--sq-orange))" }} />
          <span className="font-bold text-xs tracking-widest uppercase" style={{ color: "hsl(var(--sq-orange))" }}>
            Seed Round 2026 · India-first
          </span>
        </div>

        {/* Main headline — the entire story in 2 lines */}
        <h1
          className={`font-black tracking-tight leading-[0.95] ${
            isPresenter ? "text-8xl" : "text-[3rem] sm:text-[4rem] lg:text-[5.5rem]"
          }`}
          style={{ color: "hsl(var(--sq-text))" }}
        >
          Consumer brands make<br />
          <span style={{ color: "hsl(var(--sq-orange))" }}>₹10Cr decisions</span> on gut feel.
        </h1>

        {/* One-liner */}
        <p className={`leading-relaxed max-w-xl mx-auto font-medium ${isPresenter ? "text-2xl" : "text-lg sm:text-xl"}`}
          style={{ color: "hsl(var(--sq-muted))" }}>
          SquareUp runs AI-led customer interviews and turns them into a{" "}
          <span style={{ color: "hsl(var(--sq-text))" }} className="font-bold">decision-ready brief in 7 days.</span>
        </p>

        {/* Proof chips */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {["3 LOIs Signed", "50+ Leaders Interviewed", "MVP Live"].map((chip) => (
            <span key={chip} className="rounded-full px-4 py-1.5 font-bold text-xs"
              style={{
                background: "hsl(var(--sq-off-white))",
                border: "1px solid hsl(var(--sq-subtle))",
                color: "hsl(var(--sq-text))"
              }}>
              {chip}
            </span>
          ))}
        </div>

        {/* CTAs */}
        {!isPresenter && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a
              href="mailto:hello@joinsquareup.com"
              className="font-bold px-8 py-3.5 rounded-full text-sm text-white transition-all hover:opacity-90"
              style={{
                background: "hsl(var(--sq-orange))",
                boxShadow: "0 8px 28px hsl(var(--sq-orange) / 0.3)"
              }}
            >
              Book 20 Minutes
            </a>
            <a
              href="https://almost.joinsquareup.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold px-8 py-3.5 rounded-full text-sm transition-all hover:opacity-70"
              style={{
                border: "1.5px solid hsl(var(--sq-subtle))",
                color: "hsl(var(--sq-text))"
              }}
            >
              See Live Demo →
            </a>
          </div>
        )}
      </div>

      {!isPresenter && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-chevron">
          <ChevronDown size={20} style={{ color: "hsl(var(--sq-muted) / 0.4)" }} />
        </div>
      )}
    </section>
  );
}
