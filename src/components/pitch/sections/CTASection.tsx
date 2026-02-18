import type { SlideMode } from "@/lib/slides";
import iconSvg from "@/assets/icon.svg";

export default function CTASection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";

  return (
    <section
      id="cta"
      className={`relative overflow-hidden ${isPresenter ? "h-full flex items-center justify-center" : "py-32 px-6"}`}
      style={{ background: "hsl(var(--sq-dark))" }}
    >
      <div
        className="animate-blob-1 absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--sq-orange)) 0%, transparent 70%)", opacity: 0.07 }}
      />
      <div
        className="animate-blob-2 absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--sq-amber)) 0%, transparent 70%)", opacity: 0.05 }}
      />

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <img src={iconSvg} alt="SquareUp" className="h-8 w-auto" />
          <span className="text-white font-black text-2xl tracking-tight">
            Square<span style={{ color: "hsl(var(--sq-orange))" }}>Up</span>
          </span>
        </div>

        <h2
          className={`font-black text-white tracking-tight leading-tight mb-4 ${isPresenter ? "text-6xl" : "text-4xl sm:text-5xl"}`}
        >
          We have 3 LOIs,<br />
          <span style={{ color: "hsl(var(--sq-orange))" }}>a live product, and 20 minutes.</span>
        </h2>

        <p className="text-lg mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>
          Book a call. We'll show you the product with real data<br />from our design partner sessions.
        </p>
        <p className="text-sm mb-10 font-medium" style={{ color: "hsl(var(--sq-orange) / 0.7)" }}>
          Built in India · For the world's consumer brands.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <a
            href="mailto:hello@joinsquareup.com"
            className="text-white font-bold px-8 py-4 rounded-full transition-colors text-base"
            style={{
              background: "hsl(var(--sq-orange))",
              boxShadow: "0 10px 30px hsl(var(--sq-orange) / 0.35)"
            }}
          >
            Book 20 Minutes →
          </a>
          <a
            href="https://almost.joinsquareup.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold px-8 py-4 rounded-full transition-all text-base"
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.7)"
            }}
          >
            See Live Demo
          </a>
        </div>

        {/* Stats recap */}
        <div className="flex items-center justify-center gap-8 flex-wrap mb-10">
          {[
            { val: "3", label: "LOIs signed" },
            { val: "50+", label: "leaders interviewed" },
            { val: "<90", label: "days to here" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-black text-2xl text-white">{s.val}</div>
              <div className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          joinsquareup.com · hello@joinsquareup.com · © 2026 SquareUp
        </p>
      </div>
    </section>
  );
}
