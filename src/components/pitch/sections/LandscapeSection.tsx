import { useScrollAnimation } from "@/lib/useScrollAnimation";
import type { SlideMode } from "@/lib/slides";

const COMPETITORS = [
  { name: "Qualtrics", x: 20, y: 75 },
  { name: "Dovetail",  x: 30, y: 60 },
  { name: "Zendesk",   x: 15, y: 55 },
  { name: "SurveyMonkey", x: 25, y: 80 },
  { name: "Typeform",  x: 35, y: 70 },
];

export default function LandscapeSection({ mode = "detailed" }: { mode?: SlideMode }) {
  const isPresenter = mode === "presenter";
  const { ref, revealed } = useScrollAnimation();

  return (
    <section
      id="landscape"
      className={`bg-sq-card ${isPresenter ? "h-full flex items-center px-16" : "py-24 px-6"}`}
    >
      <div className="max-w-5xl mx-auto w-full" ref={ref}>
        <h2
          className={`font-black text-sq-text tracking-tight leading-tight text-center mb-4 ${
            isPresenter ? "text-5xl" : "text-3xl sm:text-4xl"
          } ${revealed ? "animate-fade-up" : "opacity-0"}`}
        >
          Everyone organizes feedback.{" "}
          <span className="text-sq-orange">Nobody generates it.</span>
        </h2>
        <p className="text-center text-sq-muted mb-10 text-sm sm:text-base">SquareUp is the only system that actively creates decision-grade signal from scratch.</p>

        <div className={`transition-all duration-700 delay-200 ${revealed ? "opacity-100" : "opacity-0 translate-y-8"}`}>
          {/* Matrix */}
          <div className="relative mx-auto" style={{ maxWidth: 540, aspectRatio: "1" }}>
            <svg viewBox="0 0 540 540" className="w-full h-full">
              {/* Background quadrants */}
              <rect x="0" y="0" width="270" height="270" rx="0" fill="hsl(0,0%,97%)" />
              <rect x="270" y="0" width="270" height="270" rx="0" fill="hsl(18,100%,98%)" />
              <rect x="0" y="270" width="270" height="270" rx="0" fill="hsl(0,0%,96%)" />
              <rect x="270" y="270" width="270" height="270" rx="0" fill="hsl(0,0%,95%)" />

              {/* Axes */}
              <line x1="270" y1="20" x2="270" y2="520" stroke="hsl(0,0%,80%)" strokeWidth="1.5" />
              <line x1="20" y1="270" x2="520" y2="270" stroke="hsl(0,0%,80%)" strokeWidth="1.5" />

              {/* Axis labels */}
              <text x="270" y="14" textAnchor="middle" fontSize="11" fill="hsl(0,0%,60%)" fontWeight="600">Drives Decisions</text>
              <text x="270" y="535" textAnchor="middle" fontSize="11" fill="hsl(0,0%,60%)" fontWeight="600">Passive Data</text>
              <text x="12" y="275" textAnchor="middle" fontSize="11" fill="hsl(0,0%,60%)" fontWeight="600" transform="rotate(-90,12,270)">Organizes Existing</text>
              <text x="528" y="275" textAnchor="middle" fontSize="11" fill="hsl(0,0%,60%)" fontWeight="600" transform="rotate(90,528,270)">Generates Signal</text>

              {/* Competitor dots */}
              {COMPETITORS.map((c) => {
                const cx = (c.x / 100) * 540;
                const cy = (c.y / 100) * 540;
                return (
                  <g key={c.name}>
                    <circle cx={cx} cy={cy} r="16" fill="hsl(0,0%,75%)" opacity="0.7" />
                    <text x={cx} y={cy + 28} textAnchor="middle" fontSize="10" fill="hsl(0,0%,50%)" fontWeight="600">{c.name}</text>
                  </g>
                );
              })}

              {/* SquareUp — top right */}
              <circle cx="440" cy="82" r="28" fill="hsl(18,100%,60%)" opacity="0.15" />
              <circle cx="440" cy="82" r="28" fill="hsl(18,100%,60%)" opacity="0.12" className="animate-ping-orange" />
              <circle cx="440" cy="82" r="20" fill="hsl(18,100%,60%)" />
              <text x="440" y="87" textAnchor="middle" fontSize="10" fill="white" fontWeight="900">SQ</text>
              <text x="440" y="122" textAnchor="middle" fontSize="13" fill="hsl(18,100%,40%)" fontWeight="900">SquareUp</text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
