import type { SlideMode } from "@/lib/slides";

export default function CTASection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";

  return (
    <section
      id="cta"
      className={`relative bg-sq-dark overflow-hidden ${isPresenter ? "h-full flex items-center justify-center" : "py-24 px-6"}`}
    >
      {/* Blob */}
      <div
        className="animate-blob-1 absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(18,100%,60%) 0%, transparent 70%)", opacity: 0.07 }}
      />

      <div className="relative z-10 text-center max-w-2xl mx-auto space-y-6">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-sq-orange flex items-center justify-center shadow-xl shadow-sq-orange/30">
            <span className="text-white font-black text-2xl">S</span>
          </div>
        </div>

        <h2 className={`font-black text-white tracking-tight leading-tight ${isPresenter ? "text-6xl" : "text-4xl sm:text-5xl"}`}>
          Curious? Let's talk.
        </h2>

        <p className="text-white/50 text-lg">
          We'd love 20 minutes to show you what we're building.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <a
            href="mailto:hello@joinsquareup.com"
            className="bg-sq-orange hover:bg-sq-amber text-white font-bold px-8 py-3.5 rounded-full transition-colors shadow-lg shadow-sq-orange/25 text-base"
          >
            Book a Meeting
          </a>
          <a
            href="mailto:hello@joinsquareup.com"
            className="border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-bold px-8 py-3.5 rounded-full transition-all hover:bg-white/5 text-base"
          >
            Email Us
          </a>
        </div>

        {/* Footer */}
        <p className="text-white/25 text-xs pt-8">
          joinsquareup.com · © 2026 SquareUp
        </p>
      </div>
    </section>
  );
}
