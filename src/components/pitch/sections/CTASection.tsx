import type { SlideMode } from "@/lib/slides";
import iconSvg from "@/assets/icon.svg";

export default function CTASection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";

  return (
    <section
      id="cta"
      className={`relative overflow-hidden ${isPresenter ? "h-full flex items-center justify-center" : "py-32 px-6"}`}
      style={{ background: "hsl(var(--sq-card))" }}
    >
      {/* Warm subtle blobs */}
      <div className="animate-blob-1 absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--sq-orange)) 0%, transparent 70%)", opacity: 0.05 }} />
      <div className="animate-blob-2 absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--sq-amber)) 0%, transparent 70%)", opacity: 0.04 }} />

      <div className="relative z-10 text-center max-w-2xl mx-auto">

        {/* Logo mark */}
        <div className="mb-10 flex items-center justify-center gap-2">
          <img src={iconSvg} alt="SquareUp" className="h-7 w-auto" />
          <span className="font-black text-xl tracking-tight" style={{ color: "hsl(var(--sq-text))" }}>
            Square<span style={{ color: "hsl(var(--sq-orange))" }}>Up</span>
          </span>
        </div>

        <h2
          className={`font-black tracking-tight leading-tight mb-5 ${isPresenter ? "text-6xl" : "text-4xl sm:text-5xl"}`}
          style={{ color: "hsl(var(--sq-text))" }}
        >
          3 LOIs. A live product.<br />
          <span style={{ color: "hsl(var(--sq-orange))" }}>20 minutes of your time.</span>
        </h2>

        <p className={`mb-10 font-medium ${isPresenter ? "text-xl" : "text-base sm:text-lg"}`}
          style={{ color: "hsl(var(--sq-muted))" }}>
          We'll show you the product with real data from our design partner sessions.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
          <a
            href="mailto:hello@joinsquareup.com"
            className="font-bold px-10 py-4 rounded-full text-white transition-all hover:opacity-90"
            style={{
              background: "hsl(var(--sq-orange))",
              boxShadow: "0 12px 36px hsl(var(--sq-orange) / 0.28)"
            }}
          >
            Book 20 Minutes →
          </a>
          <a
            href="https://almost.joinsquareup.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold px-10 py-4 rounded-full transition-all hover:opacity-70"
            style={{
              border: "1.5px solid hsl(var(--sq-subtle))",
              color: "hsl(var(--sq-text))"
            }}
          >
            See Live Demo
          </a>
        </div>

        {/* Stats recap */}
        <div className="flex items-center justify-center gap-10 flex-wrap mb-10">
          {[
            { val: "3", label: "LOIs signed" },
            { val: "50+", label: "leaders interviewed" },
            { val: "<90 days", label: "idea to here" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-black text-2xl" style={{ color: "hsl(var(--sq-orange))" }}>{s.val}</div>
              <div className="text-xs font-semibold mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <p className="text-xs font-medium" style={{ color: "hsl(var(--sq-muted) / 0.5)" }}>
          joinsquareup.com · hello@joinsquareup.com · © 2026 SquareUp
        </p>
      </div>
    </section>
  );
}
