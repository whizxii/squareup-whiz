"use client";

import Reveal from "@/components/ui/Reveal";

const PILLS = [
  "Launch and price-pack decisions",
  "Messaging and positioning that isn't landing",
  "Repeat and retention problems",
  "CX issues that keep resurfacing",
];

export default function WhoThisIsFor() {
  return (
    <section id="who-this-is-for" className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-[1000px] mx-auto px-5 sm:px-6 lg:px-10 text-center">
        <Reveal width="100%" delay={0}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime/[0.08] border border-lime/15 mb-5">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-lime">
              Who this is for
            </span>
          </div>
        </Reveal>

        <Reveal width="100%" delay={0.06}>
          <h2 className="font-display text-[clamp(24px,5vw,48px)] tracking-[-0.03em] text-maze-black leading-[1.1]">
            For consumer teams making
            <br className="hidden sm:block" /> high-stakes decisions
          </h2>
        </Reveal>

        <div className="flex flex-wrap gap-3 justify-center mt-8">
          {PILLS.map((pill, i) => (
            <Reveal key={pill} delay={0.12 + i * 0.06}>
              <span className="feature-pill min-h-[48px] flex items-center cursor-default active:scale-[0.97] transition-transform">
                {pill}
              </span>
            </Reveal>
          ))}
        </div>

        <Reveal width="100%" delay={0.4}>
          <p className="mt-6 text-sm text-maze-gray">
            Best fit if the decision is in the next 2–3 weeks.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
