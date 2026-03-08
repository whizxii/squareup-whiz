import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { type SlideDefinition } from "@/lib/slides";
import { SLIDE_COMPONENTS } from "@/lib/slideComponents";

interface PresenterModeProps {
  onExit: () => void;
  slides: SlideDefinition[];
}

export default function PresenterMode({ onExit, slides }: PresenterModeProps) {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const goTo = useCallback((idx: number) => {
    if (transitioning || idx < 0 || idx >= slides.length) return;
    setTransitioning(true);
    setTimeout(() => { setCurrent(idx); setTransitioning(false); }, 350);
  }, [transitioning, slides.length]);

  useEffect(() => { setCurrent(0); }, [slides]);

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
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "#0a0a0f" }}>
      {/* Slide area — overflow-y-auto so tall slides can scroll */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className={`absolute inset-0 overflow-y-auto transition-all duration-350 ease-out ${transitioning ? "opacity-0 scale-[0.97]" : "opacity-100 scale-100"
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
        <div className="hidden md:flex items-center gap-1.5 flex-1 justify-center max-w-[40%] overflow-x-auto">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-200 shrink-0 ${i === current ? "w-5 h-2 bg-sq-orange" : "w-2 h-2 bg-white/25 hover:bg-white/50"}`}
            />
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
