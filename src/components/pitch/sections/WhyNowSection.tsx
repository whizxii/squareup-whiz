import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const PILLARS = [
  {
    num: "01",
    icon: "🤖",
    title: "AI crossed the threshold",
    body: "LLMs can now conduct human-quality interviews at scale, at cents per conversation. The technology to make this possible didn't exist 2 years ago. The window just opened.",
  },
  {
    num: "02",
    icon: "💸",
    title: "Teams are making ₹10Cr decisions with ₹0 of real customer signal",
    body: "Consumer brands across QSR, platforms, and direct channels are scaling faster than their customer understanding. One wrong launch doesn't just fail — it burns runway and credibility.",
  },
  {
    num: "03",
    icon: "🐢",
    title: "Research firms are being disrupted",
    body: "6–8 week timelines. $50K+ price tags. Findings that arrive after the decision was already made. The old model of outsourcing customer understanding is incompatible with how fast consumer brands move.",
  },
];

export default function WhyNowSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="whynow"
      className={`bg-sq-off-white ${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>
        <h2
          className={`font-black text-sq-text tracking-tight leading-tight text-center mb-14 ${
            isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"
          } ${revealed ? "animate-fade-up" : "opacity-0"}`}
        >
          Three forces converging.{" "}
          <span className="text-sq-orange">Right now.</span>
        </h2>

        <div className="space-y-6">
          {PILLARS.map((p, i) => (
            <div
              key={p.num}
              className={`relative bg-sq-card rounded-2xl p-8 border border-sq-subtle overflow-hidden transition-all duration-600 ${
                revealed ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
              }`}
              style={{ transitionDelay: `${i * 180}ms` }}
            >
              {/* Background number */}
              <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-8xl text-sq-orange/8 select-none pointer-events-none">
                {p.num}
              </span>

              <div className="relative z-10 flex items-start gap-5">
                <span className="text-3xl flex-shrink-0">{p.icon}</span>
                <div>
                  <h3 className={`font-black text-sq-text leading-snug mb-2 ${isPresenter ? "text-2xl" : "text-xl"}`}>
                    {p.title}
                  </h3>
                  <p className="text-sq-muted leading-relaxed text-sm sm:text-base">{p.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
