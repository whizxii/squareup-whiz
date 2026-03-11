import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, StickyNote, Timer } from "lucide-react";
import { type SlideDefinition } from "@/lib/slides";
import { SLIDE_COMPONENTS } from "@/lib/slideComponents";

interface PresenterModeProps {
  onExit: () => void;
  slides: SlideDefinition[];
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function PresenterMode({ onExit, slides }: PresenterModeProps) {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start timer when presentation begins
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

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
      if (e.key === "n" || e.key === "N") setShowNotes(prev => !prev);
      if (e.key === "t" || e.key === "T") setShowTimer(prev => !prev);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [current, goTo, onExit]);

  const slide = slides[current];
  const SlideComp = slide ? SLIDE_COMPONENTS[slide.id] : null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "#0a0a0f" }}>
      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className={`absolute inset-0 overflow-y-auto transition-all duration-350 ease-out ${transitioning ? "opacity-0 scale-[0.97]" : "opacity-100 scale-100"
            }`}
          id={`presenter-slide-${current}`}
        >
          {SlideComp && <SlideComp mode="presenter" />}
        </div>

        {/* Timer overlay — top right */}
        {showTimer && (
          <div className="absolute top-4 right-4 z-50 rounded-xl px-4 py-2" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
            <div className="flex items-center gap-2">
              <Timer size={14} className="text-white/50" />
              <span className="font-mono font-bold text-lg text-white">{formatTime(elapsed)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Speaker notes drawer */}
      {showNotes && slide?.speakerNotes && (
        <div className="flex-shrink-0 border-t border-white/10 px-6 py-3 max-h-[25vh] overflow-y-auto"
          style={{ background: "rgba(15,15,20,0.95)" }}>
          <div className="flex items-center gap-2 mb-2">
            <StickyNote size={12} className="text-white/40" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Speaker Notes</span>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">{slide.speakerNotes}</p>
        </div>
      )}

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

        {/* Timer + Notes toggles */}
        <div className="flex items-center gap-1.5">
          {showTimer && (
            <span className="text-white/40 font-mono text-xs mr-1">{formatTime(elapsed)}</span>
          )}
          <button
            onClick={() => setShowTimer(prev => !prev)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showTimer ? "bg-white/20" : "bg-white/10 hover:bg-white/20"}`}
            title="Toggle timer (T)"
          >
            <Timer size={14} className="text-white" />
          </button>
          <button
            onClick={() => setShowNotes(prev => !prev)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showNotes ? "bg-white/20" : "bg-white/10 hover:bg-white/20"}`}
            title="Toggle notes (N)"
          >
            <StickyNote size={14} className="text-white" />
          </button>
        </div>

        {/* Exit */}
        <button onClick={onExit} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <X size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}
