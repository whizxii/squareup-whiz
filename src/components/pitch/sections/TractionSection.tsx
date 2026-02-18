import { useScrollAnimation, useCountUp } from "@/lib/useScrollAnimation";
import { useRef, useEffect, useState } from "react";
import type { SlideMode } from "@/lib/slides";

const MILESTONES = [
  { date: "Dec '25", label: "Founded", sub: "Full-time from Day 1", done: true },
  { date: "Jan '26", label: "50+ Conversations", sub: "Zepto, Swiggy, Meesho, Titan...", done: true },
  { date: "Jan '26", label: "MVP Shipped", sub: "15 days to build", done: true },
  { date: "Feb '26", label: "3 LOIs Signed", sub: "Design Partners committed", done: true },
];

const LOGOS = ["Zepto", "Meesho", "Swiggy", "Titan", "Rebel Foods", "Swish"];

function Counter({ target, prefix = "", suffix = "", label, sublabel }: {
  target: number; prefix?: string; suffix?: string; label: string; sublabel?: string;
}) {
  const { ref, display } = useCountUp(target, 1800, prefix, suffix);
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="text-center">
      <div className="font-black leading-none tracking-tight mb-1" style={{
        fontSize: "clamp(2.5rem, 5vw, 4rem)",
        color: "hsl(var(--sq-orange))"
      }}>
        {display}
      </div>
      <div className="font-bold text-sm" style={{ color: "hsl(var(--sq-text))" }}>{label}</div>
      {sublabel && <div className="text-xs mt-0.5" style={{ color: "hsl(var(--sq-muted))" }}>{sublabel}</div>}
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
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="traction"
      className={`${isPresenter ? "h-full flex items-center px-16" : "py-28 px-6"}`}
      style={{ background: "hsl(var(--sq-off-white))" }}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>

        {/* Header */}
        <div className={`mb-16 transition-all duration-500 ${revealed ? "opacity-100" : "opacity-0 translate-y-6"}`}>
          <p className="font-bold text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--sq-orange))" }}>
            Traction
          </p>
          <h2 className={`font-black tracking-tight leading-tight ${isPresenter ? "text-5xl" : "text-3xl sm:text-4xl lg:text-5xl"}`}
            style={{ color: "hsl(var(--sq-text))" }}>
            From idea to paid design partners —{" "}
            <span style={{ color: "hsl(var(--sq-orange))" }}>in under 90 days.</span>
          </h2>
          <p className="mt-3 text-sm" style={{ color: "hsl(var(--sq-muted))" }}>
            This is what an AI-native team moves like.
          </p>
        </div>

        {/* Timeline — horizontal, clean */}
        <div className="mb-16" ref={timelineRef}>
          <div className="relative">
            {/* Track */}
            <div className="absolute top-5 left-0 right-0 h-0.5 rounded-full" style={{ background: "hsl(var(--sq-subtle))" }}>
              <div
                className="absolute h-full rounded-full transition-all ease-out"
                style={{
                  width: timelineActive ? "100%" : "0%",
                  transitionDuration: "1400ms",
                  background: "hsl(var(--sq-orange))"
                }}
              />
            </div>

            {/* Milestones */}
            <div className="flex justify-between">
              {MILESTONES.map((m, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center transition-all duration-500 ${
                    timelineActive ? "opacity-100 scale-100" : "opacity-0 scale-75"
                  }`}
                  style={{ transitionDelay: `${400 + i * 320}ms` }}
                >
                  {/* Dot */}
                  <div
                    className="w-10 h-10 rounded-full border-4 flex items-center justify-center font-black text-white text-xs shadow-md mb-4"
                    style={{
                      background: "hsl(var(--sq-orange))",
                      borderColor: "hsl(var(--sq-off-white))",
                      boxShadow: "0 0 0 3px hsl(var(--sq-orange) / 0.2)"
                    }}
                  >
                    ✓
                  </div>
                  <div className="text-center max-w-[90px] sm:max-w-[120px]">
                    <p className="font-black text-xs mb-0.5" style={{ color: "hsl(var(--sq-orange))" }}>{m.date}</p>
                    <p className="font-bold text-xs leading-snug mb-0.5" style={{ color: "hsl(var(--sq-text))" }}>{m.label}</p>
                    <p className="text-xs leading-tight hidden sm:block" style={{ color: "hsl(var(--sq-muted))" }}>{m.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Counters — 4-up, bold */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-6 mb-14 p-8 rounded-3xl transition-all duration-500 delay-300 ${revealed ? "opacity-100" : "opacity-0"}`}
          style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))" }}>
          <Counter target={90} prefix="<" label="days" sublabel="idea to signed LOI" />
          <Counter target={50} suffix="+" label="leaders interviewed" sublabel="Zepto, Swiggy, Meesho..." />
          <Counter target={15} label="days to MVP" sublabel="shipped v1" />
          <Counter target={3} label="LOIs signed" sublabel="design partners" />
        </div>

        {/* LOI highlight */}
        <div className={`rounded-2xl px-7 py-6 mb-10 flex items-center gap-5 transition-all duration-500 delay-400 ${revealed ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
          style={{ background: "hsl(var(--sq-orange))", boxShadow: "0 12px 32px hsl(var(--sq-orange) / 0.3)" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.2)" }}>
            <span className="text-white font-black text-xl">3</span>
          </div>
          <div>
            <p className="text-white font-black text-lg leading-tight">Design Partners. Letters of Intent. Signed.</p>
            <p className="text-white/75 text-sm mt-0.5">Not "interested." Not "piloting." Committed.</p>
          </div>
        </div>

        {/* Trust + logos */}
        <div className={`transition-all duration-500 delay-500 ${revealed ? "opacity-100" : "opacity-0"}`}>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <div className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold"
              style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))", color: "hsl(var(--sq-text))" }}>
              Mesa School of Business
            </div>
            <div className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold"
              style={{ background: "hsl(var(--sq-card))", border: "1px solid hsl(var(--sq-subtle))", color: "hsl(var(--sq-text))" }}>
              Elevation Capital · Partner Network
            </div>
          </div>

          <p className="text-center font-medium text-xs uppercase tracking-widest mb-4" style={{ color: "hsl(var(--sq-muted))" }}>
            Brands whose leaders shaped what we built
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {LOGOS.map((logo) => (
              <span key={logo} className="font-black text-sm sm:text-base transition-all cursor-default"
                style={{ color: "hsl(var(--sq-muted) / 0.4)" }}>
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
