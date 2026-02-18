import { useReadingProgress } from "@/lib/useScrollAnimation";
import iconSvg from "@/assets/icon.svg";
import { type DeckLength, type SlideMode } from "@/lib/slides";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

interface NavProps {
  mode: SlideMode;
  onModeChange: (m: SlideMode) => void;
  deckLength: DeckLength;
  onDeckLengthChange: (l: DeckLength) => void;
}

export default function Nav({ mode, onModeChange, deckLength, onDeckLengthChange }: NavProps) {
  const progress = useReadingProgress();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const modes: { id: SlideMode; label: string }[] = [
    { id: "short",    label: "Pitch" },
    { id: "detailed", label: "Deep Dive" },
    { id: "presenter",label: "Present" },
  ];

  return (
    <>
      {/* Reading progress bar */}
      {mode !== "presenter" && (
        <div className="fixed top-0 left-0 right-0 z-[60] h-[2px]">
          <div
            className="h-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%`, background: "hsl(var(--sq-orange))" }}
          />
        </div>
      )}

      <nav
        className={`fixed top-[2px] left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md border-b shadow-sm"
            : "bg-transparent"
        }`}
        style={{ borderColor: scrolled ? "hsl(var(--sq-subtle))" : "transparent" }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <a href="#hero" className="flex items-center gap-2 flex-shrink-0">
              <img src={iconSvg} alt="SquareUp" className="h-6 w-auto" />
              <span className="font-black text-lg tracking-tight" style={{ color: "hsl(var(--sq-text))" }}>
                Square<span style={{ color: "hsl(var(--sq-orange))" }}>Up</span>
              </span>
            </a>

            {/* Center: 3-way mode toggle */}
            <div className="hidden md:flex items-center gap-0.5 rounded-full p-1"
              style={{ background: "hsl(var(--sq-subtle))" }}>
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onModeChange(m.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-200 ${
                    mode === m.id
                      ? "text-white shadow-sm"
                      : "hover:opacity-70"
                  }`}
                  style={{
                    background: mode === m.id ? "hsl(var(--sq-orange))" : "transparent",
                    color: mode === m.id ? "white" : "hsl(var(--sq-muted))"
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Right CTA */}
            <div className="hidden md:flex items-center gap-3">
              <a
                href="mailto:hello@joinsquareup.com"
                className="font-bold text-sm px-5 py-2 rounded-full transition-colors text-white"
                style={{ background: "hsl(var(--sq-orange))" }}
              >
                Book a Meeting
              </a>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
              style={{ color: "hsl(var(--sq-text))" }}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden bg-white border-t px-5 py-4 space-y-3"
            style={{ borderColor: "hsl(var(--sq-subtle))" }}>
            <div className="flex gap-1.5 mb-4 rounded-full p-1" style={{ background: "hsl(var(--sq-subtle))" }}>
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { onModeChange(m.id); setOpen(false); }}
                  className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${
                    mode === m.id ? "text-white" : ""
                  }`}
                  style={{
                    background: mode === m.id ? "hsl(var(--sq-orange))" : "transparent",
                    color: mode === m.id ? "white" : "hsl(var(--sq-muted))"
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <a
              href="mailto:hello@joinsquareup.com"
              className="block text-white font-bold text-center py-2.5 rounded-full mt-3"
              style={{ background: "hsl(var(--sq-orange))" }}
              onClick={() => setOpen(false)}
            >
              Book a Meeting
            </a>
          </div>
        )}
      </nav>
    </>
  );
}
