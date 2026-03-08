"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Reveal from "@/components/ui/Reveal";

const SAMPLE_RECORDING_URL = "/titan-sample-recording.mp3";
const STEP_DURATION = 5000;

const STEPS = [
  {
    num: "01",
    title: "Define",
    body: "You share the question you need answered and your customer list. We lock the interview guide within hours.",
  },
  {
    num: "02",
    title: "Interview",
    body: "We reach out directly and run deep 1:1 conversations in natural Hindi, English, or Hinglish.",
  },
  {
    num: "03",
    title: "Deliver",
    body: "In 48 hours you receive a decision-ready brief with evidence you can audit and forward to your team.",
  },
];

/* ─── Audio Player ─── */
function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setDuration(audio.duration);
    const onTime = () => {
      setCurrentTime(audio.duration ? audio.currentTime : 0);
      setProgress(
        audio.duration ? (audio.currentTime / audio.duration) * 100 : 0
      );
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    playing ? audio.pause() : audio.play();
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-lime/[0.12]"
      style={{ background: "linear-gradient(135deg, rgba(255,90,54,0.04) 0%, rgba(255,90,54,0.01) 100%)" }}>
      <audio ref={audioRef} preload="metadata" src={SAMPLE_RECORDING_URL} />

      <div className="px-5 pt-4 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-lime/70 mb-0.5">
          Listen to a real interview
        </p>
        <p className="text-[13px] text-maze-gray">
          From a recent MOM test pilot study for a perfume brand
        </p>
      </div>

      <div className="px-5 pb-5 pt-3 flex items-center gap-4">
        <button
          onClick={toggle}
          className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            playing
              ? "bg-maze-black text-white"
              : "bg-lime text-white hover:scale-[1.05] active:scale-95"
          }`}
          style={{
            boxShadow: playing
              ? "0 4px 16px rgba(0,0,0,0.12)"
              : "0 6px 28px rgba(255,90,54,0.25)",
          }}
        >
          {playing ? (
            <Pause size={16} className="fill-current" />
          ) : (
            <Play size={16} className="fill-current ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div
            className="w-full h-[3px] rounded-full bg-lime/10 cursor-pointer group relative mb-2"
            onClick={seek}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-lime transition-[width] duration-75"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-lime border-2 border-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 5px)` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-maze-gray/50">
              Sample pilot interview
            </span>
            <span className="text-[11px] text-maze-gray/40 tabular-nums">
              {fmt(currentTime)}{" "}
              <span className="text-maze-gray/20">/</span>{" "}
              {duration ? fmt(duration) : "--:--"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Content Variants ─── */
const contentMotion = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(4px)" },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
};

