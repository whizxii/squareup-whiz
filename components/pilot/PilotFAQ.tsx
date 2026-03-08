"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Reveal from "@/components/ui/Reveal";

const FAQS = [
  {
    q: "How is this different from agencies or research tools?",
    a: "Agencies are high quality but slow. Tools organize what you already have. SquareUp goes and gets fresh customer signal and ships the decision brief fast.",
  },
  {
    q: "Do you need my customer data?",
    a: "Yes. We need access to your customer list so we can reach the right people directly. The more specific the list, the sharper the insights. We handle outreach, scheduling, and consent — you just share the data.",
  },
  {
    q: "Is this AI-only, or human-led?",
    a: "Your choice. If your team wants to run the interviews, we set everything up and you take the calls. If you would rather not, our AI runs autonomous calls end-to-end. Either way, you get the same decision-ready brief.",
  },
  {
    q: "What if the findings are inconclusive?",
    a: "We call that out explicitly. The brief includes \u201Cwhat we know\u201D and \u201Cwhat we do not know yet\u201D so your team does not over-read the signal. Honest evidence beats confident guesses.",
  },
  {
    q: "How many interviews do you do in a pilot?",
    a: "It depends on the study. We use a mix of call types — from 2-minute quick pulses to 60-minute deep dives — based on what the decision needs. We scope the exact mix on the discovery call so you know what you are getting before you commit.",
  },
  {
    q: "Can I see the full transcripts?",
    a: "Yes. Every interview comes with a timestamped transcript and the original recording. You can audit any quote or recommendation back to the source.",
  },
];

export default function PilotFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="faq" className="py-12 sm:py-16 lg:py-20">
      <div className="max-w-[800px] mx-auto px-5 sm:px-6 lg:px-10">
        <div className="text-center mb-10 sm:mb-12">
          <Reveal width="100%" delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime/[0.08] border border-lime/15 mb-5">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-lime">
                Before you book
              </span>
            </div>
          </Reveal>
          <Reveal width="100%" delay={0.06}>
            <h2 className="font-display text-[clamp(24px,5vw,48px)] tracking-[-0.03em] text-maze-black leading-[1.1]">
              Still thinking it through?
            </h2>
          </Reveal>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <Reveal key={i} width="100%" delay={0.1 + i * 0.05}>
              <div className="rounded-2xl bg-white border border-neutral-200 overflow-hidden">
                <button
                  onClick={() => toggle(i)}
                  className="w-full px-5 py-4 min-h-[56px] flex items-center justify-between gap-4 cursor-pointer active:bg-neutral-50 transition-colors text-left"
                >
                  <span className="text-[15px] sm:text-base font-semibold text-maze-black">
                    {faq.q}
                  </span>
                  <motion.div
                    animate={{ rotate: openIndex === i ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className="w-5 h-5 text-maze-gray" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        height: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
                        opacity: { duration: 0.2, delay: 0.05 },
                      }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-[15px] sm:text-base text-maze-gray leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
