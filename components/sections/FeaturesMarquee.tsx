"use client";

import { useRef, useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  useSpring,
} from "framer-motion";
import { ArrowRight } from "lucide-react";

const row1 = [
  "Card sorting",
  "Tree testing",
  "Surveys",
  "Study templates",
  "Automated reports",
  "AI-powered themes",
  "Interview clips",
  "AI transcripts",
  "Interview highlights",
  "Easily embeddable results",
];

const row2 = [
  "Maze panel",
  "In-product prompts",
  "Participant management",
  "Screener questions",
  "B2B or B2C participants",
  "Moderated interviews",
  "AI moderator",
  "Prototype testing",
  "Live website testing",
  "Mobile testing",
];

function MarqueeRow({
  items,
  reverse = false,
}: {
  items: string[];
  reverse?: boolean;
}) {
  const doubled = [...items, ...items];
  return (
    <div className="flex overflow-hidden">
      <div
        className={`flex gap-3 lg:gap-5 shrink-0 ${
          reverse ? "animate-scroll-right" : "animate-scroll-left"
        }`}
        style={{
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {doubled.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="feature-pill shrink-0 cursor-pointer"
          >
            {item}
          </span>
        ))}
      </div>
      <div
        className={`flex gap-3 lg:gap-5 shrink-0 ml-3 lg:ml-5 ${
          reverse ? "animate-scroll-right" : "animate-scroll-left"
        }`}
        style={{
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {doubled.map((item, i) => (
          <span
            key={`${item}-dup-${i}`}
            className="feature-pill shrink-0 cursor-pointer"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function FeaturesMarquee() {
  const sectionRef = useRef<HTMLDivElement>(null);


  const [bleedLimits, setBleedLimits] = useState({ maxTop: 500, maxBottom: 300 });
  useEffect(() => {
    const h = window.innerHeight;
    setBleedLimits({ maxTop: Math.min(500, h * 0.55), maxBottom: Math.min(300, h * 0.35) });
  }, []);
  const { maxTop, maxBottom } = bleedLimits;


  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "start 0.35"],
  });

  const blurValue = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const blurFilter = useMotionTemplate`blur(${blurValue}px)`;
  const textOpacity = useTransform(scrollYProgress, [0, 1], [0.6, 1]);


  const { scrollYProgress: bleedProgress } = useScroll({
    target: sectionRef,
    offset: ["start 1.3", "end -0.3"],
  });


  const bleedSpring = { stiffness: 180, damping: 35, mass: 0.3 };
  const rawTopHeight = useTransform(bleedProgress, [0, 0.06, 0.85, 1], [0, maxTop, maxTop, 0]);
  const rawBottomHeight = useTransform(bleedProgress, [0, 0.06, 0.88, 1], [0, maxBottom, maxBottom, 0]);
  const rawBleedOpacity = useTransform(bleedProgress, [0, 0.03, 0.83, 1], [0, 1, 1, 0]);


  const topBleedHeight = useSpring(rawTopHeight, bleedSpring);
  const bottomBleedHeight = useSpring(rawBottomHeight, bleedSpring);
  const bleedOpacity = useSpring(rawBleedOpacity, bleedSpring);

  const topBleedOffset = useTransform(topBleedHeight, (v: number) => -v);
  const bottomBleedOffset = useTransform(bottomBleedHeight, (v: number) => -v);

  return (
    <section
      ref={sectionRef}
      data-section-name="cta-text"
      className="relative py-12 sm:py-20 lg:py-28"
      style={{ backgroundColor: "#FF5A36", zIndex: 0 }}
    >
      {}
      <motion.div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: topBleedOffset,
          height: topBleedHeight,
          opacity: bleedOpacity,
          background: "linear-gradient(to bottom, transparent 0%, rgba(255,90,54,0.01) 15%, rgba(255,90,54,0.05) 30%, rgba(255,90,54,0.15) 45%, rgba(255,90,54,0.35) 60%, rgba(255,90,54,0.65) 75%, rgba(255,90,54,0.9) 90%, #FF5A36 100%)",
          willChange: "transform, opacity",
        }}
      />

      {}
      <motion.div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          bottom: bottomBleedOffset,
          height: bottomBleedHeight,
          opacity: bleedOpacity,
          background: "linear-gradient(to top, transparent 0%, rgba(255,90,54,0.01) 15%, rgba(255,90,54,0.05) 30%, rgba(255,90,54,0.15) 45%, rgba(255,90,54,0.35) 60%, rgba(255,90,54,0.65) 75%, rgba(255,90,54,0.9) 90%, #FF5A36 100%)",
          willChange: "transform, opacity",
        }}
      />

      {}
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

      {}
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

      {}
      <motion.div
        className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-10 mb-14 lg:mb-20"
        style={{
          filter: blurFilter,
          opacity: textOpacity,
        }}
      >
        <p
          className="font-display text-[clamp(32px,4vw,56px)] leading-[1.2] tracking-[-0.03em]"
          style={{ color: "#fff" }}
        >
          <span className="bg-white text-[#FF5A36] px-3 py-1 rounded-md inline-block">
            Our Agents
          </span>{" "}
          make it all come together.
        </p>
        <p
          className="font-display text-[clamp(18px,2.5vw,36px)] leading-[1.3] tracking-[-0.02em] mt-4"
          style={{ color: "rgba(255,255,255,0.75)" }}
        >
          Companies recruit the right participants<br />
          effortlessly, conduct research autonomously,<br />
          and deliver user insights that drive actual decisions.
        </p>

        {}
        <div className="flex justify-start mt-8">
          <a
            href="#book-call"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1a2e] text-white text-sm font-medium rounded-full hover:gap-3 transition-all"
          >
            Talk to us <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </motion.div>

      {}
      <div className="relative z-10 marquee-container mb-4 sm:mb-3 lg:mb-5">
        <MarqueeRow items={row1} />
      </div>

      {}
      <div className="relative z-10 marquee-container">
        <MarqueeRow items={row2} reverse />
      </div>
    </section>
  );
}