function DefinePanel() {
  return (
    <motion.div {...contentMotion} className="space-y-5">
      <p className="text-[15px] sm:text-base text-maze-gray leading-relaxed">
        {STEPS[0].body}
      </p>
      <div
        className="rounded-2xl p-5 sm:p-6 border-l-[3px] border-l-lime"
        style={{
          background: "linear-gradient(135deg, rgba(255,90,54,0.03) 0%, transparent 60%)",
          border: "1px solid rgba(0,0,0,0.04)",
          borderLeft: "3px solid rgb(255,90,54)",
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-maze-gray/40 mb-2">
          Sample question
        </p>
        <p className="font-display text-base sm:text-lg text-maze-black leading-snug">
          &ldquo;Why do 60% of first-time buyers never come back for a second
          order?&rdquo;
        </p>
      </div>
    </motion.div>
  );
}

function InterviewPanel() {
  return (
    <motion.div {...contentMotion} className="space-y-5">
      <p className="text-[15px] sm:text-base text-maze-gray leading-relaxed">
        {STEPS[1].body}
      </p>
      <AudioPlayer />
    </motion.div>
  );
}

function DeliverPanel({ onShowBrief }: { onShowBrief: () => void }) {
  return (
    <motion.div {...contentMotion} className="space-y-5">
      <p className="text-[15px] sm:text-base text-maze-gray leading-relaxed">
        {STEPS[2].body}
      </p>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(0,0,0,0.04)" }}
      >
        {/* Decision strip */}
        <div
          className="px-5 sm:px-6 py-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,90,54,0.06) 0%, rgba(255,90,54,0.02) 100%)",
            borderBottom: "1px solid rgba(255,90,54,0.1)",
          }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-lime/60 mb-1">
            Decision
          </p>
          <p className="font-display text-[15px] sm:text-base text-maze-black leading-snug">
            Launch ₹399 / 50ml entry SKU before full launch
          </p>
        </div>
        {/* Meta */}
        <div className="px-5 sm:px-6 py-3 flex items-center gap-6 bg-cream">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-maze-gray/40">
              Confidence
            </p>
            <p className="text-xs font-bold text-lime">High</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-maze-gray/40">
              Based on
            </p>
            <p className="text-xs font-bold text-maze-black">47 interviews</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-maze-gray/40">
              Owner
            </p>
            <p className="text-xs font-bold text-maze-black">Product Lead</p>
          </div>
        </div>
      </div>
      <button
        onClick={onShowBrief}
        className="min-h-[42px] px-6 py-2.5 text-[13px] font-display tracking-[-0.01em] text-lime border border-lime/25 rounded-full hover:bg-lime/[0.05] hover:border-lime/40 active:scale-[0.97] transition-all"
      >
        See the full brief →
      </button>
    </motion.div>
  );
}

/* ─── Main Section ─── */
export default function HowItWorks({
  onShowBrief,
}: {
  onShowBrief: () => void;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const elapsedRef = useRef(0);

  // Robust timer using ref for elapsed
  useEffect(() => {
    if (paused) return;

    elapsedRef.current = 0;
    setProgressPct(0);

    const timer = setInterval(() => {
      elapsedRef.current += 50;
      const pct = Math.min((elapsedRef.current / STEP_DURATION) * 100, 100);
      setProgressPct(pct);

      if (elapsedRef.current >= STEP_DURATION) {
        elapsedRef.current = 0;
        setProgressPct(0);
        setActive((prev) => (prev + 1) % STEPS.length);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [paused, active]);

  const selectStep = (i: number) => {
    if (i === active) return;
    setActive(i);
    elapsedRef.current = 0;
    setProgressPct(0);
  };

  // Continuous progress across all 3 steps
  const totalProgress =
    ((active * STEP_DURATION + elapsedRef.current) /
      (STEPS.length * STEP_DURATION)) *
    100;

  return (
    <section id="how-it-works" className="py-12 sm:py-16 lg:py-20 relative">
      <div className="max-w-[780px] mx-auto px-5 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <Reveal width="100%" delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime/[0.08] border border-lime/15 mb-5">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-lime">
                How it works
              </span>
            </div>
          </Reveal>
          <Reveal width="100%" delay={0.06}>
            <h2 className="font-display text-[clamp(26px,5.5vw,48px)] tracking-[-0.035em] text-maze-black leading-[1.08]">
              Three steps. Two days.
              <br className="hidden sm:block" /> Total clarity.
            </h2>
          </Reveal>
        </div>

        {/* The interactive card */}
        <Reveal width="100%" delay={0.14}>
          <div
            className="rounded-[20px] sm:rounded-[28px] overflow-hidden h-[500px] sm:h-[420px] flex flex-col"
            style={{
              background:
                "linear-gradient(165deg, rgba(255,255,255,0.60) 0%, rgba(255,255,255,0.32) 35%, rgba(255,255,255,0.26) 65%, rgba(255,255,255,0.50) 100%)",
              backdropFilter: "blur(48px) saturate(2.0)",
              WebkitBackdropFilter: "blur(48px) saturate(2.0)",
              border: "1px solid rgba(255,255,255,0.7)",
              boxShadow:
                "0 40px 100px -20px rgba(0,0,0,0.07), 0 10px 30px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(0,0,0,0.02)",
            }}
          >
            {/* ── Stepper ── */}
            <div className="relative">
              <div className="flex">
                {STEPS.map((step, i) => {
                  const isActive = active === i;
                  const isPast = i < active;
                  return (
                    <button
                      key={step.num}
                      onClick={() => selectStep(i)}
                      className="flex-1 relative px-4 sm:px-6 pt-6 sm:pt-7 pb-5 sm:pb-6 text-left group transition-all duration-300"
                    >
                      {/* Step number */}
                      <span
                        className={`block text-[11px] font-bold tracking-[0.06em] mb-1 transition-all duration-500 ${
                          isActive
                            ? "text-lime"
                            : isPast
                            ? "text-lime/40"
                            : "text-maze-gray/20"
                        }`}
                      >
                        {step.num}
                      </span>

                      {/* Step title */}
                      <span
                        className={`block font-display text-[15px] sm:text-[17px] tracking-[-0.02em] transition-all duration-500 ${
                          isActive
                            ? "text-maze-black"
                            : isPast
                            ? "text-maze-black/40"
                            : "text-maze-gray/30"
                        }`}
                      >
                        {step.title}
                      </span>

                      {/* Active dot */}
                      {isActive && (
                        <motion.div
                          layoutId="step-dot"
                          className="absolute bottom-0 left-4 sm:left-6 w-1 h-1 rounded-full bg-lime"
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Full-width progress track */}
              <div className="h-[2px] bg-neutral-200/30">
                <motion.div
                  className="h-full bg-lime origin-left"
                  style={{ width: `${totalProgress}%` }}
                  transition={{ duration: 0.05, ease: "linear" }}
                />
              </div>
            </div>

            {/* ── Content ── */}
            <div
              className="px-5 sm:px-8 lg:px-10 py-6 sm:py-8 flex-1 overflow-y-auto"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <AnimatePresence mode="wait">
                {active === 0 && <DefinePanel key="define" />}
                {active === 1 && <InterviewPanel key="interview" />}
                {active === 2 && (
                  <DeliverPanel key="deliver" onShowBrief={onShowBrief} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </Reveal>

        {/* Micro line */}
        <Reveal width="100%" delay={0.24}>
          <p className="mt-7 text-center text-[13px] text-maze-gray/60">
            No black-box insights. Every recommendation is traceable.
          </p>
        </Reveal>

        {/* CTA */}
        <Reveal width="100%" delay={0.3}>
          <div className="mt-6 flex justify-center">
            <a
              href="https://cal.com/squareup-ai/discovery-setup-call"
              className="min-h-[48px] px-7 py-2.5 text-[15px] font-display tracking-[-0.02em] text-white bg-maze-black rounded-xl hover:bg-black active:scale-[0.97] transition-all flex items-center justify-center"
            >
              Book a 15-min call
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

