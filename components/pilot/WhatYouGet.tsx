"use client";

import { CheckCircle2 } from "lucide-react";
import Reveal from "@/components/ui/Reveal";

const GLASS_STYLE = {
  background:
    "linear-gradient(160deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.22) 40%, rgba(255,255,255,0.18) 60%, rgba(255,255,255,0.30) 100%)",
  backdropFilter: "blur(48px) saturate(2.0)",
  WebkitBackdropFilter: "blur(48px) saturate(2.0)",
  border: "1px solid rgba(255,255,255,0.55)",
  boxShadow:
    "0 16px 56px -8px rgba(0,0,0,0.08), 0 6px 20px rgba(0,0,0,0.03), inset 0 1px 1px rgba(255,255,255,0.90), inset 0 -1px 1px rgba(0,0,0,0.04)",
};

const BRIEF_ITEMS = [
  "Answer-first takeaways with confidence scores",
  '"What to do this week" assigned by owner',
  "Verbatim quotes with timecodes",
  "Evidence index plus contradictions flagged",
];

const EVIDENCE_ITEMS = [
  "Full call recordings and transcripts",
  "Searchable themes across all interviews",
  "Severity scores and risk flags",
];

export default function WhatYouGet({
  onShowBrief,
}: {
  onShowBrief: () => void;
}) {
  return (
    <section className="py-16 sm:py-20 lg:py-28">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-10">
        <div className="text-center mb-10 sm:mb-12">
          <Reveal width="100%" delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime/[0.08] border border-lime/15 mb-5">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-lime">
                What you get
              </span>
            </div>
          </Reveal>
          <Reveal width="100%" delay={0.06}>
            <h2 className="font-display text-[clamp(24px,5vw,48px)] tracking-[-0.03em] text-maze-black leading-[1.1]">
              A decision-ready brief,
              <br className="hidden sm:block" /> not a dashboard.
            </h2>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8">
          {/* Card 1 — Executive Brief */}
          <Reveal width="100%" delay={0.1}>
            <div
              className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 transition-all duration-300 flex flex-col"
              style={{ ...GLASS_STYLE, minHeight: "320px" }}
            >
              <span className="inline-block text-[10px] uppercase tracking-[0.15em] font-bold px-3 py-1 rounded-full bg-lime/10 text-lime self-start">
                Client-ready
              </span>
              <h3 className="font-display text-xl font-bold text-maze-black mt-3">
                Executive Brief
              </h3>
              <div className="mt-4 space-y-0 flex-1">
                {BRIEF_ITEMS.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 min-h-[44px]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-lime flex-shrink-0" />
                    <span className="text-[15px] sm:text-base text-maze-black">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Card 2 — Evidence Pack */}
          <Reveal width="100%" delay={0.2}>
            <div
              className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 transition-all duration-300 flex flex-col"
              style={{ ...GLASS_STYLE, minHeight: "320px" }}
            >
              <span className="inline-block text-[10px] uppercase tracking-[0.15em] font-bold px-3 py-1 rounded-full bg-lime/10 text-lime self-start">
                Evidence pack
              </span>
              <h3 className="font-display text-xl font-bold text-maze-black mt-3">
                Evidence Pack
              </h3>
              <div className="mt-4 space-y-0 flex-1">
                {EVIDENCE_ITEMS.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 min-h-[44px]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-lime flex-shrink-0" />
                    <span className="text-[15px] sm:text-base text-maze-black">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* See a sample brief + audit line */}
        <Reveal width="100%" delay={0.3}>
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              onClick={onShowBrief}
              className="min-h-[48px] px-6 py-2.5 text-sm font-display tracking-[-0.02em] text-maze-black border border-neutral-300 rounded-full hover:border-maze-black hover:bg-white/80 backdrop-blur-sm active:scale-[0.97] transition-all"
            >
              See a sample brief →
            </button>
            <p className="text-sm text-maze-gray">
              No black-box insights. You can audit the trail.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
