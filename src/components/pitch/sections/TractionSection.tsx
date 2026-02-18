import { useScrollAnimation, useCountUp } from "@/lib/useScrollAnimation";
import { useRef, useEffect, useState } from "react";
import type { SlideMode } from "@/lib/slides";

const MILESTONES = [
  { date: "Dec 2025", label: "Started SquareUp", sub: "Full-time from Day 1" },
  { date: "Jan 2026", label: "50+ Customer Conversations", sub: "Leaders at Zepto, Swiggy, Meesho, Titan..." },
  { date: "Jan 2026", label: "MVP v1 Shipped", sub: "In 15 days" },
  { date: "Feb 2026", label: "3 LOIs Signed", sub: "Design Partners committed" },
];

const LOGOS = ["Zepto", "Meesho", "Swiggy", "Titan", "Rebel Foods", "Swish"];

function Counter({ target, prefix = "", suffix = "", label }: { target: number; prefix?: string; suffix?: string; label: string }) {
  const { ref, display } = useCountUp(target, 1800, prefix, suffix);
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="text-center">
      <div className="font-black text-sq-orange text-4xl sm:text-5xl tracking-tight leading-none">{display}</div>
      <div className="text-sq-muted text-xs sm:text-sm mt-1 font-medium">{label}</div>
    </div>
  );
}

export default function TractionSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();
  const [timelineActive, setTimelineActive] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTimelineActive(true); obs.disconnect(); } },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="traction"
      className={`bg-sq-card ${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>
        {/* Heading */}
        <div className={`text-center mb-12 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <div className="inline-flex items-center gap-2 bg-sq-orange/10 border border-sq-orange/20 rounded-full px-4 py-1.5 mb-4">
            <span className="text-sq-orange font-bold text-sm">Pace of an AI-native company</span>
          </div>
          <h2 className={`font-black text-sq-text tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"}`}>
            From idea to LOI —{" "}
            <span className="text-sq-orange">in under 90 days.</span>
          </h2>
        </div>

        {/* LOI Badge */}
        <div className={`flex justify-center mb-10 transition-all duration-500 delay-200 ${revealed ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
          <div className="bg-sq-orange text-white rounded-2xl px-6 py-4 flex items-center gap-4 shadow-lg shadow-sq-orange/25">
            <span className="text-3xl">🤝</span>
            <div>
              <p className="font-black text-lg leading-tight">3 Design Partners</p>
              <p className="text-white/80 text-sm">Letters of Intent Signed</p>
            </div>
          </div>
        </div>

        {/* Animated Timeline */}
        <div className="relative mb-14" ref={timelineRef}>
          {/* Track */}
          <div className="relative h-1 bg-sq-subtle rounded-full mx-4 sm:mx-12 mt-6">
            <div
              className="absolute h-full bg-sq-orange rounded-full transition-all duration-1500 ease-out"
              style={{ width: timelineActive ? "100%" : "0%", transitionDuration: "1500ms" }}
            />
          </div>

          {/* Milestone dots */}
          <div className="flex justify-between mx-0 sm:mx-8 mt-0 relative -top-[18px]">
            {MILESTONES.map((m, i) => (
              <div
                key={m.date + m.label}
                className={`flex flex-col items-center transition-all duration-500 ${
                  timelineActive ? "opacity-100 scale-100" : "opacity-0 scale-75"
                }`}
                style={{ transitionDelay: `${300 + i * 350}ms` }}
              >
                <div className={`w-9 h-9 rounded-full border-4 border-sq-card flex items-center justify-center shadow-md ${
                  i === 3 ? "bg-sq-orange shadow-sq-orange/30" : "bg-sq-orange"
                }`}>
                  {i === 3 && <span className="text-white text-xs font-black">✓</span>}
                </div>
                <div className="mt-3 text-center w-20 sm:w-28">
                  <p className="text-sq-orange font-bold text-xs">{m.date}</p>
                  <p className="text-sq-text font-bold text-xs leading-tight mt-0.5">{m.label}</p>
                  <p className="text-sq-muted text-xs mt-0.5 leading-tight hidden sm:block">{m.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Counters */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-6 mb-12 transition-all duration-500 delay-300 ${revealed ? "opacity-100" : "opacity-0"}`}>
          <Counter target={90} prefix="<" suffix="" label="days, idea to LOI" />
          <Counter target={50} suffix="+" label="leaders interviewed" />
          <Counter target={15} label="days to ship MVP v1" />
          <Counter target={3} label="LOIs signed" />
        </div>

        {/* Trust badges */}
        <div className={`flex flex-wrap items-center justify-center gap-3 mb-8 transition-all duration-500 delay-400 ${revealed ? "opacity-100" : "opacity-0"}`}>
          <div className="bg-sq-subtle rounded-full px-4 py-2 flex items-center gap-2">
            <span className="font-black text-sq-text text-sm">Mesa</span>
            <span className="text-sq-muted text-xs">School of Business</span>
          </div>
          <div className="bg-sq-subtle rounded-full px-4 py-2 flex items-center gap-2">
            <span className="font-black text-sq-text text-sm">Elevation Capital</span>
            <span className="text-sq-muted text-xs">Partner program</span>
          </div>
        </div>

        {/* Logo strip */}
        <p className="text-center text-sq-muted text-xs uppercase tracking-widest mb-4 font-medium">
          Brands whose leaders helped shape SquareUp
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          {LOGOS.map((logo) => (
            <span key={logo} className="font-black text-sq-muted/40 text-sm sm:text-base grayscale hover:grayscale-0 transition-all cursor-default">
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
