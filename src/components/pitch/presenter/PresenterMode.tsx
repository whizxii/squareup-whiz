import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { getSlidesForLength, DECK_LENGTHS, type DeckLength, type SlideDefinition } from "@/lib/slides";
import HeroSection from "../sections/HeroSection";
import ProblemSection from "../sections/ProblemSection";
import SolutionSection from "../sections/SolutionSection";
import HowItWorksSection from "../sections/HowItWorksSection";
import AIDemoSection from "../sections/AIDemoSection";
import WhoIsItForSection from "../sections/WhoIsItForSection";
import WhyNowSection from "../sections/WhyNowSection";
import TractionSection from "../sections/TractionSection";
import LandscapeSection from "../sections/LandscapeSection";
import MarketSection from "../sections/MarketSection";
import BusinessModelSection from "../sections/BusinessModelSection";
import TeamSection from "../sections/TeamSection";
import TheAskSection from "../sections/TheAskSection";
import CostSection from "../sections/CostSection";
import ToolsGapSection from "../sections/ToolsGapSection";
import CTASection from "../sections/CTASection";

const SLIDE_COMPONENTS: Record<string, React.ComponentType<{ mode?: "detailed" | "presenter" }>> = {
  hero: HeroSection,
  problem: ProblemSection,
  solution: SolutionSection,
  howitworks: HowItWorksSection,
  aidemo: AIDemoSection,
  whofor: WhoIsItForSection,
  whynow: WhyNowSection,
  traction: TractionSection,
  landscape: LandscapeSection,
  market: MarketSection,
  businessmodel: BusinessModelSection,
  team: TeamSection,
  ask: TheAskSection,
  cost: CostSection,
  toolsgap: ToolsGapSection,
  cta: CTASection,
};

interface PresenterModeProps {
  onExit: () => void;
  deckLength: DeckLength;
  onDeckLengthChange: (l: DeckLength) => void;
}

export default function PresenterMode({ onExit, deckLength, onDeckLengthChange }: PresenterModeProps) {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const slides = getSlidesForLength(deckLength);

  const goTo = useCallback((idx: number) => {
    if (transitioning || idx < 0 || idx >= slides.length) return;
    setTransitioning(true);
    setTimeout(() => { setCurrent(idx); setTransitioning(false); }, 350);
  }, [transitioning, slides.length]);

  useEffect(() => { setCurrent(0); }, [deckLength]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") goTo(current + 1);
      if (e.key === "ArrowLeft") goTo(current - 1);
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [current, goTo, onExit]);

  const slide = slides[current];
  const SlideComp = slide ? SLIDE_COMPONENTS[slide.id] : null;

  return (
    <div className="fixed inset-0 z-[100] bg-sq-dark flex flex-col">
      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className={`absolute inset-0 transition-all duration-350 ease-out ${
            transitioning ? "opacity-0 scale-[0.97]" : "opacity-100 scale-100"
          }`}
          id={`presenter-slide-${current}`}
        >
          {SlideComp && <SlideComp mode="presenter" />}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-shrink-0 bg-black/80 backdrop-blur-md border-t border-white/10 px-6 py-3 flex items-center gap-4">
        {/* Nav */}
        <div className="flex items-center gap-2">
          <button onClick={() => goTo(current - 1)} disabled={current === 0} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors">
            <ChevronLeft size={16} className="text-white" />
          </button>
          <button onClick={() => goTo(current + 1)} disabled={current === slides.length - 1} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors">
            <ChevronRight size={16} className="text-white" />
          </button>
        </div>

        {/* Counter + title */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sq-orange font-black text-sm">{current + 1} / {slides.length}</span>
          <span className="text-white/40 text-sm hidden sm:block">—</span>
          <span className="text-white/60 text-sm hidden sm:block">{slide?.title}</span>
        </div>

        {/* Progress dots */}
        <div className="hidden md:flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-200 ${i === current ? "w-5 h-2 bg-sq-orange" : "w-2 h-2 bg-white/25 hover:bg-white/50"}`}
            />
          ))}
        </div>

        {/* Length pills */}
        <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
          {DECK_LENGTHS.map((l) => (
            <button
              key={l}
              onClick={() => onDeckLengthChange(l)}
              className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all ${deckLength === l ? "bg-sq-orange text-white" : "text-white/50 hover:text-white"}`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Exit */}
        <button onClick={onExit} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <X size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}
