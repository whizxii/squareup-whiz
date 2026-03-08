"use client";

import Reveal from "@/components/ui/Reveal";

const COMPARISONS = [
  {
    label: "Traditional agency",
    time: "6–8 weeks",
    cost: "₹5–50L",
  },
  {
    label: "SquareUp pilot",
    time: "2 days",
    cost: "10x less",
    highlight: true,
  },
];

export default function PilotPricing() {
  return (
    <section id="pricing" className="py-12 sm:py-16 lg:py-20 pb-16 sm:pb-20 lg:pb-24">
      <div className="max-w-[900px] mx-auto px-5 sm:px-6 lg:px-10">
        {/* ── Card wrapper ── */}
        <div
          className="relative z-20 rounded-3xl px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0.98) 100%)",
            backdropFilter: "blur(48px) saturate(1.8)",
            WebkitBackdropFilter: "blur(48px) saturate(1.8)",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "0 24px 80px -12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.9)",
          }}
        >
          <div className="text-center mb-10 sm:mb-12">
            <Reveal width="100%" delay={0}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime/[0.08] border border-lime/15 mb-5">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-lime">
                  Investment
                </span>
              </div>
            </Reveal>
            <Reveal width="100%" delay={0.06}>
              <h2 className="font-display text-[clamp(24px,5vw,48px)] tracking-[-0.03em] text-maze-black leading-[1.1]">
                Priced so the decision
                <br className="hidden sm:block" /> is easy.
              </h2>
            </Reveal>
            <Reveal width="100%" delay={0.12}>
              <p className="mt-4 text-base sm:text-lg text-maze-gray max-w-[560px] mx-auto leading-relaxed">
                One bad launch costs more than ten studies. The pilot is priced for
                you to test us on a real decision with real stakes — and see the
                ROI before committing further.
              </p>
            </Reveal>
          </div>

          {/* Comparison cards */}
          <Reveal width="100%" delay={0.18}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-[700px] mx-auto">
              {COMPARISONS.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl p-5 sm:p-6 text-center ${
                    item.highlight
                      ? "bg-lime text-white"
                      : "bg-neutral-100 text-maze-black"
                  }`}
                  style={{ minHeight: "160px" }}
                >
                  <p
                    className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-3 ${
                      item.highlight ? "text-white/70" : "text-maze-gray"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p
                    className={`font-display text-2xl sm:text-3xl font-bold ${
                      item.highlight ? "text-white" : "text-maze-black"
                    }`}
                  >
                    {item.cost}
                  </p>
                  <p
                    className={`mt-2 text-sm font-medium ${
                      item.highlight ? "text-white/80" : "text-maze-gray"
                    }`}
                  >
                    {item.time}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Trust lines */}
          <Reveal width="100%" delay={0.24}>
            <div className="mt-8 sm:mt-10 text-center space-y-3">
              <p className="text-sm sm:text-base text-maze-black font-semibold">
                We will scope it on the call and give you a number upfront.
              </p>
              <p className="text-sm text-maze-gray">
                No hidden fees. No multi-month lock-ins. Pay per study.
              </p>
            </div>
          </Reveal>

          {/* CTA */}
          <Reveal width="100%" delay={0.3}>
            <div className="mt-8 flex justify-center">
              <a
                href="https://cal.com/squareup-ai/discovery-setup-call"
                className="min-h-[56px] w-full sm:w-auto sm:min-w-[280px] px-6 py-3 text-base font-display tracking-[-0.02em] text-white bg-maze-black rounded-xl hover:bg-black active:scale-[0.97] transition-all flex items-center justify-center"
              >
                Get a quote in 20 minutes
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
