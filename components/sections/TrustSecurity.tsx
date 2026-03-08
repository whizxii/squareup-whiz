"use client";

import { useRef, useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";


function seededRandom(seed: number) {
  let s = (seed * 9301 + 49297) | 0;
  s = ((s ^ (s << 13)) >>> 0);
  s = ((s ^ (s >> 17)) >>> 0);
  s = ((s ^ (s << 5)) >>> 0);
  return (s >>> 0) / 4294967296;
}

const securityCards = [
  {
    dot: "bg-red-500",
    label: "ENCRYPTED TRANSMISSION",
    body: "All traffic, including customer data, is transported securely and encrypted via SSL.",
  },
  {
    dot: "bg-green-500",
    label: "ACCESS CONTROL",
    body: "Set up passwords for tests and assign roles to view, manage, and collaborate on studies.",
  },
  {
    dot: "bg-amber-700",
    label: "DATA CENTER SECURITY",
    body: "Our platform leverages AWS\u2019s comprehensive security measures to keep your data safe and our services highly available.",
  },
  {
    dot: "bg-blue-500",
    label: "GDPR COMPLIANCE",
    body: "We protect your data according to GDPR standards and make it easy for you to be compliant too.",
  },
  {
    dot: "bg-purple-500",
    label: "SSO",
    body: "Reduce security risk by authenticating access to your account with Single Sign On (SSO).",
  },
  {
    dot: "bg-orange-500",
    label: "PRIVATE WORKSPACES",
    body: "Enable role-based access to workspaces, which only certain members of your team can collaborate on.",
  },
];

const BLEED_COLOR = "#FF5A36";

export default function TrustSecurity() {
  const sectionRef = useRef<HTMLDivElement>(null);


  const [bleedLimits, setBleedLimits] = useState({ maxTop: 1400, maxBottom: 800 });
  useEffect(() => {
    const h = window.innerHeight;
    setBleedLimits({ maxTop: Math.min(1400, h * 1.2), maxBottom: Math.min(800, h * 0.7) });
  }, []);


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
      data-section-name="grid-card"
      className="relative overflow-visible"
      style={{ backgroundColor: BLEED_COLOR, zIndex: 0 }}
    >
      {}
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

      {}
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
      <div className="absolute inset-x-0 top-0 h-24 overflow-hidden pointer-events-none">
        <svg viewBox="0 0 1440 96" className="w-full opacity-10">
          {Array.from({ length: 150 }).map((_, i) => (
            <rect
              key={i}
              x={seededRandom(i) * 1440}
              y={seededRandom(i + 200) * 96}
              width={3 + seededRandom(i + 400) * 5}
              height={3 + seededRandom(i + 600) * 5}
              fill="#212121"
              opacity={0.2 + seededRandom(i + 800) * 0.3}
            />
          ))}
        </svg>
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-10 pt-12 sm:pt-20 lg:pt-28 pb-16">
        {}
        <h2 className="font-display text-[clamp(32px,4vw,56px)] tracking-[-0.04em] text-white leading-[1.15] text-center mb-6">
          Trust and security at every level
        </h2>

        {}
        <div className="flex justify-center mb-12">
          <a href="#book-call" className="px-6 py-2.5 text-sm font-medium text-white bg-maze-black rounded-lg hover:bg-black transition-colors">
            Talk to us
          </a>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {securityCards.map((card, i) => (
            <div key={i} className="security-card">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2.5 h-2.5 rounded-sm ${card.dot}`} />
                <span className="text-xs font-medium tracking-wide uppercase">
                  {card.label}
                </span>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
