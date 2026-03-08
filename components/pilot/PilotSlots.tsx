"use client";

import { useRef, useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";
import Reveal from "@/components/ui/Reveal";

const TOTAL_SLOTS = 4;
const FILLED_SLOTS = 2;
const OPEN_SLOTS = TOTAL_SLOTS - FILLED_SLOTS;

const BLEED_COLOR = "#FF5A36";

export default function PilotSlots() {
  const sectionRef = useRef<HTMLDivElement>(null);

  /* ── bleed limits (responsive) ── */
  const [bleedLimits, setBleedLimits] = useState({ maxTop: 720, maxBottom: 360 });
  useEffect(() => {
    const h = window.innerHeight;
    setBleedLimits({
      maxTop: Math.min(720, h * 0.68),
      maxBottom: Math.min(360, h * 0.36),
    });
  }, []);

  /* ── scroll-driven bleed progress ── */
  const { scrollYProgress: bleedProgress } = useScroll({
    target: sectionRef,
    offset: ["start 1.3", "end -0.3"],
  });

  const bleedSpring = { stiffness: 180, damping: 35, mass: 0.3 };

  const { maxTop, maxBottom } = bleedLimits;
  const rawTopHeight = useTransform(bleedProgress, [0, 0.06, 0.85, 1], [0, maxTop, maxTop, 0]);
  const rawBottomHeight = useTransform(bleedProgress, [0, 0.06, 0.88, 1], [0, maxBottom, maxBottom, 0]);
  const rawBleedOpacity = useTransform(bleedProgress, [0, 0.03, 0.83, 1], [0, 1, 1, 0]);

  const topBleedHeight = useSpring(rawTopHeight, bleedSpring);
  const bottomBleedHeight = useSpring(rawBottomHeight, bleedSpring);
  const bleedOpacity = useSpring(rawBleedOpacity, bleedSpring);

  const topBleedOffset = useTransform(topBleedHeight, (v: number) => -v);
  const topBleedHeightExtended = useTransform(topBleedHeight, (v: number) => v + 3);
  const bottomBleedOffset = useTransform(bottomBleedHeight, (v: number) => -v);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-visible py-12 sm:py-16 lg:py-20"
      style={{ backgroundColor: BLEED_COLOR, zIndex: 0 }}
    >
      {/* ── top bleed gradient ── */}
      <motion.div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: topBleedOffset,
          height: topBleedHeightExtended,
          opacity: bleedOpacity,
          background: `linear-gradient(to bottom, transparent 0%, rgba(255,90,54,0.005) 12%, rgba(255,90,54,0.03) 24%, rgba(255,90,54,0.10) 36%, rgba(255,90,54,0.22) 48%, rgba(255,90,54,0.40) 60%, rgba(255,90,54,0.62) 72%, rgba(255,90,54,0.82) 84%, ${BLEED_COLOR} 100%)`,
          willChange: "transform, opacity",
        }}
      />

      {/* ── bottom bleed gradient ── */}
      <motion.div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          bottom: bottomBleedOffset,
          height: bottomBleedHeight,
          opacity: bleedOpacity,
          background: `linear-gradient(to top, transparent 0%, rgba(255,90,54,0.005) 12%, rgba(255,90,54,0.03) 24%, rgba(255,90,54,0.10) 36%, rgba(255,90,54,0.22) 48%, rgba(255,90,54,0.40) 60%, rgba(255,90,54,0.62) 72%, rgba(255,90,54,0.82) 84%, ${BLEED_COLOR} 100%)`,
          willChange: "transform, opacity",
        }}
      />

      {/* ── left side line ── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: "clamp(24px, 5vw, 80px)",
          top: topBleedOffset,
          bottom: bottomBleedOffset,
          width: "1px",
          opacity: bleedOpacity,
          filter: "blur(0.5px)",
          willChange: "transform, opacity",
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(33,33,33,0.15) 3%, transparent 12%, transparent 88%, rgba(33,33,33,0.15) 97%, transparent 100%)",
        }}
      />

      {/* ── right side line ── */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          right: "clamp(24px, 5vw, 80px)",
          top: topBleedOffset,
          bottom: bottomBleedOffset,
          width: "1px",
          opacity: bleedOpacity,
          filter: "blur(0.5px)",
          willChange: "transform, opacity",
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(33,33,33,0.15) 3%, transparent 12%, transparent 88%, rgba(33,33,33,0.15) 97%, transparent 100%)",
        }}
      />

      {/* ── content ── */}
      <div className="relative z-10 max-w-[800px] mx-auto px-5 sm:px-6 lg:px-10 text-center">
        {/* Proven badge */}
        <Reveal width="100%" delay={0}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-white">
              Slots filling up
            </span>
          </div>
        </Reveal>

        <Reveal width="100%" delay={0.04}>
          <h2 className="font-display text-[clamp(24px,6vw,48px)] tracking-[-0.03em] text-white leading-[1.1]">
            Your first study ships
            <br className="hidden sm:block" /> in 48 hours. Then you decide.
          </h2>
        </Reveal>

        <Reveal width="100%" delay={0.1}>
          <p className="mt-4 text-base sm:text-lg text-white/80 max-w-[560px] mx-auto">
            The pilot is a single study on a real decision. If the brief
            changes how your team thinks, we keep going. If it doesn&rsquo;t,
            you walk away — no contracts, no obligations.
          </p>
        </Reveal>

        {/* Slot indicators */}
        <Reveal width="100%" delay={0.16}>
          <div className="mt-8 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 border border-white/15">
            <div className="flex gap-2">
              {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < FILLED_SLOTS
                      ? "bg-white/30"
                      : "bg-white/80 animate-pulse"
                  }`}
                  style={
                    i >= FILLED_SLOTS
                      ? { animationDelay: `${(i - FILLED_SLOTS) * 0.4}s` }
                      : undefined
                  }
                />
              ))}
            </div>
            <span className="text-sm font-bold text-white ml-2">
              {OPEN_SLOTS} of {TOTAL_SLOTS} slots left
            </span>
          </div>
        </Reveal>

        <Reveal width="100%" delay={0.2}>
          <p className="mt-5 text-sm text-white/50">
            Each pilot is hands-on. We only take {TOTAL_SLOTS} at a time to
            guarantee quality.
          </p>
        </Reveal>

        <Reveal width="100%" delay={0.24}>
          <a
            href="https://cal.com/squareup-ai/discovery-setup-call"
            className="inline-flex items-center justify-center mt-8 bg-white text-lime rounded-xl font-display text-base min-h-[56px] w-full sm:w-auto sm:min-w-[240px] px-8 hover:shadow-lg active:scale-[0.97] transition-all"
          >
            Claim your pilot slot →
          </a>
        </Reveal>
      </div>
    </section>
  );
}
